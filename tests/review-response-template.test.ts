import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildDefaultValues,
  fillPromptTemplate,
  isTemplateFieldVisible,
  parseTemplateVariables,
  validateVariableValues,
} from "../src/lib/templates/utils";
import type { TemplateVariable } from "../src/types/template";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readProjectFile(...parts: string[]): string {
  return readFileSync(path.join(root, ...parts), "utf8");
}

function readJson<T>(...parts: string[]): T {
  return JSON.parse(readProjectFile(...parts)) as T;
}

function extractVariables(prompt: string): string[] {
  return [
    ...new Set(
      [...prompt.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)].map(
        (match) => match[1],
      ),
    ),
  ];
}

type ReviewResponseFormSchema = {
  slug: string;
  title: string;
  fieldCount: number;
  requiredKeys: string[];
  groups: Array<{ id: string; title: string; defaultOpen?: boolean }>;
  variables: unknown;
};

type CatalogTemplate = {
  slug: string;
  title: string;
  description: string;
  category: string;
  requiredPlan: string;
  prompt: string;
  variables: Array<{ key: string }>;
};

const expectedKeys = [
  "businessName",
  "reviewPlatform",
  "reviewText",
  "reviewSentiment",
  "responseGoal",
  "responseVisibility",
  "verifiedFacts",
  "reviewerName",
  "outputLanguage",
  "issueCategory",
  "caseStatus",
  "approvedResolutionDetails",
  "contactDetails",
  "boundariesRestrictions",
  "tone",
  "brandVoice",
  "signOff",
  "wordsToAvoid",
  "responseLength",
  "variantCount",
  "includeInternalNote",
] as const;

const requiredKeys = [
  "businessName",
  "reviewText",
  "reviewSentiment",
  "responseGoal",
  "outputLanguage",
] as const;

const prompt = readProjectFile(
  "prisma",
  "template-prompts",
  "review-response.txt",
);
const schema = readJson<ReviewResponseFormSchema>(
  "src",
  "config",
  "template-forms",
  "review-response-variables.json",
);
const variables = parseTemplateVariables(schema.variables);

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

function getField(key: string): TemplateVariable {
  const field = variables.find((variable) => variable.key === key);
  assert.ok(field, `Missing field ${key}`);
  return field;
}

test("Review Response prompt is replaced with the approved 21-variable prompt", () => {
  assert.match(
    prompt,
    /senior customer-experience writer, review-response specialist, and privacy\/accuracy reviewer/,
  );
  assert.match(prompt, /Business: \{\{businessName\}\}/);
  assert.match(prompt, /Platform: \{\{reviewPlatform\}\}/);
  assert.match(prompt, /Review: \{\{reviewText\}\}/);
  assert.match(prompt, /Internal note: \{\{includeInternalNote\}\}/);
  assert.match(prompt, /Do not condition help or compensation on deleting, editing, or improving the review/);
  assert.match(prompt, /FINAL CHECK/);

  assert.doesNotMatch(prompt, /experienced reputation-management writer/);
  assert.doesNotMatch(prompt, /BUSINESS INFORMATION/);
  assert.doesNotMatch(prompt, /RESPONSE READINESS GATE/);
  assert.doesNotMatch(prompt, /\{\{publicBrandName\}\}/);
  assert.doesNotMatch(prompt, /\{\{starRating\}\}/);
  assert.doesNotMatch(prompt, /\{\{language\}\}/);
  assert.doesNotMatch(prompt, /\{\{desiredReviewerAction\}\}/);
  assert.doesNotMatch(prompt, /\{\{restrictions\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("Review Response form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "review-response");
  assert.equal(schema.title, "Review Response");
  assert.equal(schema.fieldCount, 21);
  assert.equal(variables.length, 21);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "publicBrandName",
    "starRating",
    "language",
    "desiredReviewerAction",
    "restrictions",
    "supportDestination",
    "safeReferenceInstruction",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("Review Response groups and Help metadata follow the Compact schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    [
      "essentials",
      "review_context_resolution",
      "brand_tone",
      "output_settings",
    ],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 9);
  assert.equal(
    variables.filter((field) => field.group === "review_context_resolution")
      .length,
    5,
  );
  assert.equal(variables.filter((field) => field.group === "brand_tone").length, 4);
  assert.equal(
    variables.filter((field) => field.group === "output_settings").length,
    3,
  );

  for (const field of variables) {
    assert.ok(field.label, `${field.key} needs a label`);
    assert.ok(field.placeholder, `${field.key} needs a placeholder`);
    assert.ok(field.hint, `${field.key} needs helper text`);
    assert.ok(field.help?.what, `${field.key} needs help.what`);
    assert.ok(field.help?.why, `${field.key} needs help.why`);
    assert.ok(field.help?.example, `${field.key} needs help.example`);
    assert.ok(field.help?.avoid, `${field.key} needs help.avoid`);
    assert.match(field.type ?? "text", /^(text|textarea|select|number)$/);
  }
});

test("Review Response options, conditional fields, and type adaptations match the specification", () => {
  assert.deepEqual(getField("reviewPlatform").options, [
    "Auto",
    "Google Business Profile",
    "Trustpilot",
    "Yelp",
    "Facebook",
    "App Store",
    "Marketplace listing",
    "Other review platform",
  ]);
  assert.deepEqual(getField("reviewSentiment").options, [
    "Auto-detect",
    "Very positive",
    "Positive",
    "Mixed or neutral",
    "Negative",
    "Severe or sensitive",
  ]);
  assert.deepEqual(getField("responseGoal").options, [
    "Auto",
    "Thank and reinforce",
    "Acknowledge and reassure",
    "De-escalate",
    "Correct misinformation",
    "Invite private follow-up",
    "Explain policy calmly",
  ]);
  assert.deepEqual(getField("caseStatus").options, [
    "Not specified",
    "No action needed",
    "Investigating",
    "In progress",
    "Resolved",
    "Unable to verify",
  ]);
  assert.deepEqual(getField("tone").options, [
    "Auto",
    "Warm and appreciative",
    "Professional and neutral",
    "Empathetic and calm",
    "Friendly and concise",
    "Formal",
    "Firm but respectful",
    "Apologetic without liability",
  ]);
  assert.deepEqual(getField("responseLength").options, [
    "Platform-appropriate auto",
    "Very short",
    "Short",
    "Standard",
  ]);

  const includeInternalNote = getField("includeInternalNote");
  assert.equal(includeInternalNote.type, "select");
  assert.deepEqual(includeInternalNote.options, ["On", "Off"]);

  const variantCount = getField("variantCount");
  assert.equal(variantCount.type, "number");
  assert.equal(variantCount.min, 1);
  assert.equal(variantCount.max, 3);

  assert.equal(
    isTemplateFieldVisible(getField("approvedResolutionDetails"), {
      caseStatus: "In progress",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("approvedResolutionDetails"), {
      caseStatus: "Resolved",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("approvedResolutionDetails"), {
      caseStatus: "Not specified",
    }),
    false,
  );
  assert.equal(
    isTemplateFieldVisible(getField("contactDetails"), {
      responseGoal: "Invite private follow-up",
      responseVisibility: "Public reply",
      caseStatus: "Not specified",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("contactDetails"), {
      responseGoal: "Auto",
      responseVisibility: "Both",
      caseStatus: "Not specified",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("contactDetails"), {
      responseGoal: "Auto",
      responseVisibility: "Public reply",
      caseStatus: "Investigating",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("contactDetails"), {
      responseGoal: "Auto",
      responseVisibility: "Public reply",
      caseStatus: "No action needed",
    }),
    false,
  );
});

test("Review Response validation and prompt rendering use form metadata", () => {
  const values = {
    ...buildDefaultValues(variables),
    businessName: "Northside Dental Clinic",
    reviewText:
      "The hygienist was kind, but I waited 40 minutes past my appointment time.",
    reviewSentiment: "Mixed or neutral",
    responseGoal: "Acknowledge and reassure",
    outputLanguage: "English",
    verifiedFacts:
      "The appointment ran late because an emergency visit extended the previous slot.",
    caseStatus: "Investigating",
    contactDetails:
      "Email support@example.com with the appointment date and preferred contact method.",
    variantCount: "2",
    includeInternalNote: "On",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, {
      ...values,
      reviewSentiment: "Unknown",
    }) ?? "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      variantCount: "4",
    }) ?? "",
    /at most 3/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      contactDetails: "x".repeat(501),
    }) ?? "",
    /500 characters or fewer/,
  );

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b/);
  assert.match(rendered, /Northside Dental Clinic/);
  assert.match(rendered, /The hygienist was kind/);
  assert.match(rendered, /Internal note: On/);
});

test("Review Response catalog and Help integration use the full form", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "review-response");
  assert.ok(item, "Catalog should include Review Response");
  assert.equal(item.title, "Review Response");
  assert.equal(item.category, "sales");
  assert.equal(item.requiredPlan, "pro");
  assert.match(item.description, /Respectful, accurate review responses/);
  assert.equal(normalizeLineEndings(item.prompt), normalizeLineEndings(prompt));
  assert.equal(item.variables.length, 21);
  assert.deepEqual(sorted(item.variables.map((variable) => variable.key)), sorted(expectedKeys));

  const helpButton = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpButton, /REVIEW_RESPONSE_GUIDE_PATH/);
  assert.match(helpButton, /"review-response": REVIEW_RESPONSE_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "review-response",
    "page.tsx",
  );
  assert.match(guidePage, /Review Response - field guide/);
  assert.match(guidePage, /templateSlug="review-response"/);
});
