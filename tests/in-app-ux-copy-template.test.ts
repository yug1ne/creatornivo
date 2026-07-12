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

type InAppUxCopyFormSchema = {
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
  "productOrFeature",
  "interfaceContext",
  "workflowGoal",
  "targetUsers",
  "uxElements",
  "keyFacts",
  "taskMode",
  "tone",
  "outputLanguage",
  "currentCopy",
  "userState",
  "nextAction",
  "errorRecoveryAction",
  "variantContext",
  "brandVoice",
  "terminology",
  "readingLevel",
  "accessibilityNeeds",
  "lengthPreference",
  "numberOfVariants",
  "prohibitedContent",
  "sensitiveDomain",
  "complianceNotes",
  "additionalContext",
] as const;

const requiredKeys = [
  "productOrFeature",
  "interfaceContext",
  "workflowGoal",
  "targetUsers",
  "uxElements",
  "keyFacts",
] as const;

const prompt = readProjectFile(
  "prisma",
  "template-prompts",
  "in-app-ux-copy.txt",
);
const schema = readJson<InAppUxCopyFormSchema>(
  "src",
  "config",
  "template-forms",
  "in-app-ux-copy-variables.json",
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

test("In-App UX Copy prompt is replaced with the approved 24-variable prompt", () => {
  assert.match(prompt, /senior UX writer, product content designer/);
  assert.match(prompt, /Product or feature:\n\{\{productOrFeature\}\}/);
  assert.match(prompt, /Requested UX elements:\n\{\{uxElements\}\}/);
  assert.match(prompt, /Current interface copy:\n\{\{currentCopy\}\}/);
  assert.match(prompt, /Compliance requirements:\n\{\{complianceNotes\}\}/);
  assert.match(prompt, /## Copy Direction/);
  assert.match(prompt, /## Recommended UX Copy/);
  assert.match(prompt, /## Implementation Notes/);
  assert.match(prompt, /FINAL QUALITY CHECK/);

  assert.doesNotMatch(prompt, /experienced UX writer, product content designer/);
  assert.doesNotMatch(prompt, /PRODUCT INFORMATION/);
  assert.doesNotMatch(prompt, /\{\{productName\}\}/);
  assert.doesNotMatch(prompt, /\{\{userTask\}\}/);
  assert.doesNotMatch(prompt, /\{\{copyType\}\}/);
  assert.doesNotMatch(prompt, /\{\{sourceDetails\}\}/);
  assert.doesNotMatch(prompt, /\{\{verificationCode\}\}/);
  assert.doesNotMatch(prompt, /\{\{itemName\}\}/);
  assert.doesNotMatch(prompt, /\{\{audience\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("In-App UX Copy form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "in-app-ux-copy");
  assert.equal(schema.title, "In-App UX Copy");
  assert.equal(schema.fieldCount, 24);
  assert.equal(variables.length, 24);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "productName",
    "userTask",
    "copyType",
    "flowName",
    "screenName",
    "desiredAction",
    "language",
    "preferredLength",
    "sourceDetails",
    "restrictions",
    "verificationCode",
    "itemName",
    "audience",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("In-App UX Copy groups and help metadata follow the Compact schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    [
      "essentials",
      "flow_behavior",
      "voice_accessibility",
      "constraints_delivery",
    ],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 10);
  assert.equal(
    variables.filter((field) => field.group === "flow_behavior").length,
    4,
  );
  assert.equal(
    variables.filter((field) => field.group === "voice_accessibility").length,
    4,
  );
  assert.equal(
    variables.filter((field) => field.group === "constraints_delivery").length,
    6,
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

test("In-App UX Copy options, conditional fields, and type adaptations match the specification", () => {
  const uxElements = getField("uxElements");
  assert.equal(uxElements.type, "textarea");
  assert.deepEqual(uxElements.options, [
    "Buttons and links",
    "Field labels",
    "Helper text",
    "Input placeholders",
    "Onboarding",
    "Empty states",
    "Validation messages",
    "Error messages",
    "Success states",
    "System notifications",
  ]);

  assert.deepEqual(getField("taskMode").options, [
    "Create new copy",
    "Rewrite existing copy",
    "Audit and improve copy",
  ]);
  assert.deepEqual(getField("tone").options, [
    "Clear and supportive",
    "Neutral and direct",
    "Friendly and conversational",
    "Calm and reassuring",
    "Professional",
    "Concise and technical",
    "Auto",
  ]);

  const accessibilityNeeds = getField("accessibilityNeeds");
  assert.equal(accessibilityNeeds.type, "textarea");
  assert.deepEqual(accessibilityNeeds.options, [
    "Clear language",
    "Screen-reader clarity",
    "Avoid directional wording",
    "Avoid color-only references",
    "Cognitive accessibility",
    "Translation-friendly wording",
  ]);

  assert.deepEqual(getField("sensitiveDomain").options, [
    "None",
    "Health or medical",
    "Financial",
    "Legal",
    "Safety or security",
    "Employment",
    "Children or minors",
    "Account and privacy",
    "Other regulated context",
  ]);
  assert.equal(getField("numberOfVariants").type, "number");
  assert.equal(getField("numberOfVariants").min, 1);
  assert.equal(getField("numberOfVariants").max, 5);

  assert.equal(
    isTemplateFieldVisible(getField("currentCopy"), {
      taskMode: "Rewrite existing copy",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("currentCopy"), {
      taskMode: "Create new copy",
    }),
    false,
  );
  assert.equal(
    isTemplateFieldVisible(getField("errorRecoveryAction"), {
      uxElements: "Buttons and links, Error messages",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("errorRecoveryAction"), {
      uxElements: "Buttons and links",
    }),
    false,
  );
  assert.equal(
    isTemplateFieldVisible(getField("complianceNotes"), {
      sensitiveDomain: "Account and privacy",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("complianceNotes"), {
      sensitiveDomain: "None",
    }),
    false,
  );
});

test("In-App UX Copy validation and prompt rendering use form metadata", () => {
  const values = {
    ...buildDefaultValues(variables),
    productOrFeature: "Password reset",
    interfaceContext: "Password reset form after the user opens a recovery link.",
    workflowGoal: "Recover access to the account",
    targetUsers: "First-time users with limited technical experience",
    uxElements: "Buttons and links, validation messages, error messages",
    keyFacts:
      "The reset link expires after 30 minutes. Passwords must be at least 12 characters.",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, { ...values, taskMode: "Unknown" }) ?? "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      numberOfVariants: "6",
    }) ?? "",
    /at most 5/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      taskMode: "Audit and improve copy",
      currentCopy: "x".repeat(4001),
    }) ?? "",
    /4000 characters or fewer/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      sensitiveDomain: "Financial",
      complianceNotes: "x".repeat(1501),
    }) ?? "",
    /1500 characters or fewer/,
  );

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b/);
  assert.match(rendered, /Password reset/);
  assert.match(rendered, /Recover access to the account/);
  assert.match(rendered, /Requested UX elements:\nButtons and links/);
});

test("In-App UX Copy catalog and Help integration use the full form", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "in-app-ux-copy");
  assert.ok(item, "Catalog should include In-App UX Copy");
  assert.equal(item.title, "In-App UX Copy");
  assert.equal(item.category, "app_ux");
  assert.equal(item.requiredPlan, "pro");
  assert.match(item.description, /clear, concise interface copy/);
  assert.equal(normalizeLineEndings(item.prompt), normalizeLineEndings(prompt));
  assert.equal(item.variables.length, 24);
  assert.deepEqual(sorted(item.variables.map((variable) => variable.key)), sorted(expectedKeys));

  const helpButton = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpButton, /IN_APP_UX_COPY_GUIDE_PATH/);
  assert.match(helpButton, /"in-app-ux-copy": IN_APP_UX_COPY_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "in-app-ux-copy",
    "page.tsx",
  );
  assert.match(guidePage, /In-App UX Copy - field guide/);
  assert.match(guidePage, /templateSlug="in-app-ux-copy"/);
});
