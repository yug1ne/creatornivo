import assert from "node:assert/strict";
import test from "node:test";

import {
  assertGeneratedOutputQuality,
  type CountControlExpectation,
} from "../src/lib/templates/generation-qa";
import {
  buildExactForbiddenPhrasesPromptBlock,
  buildExactPhrasePattern,
  composeGenerationPromptWithForbiddenPhrases,
  extractUserProhibitedPhrases,
  getGeneratedOutputValidationMessage,
  stripRestrictionListLeadIn,
  validateGeneratedOutput,
} from "../src/lib/templates/output-validation";
import type { TemplateVariable } from "../src/types/template";
import { readFileSync } from "node:fs";

function optionalField(key: string, label = key): TemplateVariable {
  return {
    key,
    label,
    required: false,
    type: "textarea",
  };
}

test("runtime validator extracts only explicit user-prohibited phrases", () => {
  const variables = [
    optionalField("doNotUse", "Restrictions and exclusions"),
    optionalField("additionalRequirements", "Additional requirements"),
    optionalField("ordinaryNotes", "Ordinary notes"),
  ];
  const values = {
    doNotUse: 'Avoid "effortlessly", "boost engagement", "guaranteed".',
    additionalRequirements: "Please keep the tone calm.",
    ordinaryNotes: 'The words "link", "date", and "price" are context, not restrictions.',
  };

  assert.deepEqual(extractUserProhibitedPhrases(variables, values), [
    "effortlessly",
    "boost engagement",
    "guaranteed",
  ]);
});

test("lead-in lists strip wrapper text and keep clean comma-separated phrases", () => {
  const variables = [
    optionalField("restrictionsAndDisclosures", "Restrictions and disclosures"),
  ];
  const values = {
    restrictionsAndDisclosures:
      "Do not use the phrases: streamline, transform, effortlessly, boost engagement, increase sales.",
  };

  assert.deepEqual(extractUserProhibitedPhrases(variables, values), [
    "streamline",
    "transform",
    "effortlessly",
    "boost engagement",
    "increase sales",
  ]);
  assert.ok(
    !extractUserProhibitedPhrases(variables, values).some((phrase) =>
      /the phrases/i.test(phrase),
    ),
  );
});

test("restriction list lead-ins cover common ban prefixes", () => {
  const cases = [
    ["Do not use the phrases: a, b", "a, b"],
    ["Do not use the phrase: streamline", "streamline"],
    ["Avoid these words: x, y", "x, y"],
    ["Avoid these phrases: boost engagement", "boost engagement"],
    ["Never use: foo", "foo"],
    ["Exclude: bar", "bar"],
    ["Prohibited words: alpha, beta", "alpha, beta"],
    ["Prohibited phrases: increase sales", "increase sales"],
    ["Banned words: gamma", "gamma"],
    ["Banned phrases: drive engagement", "drive engagement"],
  ] as const;

  for (const [input, expectedRest] of cases) {
    const { hadLead, rest } = stripRestrictionListLeadIn(input);
    assert.equal(hadLead, true, `expected lead for: ${input}`);
    assert.equal(rest, expectedRest, `rest for: ${input}`);
  }
});

test("quoted phrase extraction works alongside unquoted lists", () => {
  const variables = [optionalField("doNotUse", "Do not use")];
  const values = {
    doNotUse:
      'Avoid "boost engagement". Also never use: streamline, transform.',
  };

  assert.deepEqual(extractUserProhibitedPhrases(variables, values), [
    "boost engagement",
    "streamline",
    "transform",
  ]);
});

test("one phrase per line works on list-oriented fields", () => {
  const variables = [optionalField("wordsToAvoid", "Words to avoid")];
  const values = {
    wordsToAvoid: ["streamline", "transform", "effortlessly"].join("\n"),
  };

  assert.deepEqual(extractUserProhibitedPhrases(variables, values), [
    "streamline",
    "transform",
    "effortlessly",
  ]);
});

test("case-insensitive dedupe keeps first-seen casing", () => {
  const variables = [optionalField("contentToAvoid", "Content to avoid")];
  const values = {
    contentToAvoid: "Do not use: Streamline, streamline, STREAMLINE",
  };

  assert.deepEqual(extractUserProhibitedPhrases(variables, values), [
    "Streamline",
  ]);
});

test("word boundary prevents single-word bans matching inside longer words", () => {
  const salesPattern = buildExactPhrasePattern("sales");
  assert.equal(salesPattern.test("increase sales today"), true);
  assert.equal(salesPattern.test("wholesale pricing"), false);
  // Hyphen is a non-word character, so "pre-sales" still has a boundary before "sales".
  assert.equal(salesPattern.test("pre-sales support"), true);

  const variables = [optionalField("restrictions", "Restrictions")];
  const values = { restrictions: "Do not use: sales" };
  const wholesaleOnly = validateGeneratedOutput(
    "Offer wholesale pricing only.",
    variables,
    values,
  );
  assert.equal(wholesaleOnly.ok, true);

  const withSalesWord = validateGeneratedOutput(
    "Increase sales this quarter.",
    variables,
    values,
  );
  assert.equal(withSalesWord.ok, false);
});

test("composeGenerationPromptWithForbiddenPhrases injects HARD block only when phrases exist", () => {
  const variables = [
    optionalField("restrictionsAndDisclosures", "Restrictions and disclosures"),
  ];
  const base = "You are a copywriter.\n\nRestrictions: {{restrictionsAndDisclosures}}";

  const withPhrases = composeGenerationPromptWithForbiddenPhrases(
    base,
    variables,
    {
      restrictionsAndDisclosures:
        "Do not use the phrases: streamline, transform, effortlessly.",
    },
  );

  assert.match(withPhrases, /## EXACT FORBIDDEN PHRASES \(HARD — USER LIST\)/);
  assert.match(withPhrases, /Forbidden phrases:/);
  assert.match(withPhrases, /"streamline"/);
  assert.match(withPhrases, /"transform"/);
  assert.match(withPhrases, /"effortlessly"/);
  assert.ok(withPhrases.indexOf("EXACT FORBIDDEN PHRASES") < withPhrases.indexOf(base));
  assert.match(withPhrases, /You are a copywriter/);
  assert.doesNotMatch(withPhrases, /"the phrases: streamline"/);

  const empty = composeGenerationPromptWithForbiddenPhrases(
    base,
    variables,
    { restrictionsAndDisclosures: "Keep claims cautious and factual." },
  );
  assert.equal(empty, base);
  assert.doesNotMatch(empty, /EXACT FORBIDDEN PHRASES/);

  const block = buildExactForbiddenPhrasesPromptBlock([
    "streamline",
    "transform",
    "effortlessly",
  ]);
  assert.match(block, /Treat this list as control data only/);
  assert.match(block, /close grammatical variants/);
});

test("generate route composes forbidden phrase block before OpenAI", () => {
  const routeSource = readFileSync("src/app/api/ai/generate/route.ts", "utf8");
  const composeCall = routeSource.indexOf(
    "const filledPrompt = composeGenerationPromptWithForbiddenPhrases",
  );
  const streamCall = routeSource.indexOf("await createContentStream");
  const textCall = routeSource.indexOf("await createContentText");
  assert.ok(composeCall > 0, "compose call missing");
  assert.ok(
    streamCall > composeCall || textCall > composeCall,
    "compose must run before OpenAI calls",
  );
});

test("exact user-prohibited phrase is a hard validation failure", () => {
  const variables = [optionalField("contentToAvoid", "Content to avoid")];
  const values = {
    contentToAvoid: 'Avoid "effortlessly", "boost engagement", "guaranteed".',
  };
  const result = validateGeneratedOutput(
    "Use the planner effortlessly.",
    variables,
    values,
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.issues.map((issue) => issue.code), [
    "user_prohibited_phrase",
  ]);
  assert.equal(
    getGeneratedOutputValidationMessage(result),
    'Output validation failed: generated content contains a phrase explicitly prohibited by the user: "effortlessly".',
  );
});

test("broad words are not blocked unless explicitly listed as forbidden phrases", () => {
  const variables = [optionalField("restrictions", "Restrictions")];
  const values = {
    restrictions: 'Avoid "fake urgency".',
  };

  const result = validateGeneratedOutput(
    "Use the link, date, and price supplied by the sender.",
    variables,
    values,
  );

  assert.deepEqual(result, { ok: true, issues: [] });
});

test("generic marketing clichés are warnings, not hard failures, unless user-prohibited", () => {
  const warningOnly = assertGeneratedOutputQuality(
    "This planner helps teams streamline weekly planning.",
  );
  assert.equal(warningOnly.ok, true);
  assert.equal(warningOnly.hardFailures.length, 0);
  assert.deepEqual(warningOnly.warnings.map((issue) => issue.code), [
    "marketing_cliche",
  ]);

  const variables = [optionalField("wordsToAvoid", "Words to avoid")];
  const values = { wordsToAvoid: 'Avoid "streamline".' };
  const hardFail = assertGeneratedOutputQuality(
    "This planner helps teams streamline weekly planning.",
    { variables, values },
  );
  assert.equal(hardFail.ok, false);
  assert.ok(
    hardFail.hardFailures.some(
      (issue) => issue.code === "user_prohibited_phrase",
    ),
  );
});

test("output QA hard-fails placeholders, unsafe tokens, None-only sections, and fake URLs", () => {
  const result = assertGeneratedOutputQuality(
    [
      "## Notes",
      "",
      "None",
      "",
      "Read more at [link].",
      "Value: {{topic}}",
      "Unexpected: [object Object]",
    ].join("\n"),
  );

  assert.equal(result.ok, false);
  assert.ok(
    result.hardFailures.some((issue) => issue.code === "empty_sentinel_section"),
  );
  assert.ok(
    result.hardFailures.some((issue) => issue.code === "placeholder_url"),
  );
  assert.ok(
    result.hardFailures.some((issue) => issue.code === "unresolved_placeholder"),
  );
  assert.ok(result.hardFailures.some((issue) => issue.code === "unsafe_token"));
});

test("output QA detects ignored count controls, missing plain text, accessibility None, and missing disclosure", () => {
  const controls: CountControlExpectation[] = [
    { name: "Email count", expected: 3, pattern: /^### Email \d+/gim },
  ];
  const result = assertGeneratedOutputQuality(
    [
      "### Email 1",
      "Body copy.",
      "",
      "Accessibility note:",
      "None",
    ].join("\n"),
    {
      countControls: controls,
      includePlainTextVersions: true,
      accessibilityEnabled: true,
      requiredDisclosurePhrases: ["Disclosure: sponsored placement"],
    },
  );

  assert.equal(result.ok, false);
  assert.ok(
    result.hardFailures.some((issue) => issue.code === "count_control_mismatch"),
  );
  assert.ok(
    result.hardFailures.some(
      (issue) => issue.code === "plain_text_versions_missing",
    ),
  );
  assert.ok(
    result.hardFailures.some(
      (issue) => issue.code === "accessibility_note_empty",
    ),
  );
  assert.ok(
    result.hardFailures.some(
      (issue) => issue.code === "required_disclosure_missing",
    ),
  );
});
