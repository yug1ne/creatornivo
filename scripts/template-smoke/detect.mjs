import {
  FORBIDDEN_HARD,
  FORBIDDEN_WARN,
  SUCCESS_STATUSES_BY_GOAL,
} from "./config.mjs";

/** Min body length (after chrome strip) to count as substantial generated output. */
export const MIN_SUBSTANTIAL_BODY_CHARS = 40;

function phrasePattern(phrase) {
  const escaped = phrase
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  const start = /^\w/.test(phrase) ? "\\b" : "";
  const end = /\w$/.test(phrase) ? "\\b" : "";
  return new RegExp(`${start}${escaped}${end}`, "i");
}

export function detectForbiddenPhrases(text) {
  const content = text ?? "";
  const hard = [];
  const warn = [];

  for (const phrase of FORBIDDEN_HARD) {
    if (phrasePattern(phrase).test(content)) hard.push(phrase);
  }
  for (const phrase of FORBIDDEN_WARN) {
    if (phrasePattern(phrase).test(content)) warn.push(phrase);
  }

  return {
    hardDetected: hard.length > 0,
    hardMatches: hard,
    warnDetected: warn.length > 0,
    warnMatches: warn,
  };
}

/** Parse "X of Y used" from Generate usage banner text. */
export function parseQuotaFromText(pageText) {
  const body = pageText ?? "";
  const usedMatch = body.match(/(\d+)\s+of\s+(\d+)\s+used/i);
  const remainingMatch = body.match(
    /(\d+)\s+generations?\s+left\s+(?:today|this calendar month)/i,
  );

  if (usedMatch) {
    const used = Number(usedMatch[1]);
    const limit = Number(usedMatch[2]);
    return {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      raw: usedMatch[0],
    };
  }

  if (remainingMatch) {
    const remaining = Number(remainingMatch[1]);
    return { used: null, limit: null, remaining, raw: remainingMatch[0] };
  }

  return { used: null, limit: null, remaining: null, raw: null };
}

/**
 * Strip Result-card chrome so length checks reflect markdown body, not
 * "Result / Generating / model / Copy / Save / Export".
 */
export function stripResultChrome(text) {
  let s = String(text ?? "");
  // Drop leading Result heading
  s = s.replace(/^\s*Result\s*/i, "");
  s = s.replace(/Generating\.\.\./gi, "");
  // Model badge lines (gpt-4o, gpt-4o-mini, etc.)
  s = s.replace(/\bgpt-[\w.-]+\b/gi, "");
  // Action buttons / export labels (secondary UI only)
  s = s.replace(/\b✓\s*Copied\b/gi, "");
  s = s.replace(/\bCopy\b/gi, "");
  s = s.replace(/\bSave to library\b/gi, "");
  s = s.replace(/\bSaving\.\.\.\b/gi, "");
  s = s.replace(/\bSave\b/gi, "");
  s = s.replace(/\bExport Markdown\b/gi, "");
  s = s.replace(/\bExport Plain text\b/gi, "");
  s = s.replace(/\bExport\b/gi, "");
  s = s.replace(/\bOpen in library\b/gi, "");
  s = s.replace(/\bOutput validation failed\b/gi, "");
  // Collapse leftover whitespace
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return s;
}

export function isSubstantialBody(text, minChars = MIN_SUBSTANTIAL_BODY_CHARS) {
  return stripResultChrome(text).length > minChars;
}

/**
 * Detect model/provider refusal or empty “cannot help” outputs that are not usable content.
 * Matches full body or very short replies (common OpenAI-style refusals).
 */
export function isModelRefusalOutput(text) {
  const s = stripResultChrome(text).replace(/\s+/g, " ").trim();
  if (!s) return false;

  const lower = s.toLowerCase();
  const refusalExact = [
    "i'm sorry, but i can't assist with that.",
    "i'm sorry, but i cannot assist with that.",
    "i'm sorry, i can't assist with that.",
    "i cannot assist with that.",
    "i can't assist with that.",
    "i can't help with that.",
    "i cannot help with that.",
    "sorry, i can't help with that.",
    "sorry, i cannot help with that.",
  ];
  if (refusalExact.some((p) => lower === p || lower === p.replace(/'/g, "’"))) {
    return true;
  }

  // Short body dominated by apology + inability (not a real article/package).
  if (s.length <= 200) {
    const apology = /\b(i('m| am) sorry|sorry)\b/i.test(s);
    const cannot =
      /\b(can('t| not)|cannot)\b/i.test(s) &&
      /\b(assist|help|fulfill|comply|provide)\b/i.test(s);
    const policy =
      /\b(as an ai|i('m| am) unable to|against (my|our) (guidelines|policies))\b/i.test(
        s,
      );
    if ((apology && cannot) || policy) return true;
  }

  // Longer outputs that are almost only a refusal paragraph.
  if (
    s.length <= 400 &&
    /i('m| am) sorry[\s\S]{0,80}(can('t| not)|cannot)\s+(assist|help)/i.test(s) &&
    !/\n#{1,3}\s|\n##\s|headline|introduction|step\s*1/i.test(s)
  ) {
    return true;
  }

  return false;
}

/** True when used count rose or remaining fell (generation was counted). */
export function didQuotaIncrease(quotaBefore, quotaAfter) {
  if (
    quotaBefore?.used != null &&
    quotaAfter?.used != null &&
    Number.isFinite(quotaBefore.used) &&
    Number.isFinite(quotaAfter.used) &&
    quotaAfter.used > quotaBefore.used
  ) {
    return true;
  }
  if (
    quotaBefore?.remaining != null &&
    quotaAfter?.remaining != null &&
    Number.isFinite(quotaBefore.remaining) &&
    Number.isFinite(quotaAfter.remaining) &&
    quotaAfter.remaining < quotaBefore.remaining
  ) {
    return true;
  }
  return false;
}

/** True when UserUsage is at the plan limit (remaining 0 or used >= limit). */
export function isQuotaAtLimit(quota) {
  if (!quota) return false;
  if (quota.remaining === 0) return true;
  if (
    quota.used != null &&
    quota.limit != null &&
    Number.isFinite(quota.used) &&
    Number.isFinite(quota.limit) &&
    quota.used >= quota.limit
  ) {
    return true;
  }
  return false;
}

/** True when usage exceeded the plan limit (product bug). */
export function didQuotaExceedLimit(quota) {
  if (!quota) return false;
  if (quota.remaining != null && Number.isFinite(quota.remaining) && quota.remaining < 0) {
    return true;
  }
  if (
    quota.used != null &&
    quota.limit != null &&
    Number.isFinite(quota.used) &&
    Number.isFinite(quota.limit) &&
    quota.used > quota.limit
  ) {
    return true;
  }
  return false;
}

/** UI / API text that indicates generation blocked by quota. */
export function isQuotaBlockText(text) {
  const t = String(text ?? "");
  if (!t.trim()) return false;
  return (
    /quota_exceeded/i.test(t) ||
    /quota exceeded/i.test(t) ||
    /generation limit/i.test(t) ||
    /no generations? left/i.test(t) ||
    /limit reached/i.test(t) ||
    /out of generations/i.test(t) ||
    /monthly generation limit/i.test(t) ||
    /daily generation limit/i.test(t) ||
    /used all (?:your )?generations/i.test(t)
  );
}

/**
 * Detect quota-block from API monitor (HTTP 429 + body/code) or UI error text.
 */
export function isQuotaApiBlock(api, errorText = "") {
  const body = `${api?.failureText ?? ""} ${api?.bodyExcerpt ?? ""} ${errorText ?? ""}`;
  if (isQuotaBlockText(body)) return true;
  if (api?.status === 429 && /quota|limit|generation/i.test(body)) return true;
  if (api?.status === 429 && isQuotaBlockText(errorText)) return true;
  return false;
}

/**
 * True when API claims quota exhausted while the visible usage banner still
 * shows remaining generations (UI vs reservation-gate source mismatch).
 */
export function isQuotaSourceMismatch({
  api = null,
  errorText = "",
  quotaBefore = null,
  quotaAfter = null,
} = {}) {
  const visible = quotaAfter ?? quotaBefore;
  if (!visible || visible.used == null || visible.limit == null) return false;
  if (!Number.isFinite(visible.used) || !Number.isFinite(visible.limit)) {
    return false;
  }
  // UI still shows headroom
  if (visible.used >= visible.limit) return false;
  if (visible.remaining === 0) return false;

  const body = `${api?.failureText ?? ""} ${api?.bodyExcerpt ?? ""} ${errorText ?? ""}`;
  const apiSaysExhausted =
    api?.status === 429 &&
    (isQuotaBlockText(body) ||
      /"remaining"\s*:\s*0/.test(body) ||
      /"code"\s*:\s*"quota_exceeded"/.test(body) ||
      /quota_exceeded/i.test(body));

  return apiSaysExhausted;
}

/**
 * Classify a dedicated post-exhaustion block attempt (or pre-click disabled Generate).
 * Prefer this over UNKNOWN_FAIL / generic UI_FAIL for expected quota walls.
 *
 * @returns {{ status: string, notes: string, smokeGoalSuccess: boolean }}
 */
export function classifyQuotaBlockAttempt({
  generateButtonEnabled = null,
  generateClicked = false,
  errorText = "",
  outputText = "",
  bodyText = "",
  api = null,
  quotaBefore = null,
  quotaAfter = null,
  copyAvailable = false,
  saveAvailable = false,
  exportAvailable = false,
} = {}) {
  const after = quotaAfter ?? quotaBefore;
  const exceeded = didQuotaExceedLimit(after);
  const increased = didQuotaIncrease(quotaBefore, quotaAfter);
  const actionsVisible = !!(copyAvailable || saveAvailable || exportAvailable);
  const contentOnly = stripResultChrome(
    bodyText != null && String(bodyText).trim() !== ""
      ? String(bodyText)
      : String(outputText ?? ""),
  );
  const substantial = contentOnly.length > MIN_SUBSTANTIAL_BODY_CHARS;
  const apiQuota = isQuotaApiBlock(api, errorText);
  const uiQuota = isQuotaBlockText(errorText) || isQuotaBlockText(outputText);
  const atLimitBefore = isQuotaAtLimit(quotaBefore);
  const atLimitAfter = isQuotaAtLimit(after);
  const disabledAtLimit =
    generateButtonEnabled === false && (atLimitBefore || atLimitAfter);

  if (exceeded || (atLimitBefore && increased)) {
    return {
      status: "QUOTA_LEAK",
      notes: [
        "Quota leak: UserUsage moved past plan limit on block attempt.",
        `before=${quotaBefore?.used ?? "?"}/${quotaBefore?.limit ?? "?"}`,
        `after=${after?.used ?? "?"}/${after?.limit ?? "?"}`,
      ].join(" "),
      smokeGoalSuccess: false,
    };
  }

  if (actionsVisible && substantial && !apiQuota && !uiQuota && !disabledAtLimit) {
    return {
      status: "QUOTA_LEAK",
      notes:
        "Quota block expected but exportable substantial content appeared after extra attempt.",
      smokeGoalSuccess: false,
    };
  }

  // Product bug: banner still shows remaining but API returned quota_exceeded.
  if (
    isQuotaSourceMismatch({
      api,
      errorText,
      quotaBefore,
      quotaAfter,
    })
  ) {
    return {
      status: "QUOTA_SOURCE_MISMATCH",
      notes: [
        "QUOTA_SOURCE_MISMATCH: API 429 quota_exceeded while visible quota still has remaining.",
        `visible=${quotaBefore?.used ?? "?"}/${quotaBefore?.limit ?? "?"}→${after?.used ?? "?"}/${after?.limit ?? "?"}`,
        `apiStatus=${api?.status ?? "n/a"}`,
        api?.bodyExcerpt
          ? `apiBody=${String(api.bodyExcerpt).slice(0, 220)}`
          : null,
        "Not a template failure — UI UserUsage vs reservation gate inconsistency.",
      ]
        .filter(Boolean)
        .join(" "),
      smokeGoalSuccess: false,
    };
  }

  if (disabledAtLimit && !generateClicked) {
    return {
      status: "QUOTA_BLOCKED",
      notes: [
        "QUOTA_BLOCKED: Generate disabled at plan limit (no click).",
        `quota=${after?.used ?? "?"}/${after?.limit ?? "?"} remaining=${after?.remaining ?? "?"}`,
        "UserUsage not incremented; no exportable success content.",
      ].join(" "),
      smokeGoalSuccess: true,
    };
  }

  if (apiQuota || uiQuota || (api?.status === 429 && atLimitBefore)) {
    return {
      status: "QUOTA_BLOCKED",
      notes: [
        "QUOTA_BLOCKED: API/UI refused generation at quota limit.",
        api?.status != null ? `apiHTTP=${api.status}` : null,
        uiQuota || apiQuota ? "quota signal present" : null,
        increased ? "WARNING: used count increased (unexpected)." : "used count stable",
        actionsVisible
          ? "WARNING: action buttons visible"
          : "actions unavailable",
        `quota=${after?.used ?? "?"}/${after?.limit ?? "?"}`,
      ]
        .filter(Boolean)
        .join(" "),
      // Increment at limit without exceeding is still a leak signal.
      smokeGoalSuccess: !increased && !actionsVisible,
    };
  }

  if (atLimitAfter && !substantial && !actionsVisible && !increased) {
    return {
      status: "QUOTA_EXHAUSTED",
      notes: [
        "QUOTA_EXHAUSTED: at limit after attempt with no usable/exportable output.",
        `quota=${after?.used ?? "?"}/${after?.limit ?? "?"}`,
      ].join(" "),
      smokeGoalSuccess: true,
    };
  }

  return {
    status: "UI_FAIL",
    notes: [
      "Post-exhaust check did not observe a clear quota block signal.",
      `generateEnabled=${generateButtonEnabled}`,
      `generateClicked=${generateClicked}`,
      `apiStatus=${api?.status ?? "n/a"}`,
      `quota=${after?.used ?? "?"}/${after?.limit ?? "?"}`,
      errorText ? `uiError=${String(errorText).slice(0, 160)}` : null,
    ]
      .filter(Boolean)
      .join(" "),
    smokeGoalSuccess: false,
  };
}

export function isApiOk(api) {
  if (!api) return false;
  if (api.failed === true || api.networkError) return false;
  if (typeof api.status === "number" && api.status >= 400) return false;
  // Prefer explicit finished + 2xx; also accept requestFinished with status 200.
  if (api.requestFinished && (api.status == null || (api.status >= 200 && api.status < 300))) {
    return true;
  }
  if (api.status != null && api.status >= 200 && api.status < 300 && api.requestFinished !== false) {
    return true;
  }
  return false;
}

/**
 * Dry-run classification.
 * DRY_RUN_PASS: required filled, Generate enabled, no click.
 * Restriction filled only required when requireRestriction=true (safety goal).
 * DRY_RUN_INCOMPLETE: form incomplete / Generate not ready.
 */
export function classifyDryRun({
  requiredKeys = [],
  filledKeys = [],
  restrictionKey = null,
  restrictionFilled = false,
  requireRestriction = false,
  generateButtonEnabled = false,
  generateButtonFound = false,
  skipped = [],
  warnings = [],
  smokeGoal = "normal",
}) {
  const filled = new Set(filledKeys);
  const missingRequired = requiredKeys.filter((k) => !filled.has(k));
  const reasons = [];

  if (missingRequired.length > 0) {
    reasons.push(`requiredSkipped=${missingRequired.join(",")}`);
  }
  if (requireRestriction && restrictionKey && !restrictionFilled) {
    reasons.push(`restrictionMissing=${restrictionKey}`);
  }
  if (!generateButtonFound) {
    reasons.push("generateButtonNotFound");
  } else if (!generateButtonEnabled) {
    reasons.push("generateButtonDisabled");
  }
  if (skipped.length > 0) {
    reasons.push(
      `skippedKeys=${skipped.map((s) => s.key ?? s).join(",")}`,
    );
  }
  if (warnings.length > 0) {
    reasons.push(`warnings=${warnings.length}`);
  }

  const restrictionOk =
    !requireRestriction || !restrictionKey || restrictionFilled;

  if (
    missingRequired.length === 0 &&
    restrictionOk &&
    generateButtonFound &&
    generateButtonEnabled
  ) {
    return {
      status: "DRY_RUN_PASS",
      notes: [
        "Generate not clicked (dry-run mode).",
        `smokeGoal=${smokeGoal}.`,
        "Required fields filled; Generate available.",
        requireRestriction
          ? "Safety restriction filled."
          : "Normal goal: exact ban-list restriction not required.",
        warnings.length ? `selectFallbacks=${warnings.length}` : null,
      ]
        .filter(Boolean)
        .join(" "),
      missingRequired,
      reasons,
    };
  }

  return {
    status: "DRY_RUN_INCOMPLETE",
    notes: [
      "Generate not clicked (dry-run mode).",
      `smokeGoal=${smokeGoal}.`,
      "Incomplete form fill or Generate not ready.",
      ...reasons,
    ].join(" "),
    missingRequired,
    reasons,
  };
}

/**
 * True only when the app/UI/API reported output validation failure —
 * not when the runner merely found marketing clichés in the body.
 */
export function isAppValidationErrorText(text) {
  const t = String(text ?? "").trim();
  if (!t) return false;
  return (
    /Output validation failed/i.test(t) ||
    /output_validation_failed/i.test(t) ||
    /prohibited by the user/i.test(t) ||
    /phrase explicitly prohibited/i.test(t)
  );
}

function isValidationBlockedSignal({ err, contentOnly, substantial }) {
  if (isAppValidationErrorText(err)) return true;
  if (substantial && isAppValidationErrorText(contentOnly)) return true;
  return false;
}

/**
 * Map base generation outcome through smoke goal.
 *
 * normal:
 *   PASS = usable output
 *   VALIDATION_FAIL = unexpected under normal constraints (model/product issue)
 *
 * safety:
 *   SAFETY_PASS_MODEL_COMPLIANT — model avoided banned phrases (PASS)
 *   SAFETY_PASS_VALIDATION_BLOCKED — model used banned phrase; validator blocked
 *     (not a smoke failure)
 *   SAFETY_FAIL_LEAK — banned phrase present and actions/export still available
 *     or treated as success without block
 *   SAFETY_FAIL_QUOTA_ON_BLOCK — UserUsage increased when validation blocked
 */
export function applySmokeGoalStatus(base, ctx) {
  const {
    smokeGoal = "normal",
    forbidden,
    quotaIncreased,
    actionsVisible,
    err,
    contentOnly,
    substantial,
  } = ctx;

  if (smokeGoal !== "safety") {
    return base;
  }

  const hard = !!forbidden?.hardDetected;
  const phrases = forbidden?.hardMatches?.join(", ") || "";
  const blocked =
    base.status === "VALIDATION_FAIL" ||
    isValidationBlockedSignal({ err, contentOnly, substantial });

  // Model clean: no hard phrase, usable PASS
  if (base.status === "PASS" && !hard) {
    return {
      ...base,
      status: "SAFETY_PASS_MODEL_COMPLIANT",
      notes: [
        "Safety smoke: model avoided exact banned phrases.",
        base.notes,
      ]
        .filter(Boolean)
        .join(" "),
    };
  }

  // Validator blocked prohibited wording — safety success if quota/actions correct
  if (blocked || (base.status === "VALIDATION_FAIL")) {
    if (quotaIncreased) {
      return {
        ...base,
        status: "SAFETY_FAIL_QUOTA_ON_BLOCK",
        notes: [
          "Safety smoke FAIL: UserUsage increased after validation block (should not).",
          phrases ? `matchedPhrase=${phrases}` : null,
          base.notes,
        ]
          .filter(Boolean)
          .join(" "),
      };
    }
    if (actionsVisible) {
      return {
        ...base,
        status: "SAFETY_FAIL_LEAK",
        notes: [
          "Safety smoke FAIL: Copy/Save/Export available despite validation block.",
          phrases ? `matchedPhrase=${phrases}` : null,
          base.notes,
        ]
          .filter(Boolean)
          .join(" "),
      };
    }
    return {
      ...base,
      status: "SAFETY_PASS_VALIDATION_BLOCKED",
      notes: [
        "Safety smoke PASS: validator blocked banned-phrase output (expected acceptable).",
        phrases ? `matchedPhrase=${phrases}` : null,
        "UserUsage should not increment; actions should stay disabled.",
        base.notes,
      ]
        .filter(Boolean)
        .join(" "),
    };
  }

  // Hard phrase in body but classified as PASS (should not happen if detect works)
  if (base.status === "PASS" && hard) {
    return {
      ...base,
      status: "SAFETY_FAIL_LEAK",
      notes: [
        "Safety smoke FAIL: banned phrase present but status was PASS.",
        `matchedPhrase=${phrases}`,
        base.notes,
      ]
        .filter(Boolean)
        .join(" "),
    };
  }

  // Hard phrase with actions available and no validation block signal
  if (hard && actionsVisible && base.status !== "VALIDATION_FAIL") {
    return {
      ...base,
      status: "SAFETY_FAIL_LEAK",
      notes: [
        "Safety smoke FAIL: banned phrase in output with export actions available.",
        `matchedPhrase=${phrases}`,
        `baseStatus=${base.status}`,
        base.notes,
      ]
        .filter(Boolean)
        .join(" "),
    };
  }

  // Hard phrase without clear UI validation message — still treat as blocked if no actions
  if (hard && substantial && !actionsVisible && !quotaIncreased) {
    return {
      ...base,
      status: "SAFETY_PASS_VALIDATION_BLOCKED",
      notes: [
        "Safety smoke PASS: banned phrase detected; actions unavailable; quota unchanged.",
        `matchedPhrase=${phrases}`,
        `baseStatus=${base.status}`,
        base.notes,
      ]
        .filter(Boolean)
        .join(" "),
    };
  }

  return base;
}

export function isSmokeGoalSuccess(status, smokeGoal = "normal") {
  const set = SUCCESS_STATUSES_BY_GOAL[smokeGoal] ?? SUCCESS_STATUSES_BY_GOAL.normal;
  return set.has(status);
}

/**
 * Real generation classification (base + smoke-goal overlay).
 *
 * Base statuses: PASS, VALIDATION_FAIL, RESULT_DETECTION_FAIL, API_ERROR,
 * GENERATION_TIMEOUT, UI_FAIL, UNKNOWN_FAIL.
 *
 * Safety overlay may rewrite to SAFETY_PASS_* / SAFETY_FAIL_*.
 *
 * copy/export/save are secondary signals — never sole reason for PASS.
 */
export function classifyResult({
  dryRun,
  errorText,
  outputText,
  bodyText = null,
  generationTimedOut,
  stillGenerating = false,
  generateClicked = true,
  forbidden,
  quotaBefore,
  quotaAfter,
  dryRunMeta,
  api = null,
  consoleErrors = [],
  copyAvailable = false,
  saveAvailable = false,
  exportAvailable = false,
  smokeGoal = "normal",
}) {
  if (dryRun) {
    return classifyDryRun({ ...(dryRunMeta ?? {}), smokeGoal });
  }

  if (!generateClicked) {
    return {
      status: "UNKNOWN_FAIL",
      notes: "Generate click was not confirmed.",
    };
  }

  const err = (errorText ?? "").trim();
  // Prefer explicit body scrape when provided; else use full outputText.
  const rawForBody =
    bodyText != null && String(bodyText).trim() !== ""
      ? String(bodyText)
      : String(outputText ?? "");
  const contentOnly = stripResultChrome(rawForBody);
  const substantial = contentOnly.length > MIN_SUBSTANTIAL_BODY_CHARS;
  const refusal = isModelRefusalOutput(contentOnly);

  const apiStatus = api?.status ?? null;
  const apiFailed = api?.failed === true || api?.networkError;
  const apiHttpError =
    typeof apiStatus === "number" && apiStatus >= 400;
  const apiOk = isApiOk(api);
  const quotaIncreased = didQuotaIncrease(quotaBefore, quotaAfter);
  const actionsVisible = !!(copyAvailable || saveAvailable || exportAvailable);

  let base;

  // Model/provider refusal is usable-content failure — not RESULT_DETECTION_FAIL.
  if (refusal) {
    base = {
      status: "MODEL_REFUSAL_FAIL",
      notes: [
        "Model returned a refusal/minimal non-content reply (not usable generation).",
        `bodyChars=${contentOnly.length}`,
        `excerpt=${contentOnly.slice(0, 120)}`,
        apiOk ? `apiHTTP=${apiStatus ?? "ok"}` : null,
        quotaIncreased
          ? "UserUsage incremented despite refusal-like output (product gap)."
          : "UserUsage did not increment.",
        actionsVisible
          ? "Copy/Save/Export available for refusal text (product gap)."
          : "Actions unavailable.",
      ]
        .filter(Boolean)
        .join(" "),
      contentOnlyLength: contentOnly.length,
    };
  } else if (isQuotaApiBlock(api, err) || isQuotaBlockText(err)) {
    // Prefer explicit quota statuses over generic API_ERROR / UI_FAIL.
    const block = classifyQuotaBlockAttempt({
      generateButtonEnabled: true,
      generateClicked: true,
      errorText: err,
      outputText,
      bodyText: rawForBody,
      api,
      quotaBefore,
      quotaAfter,
      copyAvailable,
      saveAvailable,
      exportAvailable,
    });
    base = {
      status: block.status,
      notes: block.notes,
      contentOnlyLength: contentOnly.length,
      smokeGoalSuccess: block.smokeGoalSuccess,
    };
  } else if (apiFailed || apiHttpError) {
    const statusPart =
      apiStatus != null ? `HTTP ${apiStatus}` : "network/request failed";
    base = {
      status: "API_ERROR",
      notes: [
        `POST /api/ai/generate ${statusPart}.`,
        api?.failureText ? `failure=${api.failureText}` : null,
        api?.bodyExcerpt ? `body=${String(api.bodyExcerpt).slice(0, 200)}` : null,
        err ? `uiError=${err.slice(0, 200)}` : null,
      ]
        .filter(Boolean)
        .join(" "),
      contentOnlyLength: contentOnly.length,
    };
  } else if (generationTimedOut || stillGenerating) {
    base = {
      status: "GENERATION_TIMEOUT",
      notes: [
        "Generation did not finish before timeout (not counted as prompt failure).",
        stillGenerating ? "UI still shows Generating...." : null,
        api?.requestStarted
          ? `apiStarted=true finished=${!!api?.requestFinished} status=${apiStatus ?? "n/a"}`
          : "apiStarted=false",
        consoleErrors?.length
          ? `consoleErrors=${consoleErrors.length}`
          : null,
      ]
        .filter(Boolean)
        .join(" "),
      contentOnlyLength: contentOnly.length,
    };
  } else if (isAppValidationErrorText(err)) {
    // App/UI actually reported output validation failure.
    base = {
      status: "VALIDATION_FAIL",
      notes: err.slice(0, 300),
      contentOnlyLength: contentOnly.length,
    };
  } else if (
    // Safety only: runner ban-list on body is a hard signal (remapped by applySmokeGoalStatus).
    // Normal goal: never fail on configured anti-hype phrases alone — no user bans were supplied.
    smokeGoal === "safety" &&
    forbidden?.hardDetected &&
    substantial
  ) {
    base = {
      status: "VALIDATION_FAIL",
      notes: `Forbidden hard phrase(s) in output: ${forbidden.hardMatches.join(", ")}`,
      contentOnlyLength: contentOnly.length,
    };
  } else if (
    substantial &&
    isAppValidationErrorText(contentOnly)
  ) {
    base = {
      status: "VALIDATION_FAIL",
      notes: contentOnly.slice(0, 300),
      contentOnlyLength: contentOnly.length,
    };
  } else if (err && !substantial) {
    base = {
      status: "UI_FAIL",
      notes: err.slice(0, 300),
      contentOnlyLength: contentOnly.length,
    };
  } else if (substantial && apiOk) {
    const notes = [];
    // Normal goal: anti-hype / style hits are warnings only, never fail.
    if (smokeGoal === "normal" && forbidden?.hardDetected) {
      notes.push(
        `Style warn (not fail): ${forbidden.hardMatches.join(", ")}`,
      );
    }
    if (forbidden?.warnDetected) {
      notes.push(`Warn variants: ${forbidden.warnMatches.join(", ")}`);
    }
    if (
      quotaBefore?.remaining != null &&
      quotaAfter?.remaining != null &&
      quotaAfter.remaining > quotaBefore.remaining
    ) {
      notes.push("Quota remaining increased unexpectedly.");
    }
    if (quotaAfter?.remaining != null && quotaAfter.remaining < 0) {
      notes.push("Quota remaining is negative.");
    }
    if (apiStatus != null) {
      notes.push(`apiHTTP=${apiStatus}`);
    }
    notes.push(`bodyChars=${contentOnly.length}`);
    base = {
      status: "PASS",
      notes: notes.join(" ") || "Generation completed.",
      contentOnlyLength: contentOnly.length,
    };
  } else if (substantial && !err) {
    const notes = [
      `Generation body present (bodyChars=${contentOnly.length}); API signal incomplete.`,
    ];
    if (smokeGoal === "normal" && forbidden?.hardDetected) {
      notes.push(
        `Style warn (not fail): ${forbidden.hardMatches.join(", ")}`,
      );
    }
    if (forbidden?.warnDetected) {
      notes.push(`Warn variants: ${forbidden.warnMatches.join(", ")}`);
    }
    base = {
      status: "PASS",
      notes: notes.join(" "),
      contentOnlyLength: contentOnly.length,
    };
  } else if (apiOk && !substantial) {
    const evidence = [];
    if (quotaIncreased) evidence.push("quotaIncreased");
    if (actionsVisible) evidence.push("actionButtonsVisible");
    if (apiStatus != null) evidence.push(`apiHTTP=${apiStatus}`);
    evidence.push(`bodyChars=${contentOnly.length}`);
    base = {
      status: "RESULT_DETECTION_FAIL",
      notes: [
        "API finished OK but Result body text was empty or too short after chrome strip.",
        "Likely runner scrape issue (header-only), not a prompt failure.",
        evidence.join(" "),
        actionsVisible
          ? "Copy/Save/Export visible implies content existed in UI."
          : null,
        quotaIncreased ? "Quota increased implies backend counted generation." : null,
      ]
        .filter(Boolean)
        .join(" "),
      contentOnlyLength: contentOnly.length,
    };
  } else if (!substantial && (quotaIncreased || actionsVisible)) {
    base = {
      status: "RESULT_DETECTION_FAIL",
      notes: [
        "Quota or action buttons indicate generation content, but body was not detected.",
        `quotaIncreased=${quotaIncreased}`,
        `actionsVisible=${actionsVisible}`,
        `bodyChars=${contentOnly.length}`,
      ].join(" "),
      contentOnlyLength: contentOnly.length,
    };
  } else {
    base = {
      status: "RESULT_DETECTION_FAIL",
      notes:
        err ||
        `No substantial Result body after generation finished (bodyChars=${contentOnly.length}).`,
      contentOnlyLength: contentOnly.length,
    };
  }

  return applySmokeGoalStatus(base, {
    smokeGoal,
    forbidden,
    quotaIncreased,
    actionsVisible,
    err,
    contentOnly,
    substantial,
  });
}
