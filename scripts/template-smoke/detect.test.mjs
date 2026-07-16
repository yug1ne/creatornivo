/**
 * Offline classification tests (no browser, no OpenAI).
 *
 * Run: node scripts/template-smoke/detect.test.mjs
 */
import assert from "node:assert/strict";
import {
  classifyQuotaBlockAttempt,
  classifyResult,
  detectForbiddenPhrases,
  isModelRefusalOutput,
  isQuotaAtLimit,
  isSmokeGoalSuccess,
  isSubstantialBody,
  stripResultChrome,
} from "./detect.mjs";

/** Exact chrome-only excerpt from real landing-page-copy report (2026-07-15). */
const REAL_HEADER_ONLY_EXCERPT = `Result

gpt-4o

Copy
Save to library
Export Markdown
Export Plain text`;

const REAL_QUOTA_BEFORE = {
  used: 38,
  limit: 100,
  remaining: 62,
  raw: "38 of 100 used",
};

const REAL_QUOTA_AFTER = {
  used: 39,
  limit: 100,
  remaining: 61,
  raw: "39 of 100 used",
};

const API_200_OK = {
  requestStarted: true,
  requestFinished: true,
  requestFailed: false,
  failed: false,
  status: 200,
  networkError: null,
};

const emptyForbidden = detectForbiddenPhrases("");

function baseRealCase(overrides = {}) {
  return {
    dryRun: false,
    generateClicked: true,
    generationTimedOut: false,
    stillGenerating: false,
    errorText: "",
    outputText: REAL_HEADER_ONLY_EXCERPT,
    bodyText: REAL_HEADER_ONLY_EXCERPT,
    forbidden: emptyForbidden,
    quotaBefore: REAL_QUOTA_BEFORE,
    quotaAfter: REAL_QUOTA_AFTER,
    api: API_200_OK,
    copyAvailable: true,
    saveAvailable: true,
    exportAvailable: true,
    ...overrides,
  };
}

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log("[detect.test] stripResultChrome / isSubstantialBody");

test("header-only real excerpt is not substantial", () => {
  const stripped = stripResultChrome(REAL_HEADER_ONLY_EXCERPT);
  assert.ok(
    stripped.length <= 40,
    `expected chrome-only length <= 40, got ${stripped.length}: ${JSON.stringify(stripped)}`,
  );
  assert.equal(isSubstantialBody(REAL_HEADER_ONLY_EXCERPT), false);
});

test("landing body text is substantial", () => {
  const body = [
    "# Weekly Content Planner",
    "",
    "A calm way for solo creators to plan posts without starting from a blank page.",
    "",
    "## Benefits",
    "- Reusable outlines",
    "- Hook starters",
  ].join("\n");
  assert.equal(isSubstantialBody(body), true);
  assert.ok(stripResultChrome(`Result\n\ngpt-4o\n\n${body}`).length > 40);
});

console.log("[detect.test] classifyResult — real report regression");

test("API 200 + quota + buttons + header-only body => RESULT_DETECTION_FAIL (not PASS, not UNKNOWN_FAIL)", () => {
  const r = classifyResult(baseRealCase());
  assert.equal(r.status, "RESULT_DETECTION_FAIL");
  assert.notEqual(r.status, "PASS");
  assert.notEqual(r.status, "UNKNOWN_FAIL");
  assert.match(r.notes, /body|scrape|short|empty|detection/i);
});

test("header-only scrape must not become PASS even with action buttons", () => {
  const r = classifyResult(
    baseRealCase({
      copyAvailable: true,
      saveAvailable: true,
      exportAvailable: true,
    }),
  );
  assert.notEqual(r.status, "PASS");
  assert.equal(r.status, "RESULT_DETECTION_FAIL");
});

test("body text present + API 200 + no validation => PASS", () => {
  const body = [
    "Hero headline for Weekly Content Planner",
    "Solo creators rebuild prompts every week. This offer keeps structure ready.",
    "Primary CTA: Start free",
    "Secondary: See templates",
  ].join("\n");
  const r = classifyResult(
    baseRealCase({
      outputText: `Result\n\ngpt-4o\n\nCopy\nSave to library\n\n${body}`,
      bodyText: body,
      forbidden: detectForbiddenPhrases(body),
    }),
  );
  assert.equal(r.status, "PASS");
});

test("normal goal: validation banner => VALIDATION_FAIL (not smoke success)", () => {
  const r = classifyResult(
    baseRealCase({
      smokeGoal: "normal",
      errorText:
        "Output validation failed: the model used prohibited wording blocked by the user.",
      outputText: REAL_HEADER_ONLY_EXCERPT,
      bodyText: "",
      copyAvailable: false,
      saveAvailable: false,
      exportAvailable: false,
      quotaAfter: REAL_QUOTA_BEFORE,
    }),
  );
  assert.equal(r.status, "VALIDATION_FAIL");
  assert.equal(isSmokeGoalSuccess(r.status, "normal"), false);
});

test("normal goal: anti-hype words in body without app validation => PASS with style warn", () => {
  const body =
    "We streamline your workflow and transform your calendar with a product that effortlessly helps teams.";
  const r = classifyResult(
    baseRealCase({
      smokeGoal: "normal",
      errorText: "",
      bodyText: body,
      outputText: `Result\n\n${body}`,
      forbidden: detectForbiddenPhrases(body),
      copyAvailable: true,
      saveAvailable: true,
      exportAvailable: true,
      quotaBefore: REAL_QUOTA_BEFORE,
      quotaAfter: REAL_QUOTA_AFTER,
    }),
  );
  assert.equal(r.status, "PASS");
  assert.equal(isSmokeGoalSuccess(r.status, "normal"), true);
  assert.match(r.notes, /Style warn|streamline|transform|effortlessly/i);
  assert.notEqual(r.status, "VALIDATION_FAIL");
});

test("normal live regression: Streamline in body, API 200, quota+1, no UI error => PASS", () => {
  // Exact shape from normal batch-smoke landing-page-copy (2026-07-16-ish):
  // restrictionField none, error empty, body has Streamline/transform, UserUsage 39→40.
  const body = [
    "# Weekly Content Planner",
    "",
    "Streamline your content calendar without rebuilding prompts each week.",
    "Use clear structure to transform blank-page friction into a repeatable outline.",
    "CTA: Start free — no guaranteed ROI promises.",
    "More detail ".repeat(40),
  ].join("\n");
  assert.ok(body.length > 40);
  const r = classifyResult({
    dryRun: false,
    smokeGoal: "normal",
    generateClicked: true,
    generationTimedOut: false,
    stillGenerating: false,
    errorText: "",
    outputText: `Result\n\ngpt-4o\n\nCopy\nSave to library\nExport Markdown\n\n${body}`,
    bodyText: body,
    forbidden: detectForbiddenPhrases(body),
    quotaBefore: { used: 39, limit: 100, remaining: 61, raw: "39 of 100 used" },
    quotaAfter: { used: 40, limit: 100, remaining: 60, raw: "40 of 100 used" },
    api: API_200_OK,
    copyAvailable: true,
    saveAvailable: true,
    exportAvailable: true,
  });
  assert.equal(r.status, "PASS");
  assert.equal(isSmokeGoalSuccess(r.status, "normal"), true);
  assert.match(r.notes, /Style warn/i);
  assert.match(r.notes, /streamline/i);
  assert.notEqual(r.status, "VALIDATION_FAIL");
  assert.notEqual(r.status, "UNKNOWN_FAIL");
});

console.log("[detect.test] model refusal / blog-article batch-2");

test("detects classic OpenAI-style refusal", () => {
  assert.equal(
    isModelRefusalOutput("I'm sorry, but I can't assist with that."),
    true,
  );
  assert.equal(
    isModelRefusalOutput(
      "# How to plan content\n\nSolo creators can use a weekly outline...",
    ),
    false,
  );
});

test("blog-article batch2: refusal body + API 200 + quota+1 => MODEL_REFUSAL_FAIL not RESULT_DETECTION_FAIL", () => {
  const body = "I'm sorry, but I can't assist with that.";
  assert.equal(body.length, 40);
  const r = classifyResult({
    dryRun: false,
    smokeGoal: "normal",
    generateClicked: true,
    generationTimedOut: false,
    stillGenerating: false,
    errorText: "",
    outputText: body,
    bodyText: body,
    forbidden: detectForbiddenPhrases(body),
    quotaBefore: { used: 44, limit: 100, remaining: 56, raw: "44 of 100 used" },
    quotaAfter: { used: 45, limit: 100, remaining: 55, raw: "45 of 100 used" },
    api: API_200_OK,
    copyAvailable: true,
    saveAvailable: true,
    exportAvailable: true,
  });
  assert.equal(r.status, "MODEL_REFUSAL_FAIL");
  assert.notEqual(r.status, "RESULT_DETECTION_FAIL");
  assert.notEqual(r.status, "PASS");
  assert.equal(isSmokeGoalSuccess(r.status, "normal"), false);
  assert.match(r.notes, /refusal|non-content/i);
});

console.log("[detect.test] safety smoke goal");

test("safety: VALIDATION_FAIL + no actions + quota flat => SAFETY_PASS_VALIDATION_BLOCKED", () => {
  const body =
    "Plan content effortlessly with a weekly structure that helps solo creators.";
  const r = classifyResult(
    baseRealCase({
      smokeGoal: "safety",
      errorText:
        'Output validation failed: generated content contains a phrase explicitly prohibited by the user: "effortlessly".',
      bodyText: body,
      outputText: `Result\n\n${body}`,
      forbidden: detectForbiddenPhrases(body),
      copyAvailable: false,
      saveAvailable: false,
      exportAvailable: false,
      quotaAfter: REAL_QUOTA_BEFORE, // no UserUsage increment
    }),
  );
  assert.equal(r.status, "SAFETY_PASS_VALIDATION_BLOCKED");
  assert.equal(isSmokeGoalSuccess(r.status, "safety"), true);
  assert.notEqual(r.status, "UNKNOWN_FAIL");
});

test("safety: clean body without bans => SAFETY_PASS_MODEL_COMPLIANT", () => {
  const body = [
    "Hero headline for Weekly Content Planner",
    "Solo creators rebuild prompts every week. This offer keeps structure ready.",
    "Primary CTA: Start free",
    "Secondary: See templates",
  ].join("\n");
  const r = classifyResult(
    baseRealCase({
      smokeGoal: "safety",
      bodyText: body,
      outputText: `Result\n\ngpt-4o\n\n${body}`,
      forbidden: detectForbiddenPhrases(body),
      copyAvailable: true,
      saveAvailable: true,
      exportAvailable: true,
    }),
  );
  assert.equal(r.status, "SAFETY_PASS_MODEL_COMPLIANT");
  assert.equal(isSmokeGoalSuccess(r.status, "safety"), true);
});

test("safety: banned phrase + actions available => SAFETY_FAIL_LEAK", () => {
  const body =
    "We help you transform your calendar and work effortlessly every week with clear outlines.";
  const r = classifyResult(
    baseRealCase({
      smokeGoal: "safety",
      errorText:
        'Output validation failed: generated content contains a phrase explicitly prohibited by the user: "effortlessly".',
      bodyText: body,
      forbidden: detectForbiddenPhrases(body),
      copyAvailable: true,
      saveAvailable: true,
      exportAvailable: true,
      quotaAfter: REAL_QUOTA_BEFORE,
    }),
  );
  assert.equal(r.status, "SAFETY_FAIL_LEAK");
  assert.equal(isSmokeGoalSuccess(r.status, "safety"), false);
});

test("safety: validation block + quota increased => SAFETY_FAIL_QUOTA_ON_BLOCK", () => {
  const body =
    "Create posts effortlessly with a reusable weekly structure for solo creators.";
  const r = classifyResult(
    baseRealCase({
      smokeGoal: "safety",
      errorText:
        'Output validation failed: generated content contains a phrase explicitly prohibited by the user: "effortlessly".',
      bodyText: body,
      forbidden: detectForbiddenPhrases(body),
      copyAvailable: false,
      saveAvailable: false,
      exportAvailable: false,
      quotaBefore: REAL_QUOTA_BEFORE,
      quotaAfter: REAL_QUOTA_AFTER, // 38 -> 39 wrongly
    }),
  );
  assert.equal(r.status, "SAFETY_FAIL_QUOTA_ON_BLOCK");
  assert.equal(isSmokeGoalSuccess(r.status, "safety"), false);
});

test("API 500 => API_ERROR", () => {
  const r = classifyResult(
    baseRealCase({
      api: {
        ...API_200_OK,
        status: 500,
        failed: true,
        bodyExcerpt: '{"error":"server"}',
      },
      bodyText: "",
      outputText: "",
      copyAvailable: false,
      saveAvailable: false,
      exportAvailable: false,
      quotaAfter: REAL_QUOTA_BEFORE,
    }),
  );
  assert.equal(r.status, "API_ERROR");
});

test("still generating past timeout => GENERATION_TIMEOUT", () => {
  const r = classifyResult(
    baseRealCase({
      generationTimedOut: true,
      stillGenerating: true,
      bodyText: "Result\nGenerating...",
      copyAvailable: false,
      saveAvailable: false,
      exportAvailable: false,
      quotaAfter: REAL_QUOTA_BEFORE,
      api: {
        requestStarted: true,
        requestFinished: false,
        status: null,
        failed: false,
      },
    }),
  );
  assert.equal(r.status, "GENERATION_TIMEOUT");
});

test("quota: Generate disabled at limit => QUOTA_BLOCKED", () => {
  const r = classifyQuotaBlockAttempt({
    generateButtonEnabled: false,
    generateClicked: false,
    quotaBefore: { used: 100, limit: 100, remaining: 0 },
    quotaAfter: { used: 100, limit: 100, remaining: 0 },
  });
  assert.equal(r.status, "QUOTA_BLOCKED");
  assert.equal(r.smokeGoalSuccess, true);
  assert.equal(isQuotaAtLimit({ used: 100, limit: 100, remaining: 0 }), true);
  assert.equal(isSmokeGoalSuccess("QUOTA_BLOCKED", "normal"), true);
});

test("quota: API 429 quota_exceeded => QUOTA_BLOCKED via classifyResult", () => {
  const r = classifyResult(
    baseRealCase({
      errorText: "You have used all generations for this month.",
      bodyText: "",
      outputText: "",
      copyAvailable: false,
      saveAvailable: false,
      exportAvailable: false,
      quotaBefore: { used: 100, limit: 100, remaining: 0 },
      quotaAfter: { used: 100, limit: 100, remaining: 0 },
      api: {
        requestStarted: true,
        requestFinished: true,
        requestFailed: false,
        failed: true,
        status: 429,
        networkError: null,
        failureText: "quota_exceeded",
        bodyExcerpt: '{"code":"quota_exceeded","remaining":0}',
      },
    }),
  );
  assert.equal(r.status, "QUOTA_BLOCKED");
  assert.equal(isSmokeGoalSuccess(r.status, "normal"), true);
});

test("quota: API 429 while visible 85/100 => QUOTA_SOURCE_MISMATCH", () => {
  const r = classifyQuotaBlockAttempt({
    generateButtonEnabled: true,
    generateClicked: true,
    errorText: "Calendar-month generation limit reached",
    api: {
      status: 429,
      failureText: "quota_exceeded",
      bodyExcerpt:
        '{"error":"Calendar-month generation limit reached","code":"quota_exceeded","plan":"pro","limit":100,"remaining":0}',
    },
    quotaBefore: { used: 85, limit: 100, remaining: 15 },
    quotaAfter: { used: 85, limit: 100, remaining: 15 },
    copyAvailable: false,
    saveAvailable: false,
    exportAvailable: false,
  });
  assert.equal(r.status, "QUOTA_SOURCE_MISMATCH");
  assert.equal(r.smokeGoalSuccess, false);
  assert.match(r.notes, /UserUsage vs reservation/i);
});

test("quota: usage past limit on block attempt => QUOTA_LEAK", () => {
  const r = classifyQuotaBlockAttempt({
    generateButtonEnabled: true,
    generateClicked: true,
    errorText: "quota_exceeded",
    api: { status: 429, failureText: "quota_exceeded" },
    quotaBefore: { used: 100, limit: 100, remaining: 0 },
    quotaAfter: { used: 101, limit: 100, remaining: -1 },
  });
  assert.equal(r.status, "QUOTA_LEAK");
  assert.equal(r.smokeGoalSuccess, false);
});

test("copy/export/save alone never force PASS", () => {
  const r = classifyResult(
    baseRealCase({
      bodyText: REAL_HEADER_ONLY_EXCERPT,
      outputText: REAL_HEADER_ONLY_EXCERPT,
      copyAvailable: true,
      saveAvailable: true,
      exportAvailable: true,
    }),
  );
  assert.notEqual(r.status, "PASS");
});

if (process.exitCode) {
  console.error(`[detect.test] failed (passed ${passed} before failure path)`);
} else {
  console.log(`[detect.test] all ${passed} tests passed`);
}
