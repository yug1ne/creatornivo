import assert from "node:assert/strict";
import test from "node:test";

import {
  assertGeneratedOutputQuality,
  type CountControlExpectation,
} from "../src/lib/templates/generation-qa";
import {
  extractUserProhibitedPhrases,
  getGeneratedOutputValidationMessage,
  validateGeneratedOutput,
} from "../src/lib/templates/output-validation";
import type { TemplateVariable } from "../src/types/template";

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
