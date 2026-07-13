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

type WebsitePopupFormSchema = {
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
  "popupGoal",
  "popupSubject",
  "targetAudience",
  "keyDetails",
  "desiredAction",
  "pageContext",
  "destinationUrl",
  "triggerType",
  "tone",
  "outputLanguage",
  "incentiveType",
  "incentiveDetails",
  "timeLimit",
  "secondaryAction",
  "customSecondaryText",
  "brandName",
  "brandVoice",
  "popupFormat",
  "lengthPreference",
  "dataCollected",
  "privacyUrl",
  "restrictions",
  "variantCount",
  "additionalContext",
] as const;

const requiredKeys = [
  "popupGoal",
  "popupSubject",
  "targetAudience",
  "keyDetails",
  "desiredAction",
] as const;

const prompt = readProjectFile(
  "prisma",
  "template-prompts",
  "website-popup.txt",
);
const schema = readJson<WebsitePopupFormSchema>(
  "src",
  "config",
  "template-forms",
  "website-popup-variables.json",
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

test("Website Popup prompt is replaced with the approved 24-variable prompt", () => {
  assert.match(prompt, /senior conversion copywriter and UX microcopy specialist/);
  assert.match(prompt, /\* Goal: \{\{popupGoal\}\}/);
  assert.match(prompt, /\* Subject, offer, or message: \{\{popupSubject\}\}/);
  assert.match(prompt, /\* Destination URL: \{\{destinationUrl\}\}/);
  assert.match(prompt, /\* Data collected: \{\{dataCollected\}\}/);
  assert.match(prompt, /## Recommended Setup/);
  assert.match(prompt, /## Popup Variants/);
  assert.match(prompt, /## Character Check/);
  assert.match(prompt, /FINAL CHECK/);

  assert.doesNotMatch(prompt, /experienced conversion copywriter, CRO strategist/);
  assert.doesNotMatch(prompt, /WEBSITE INFORMATION/);
  assert.doesNotMatch(prompt, /\{\{websiteName\}\}/);
  assert.doesNotMatch(prompt, /\{\{websiteUrl\}\}/);
  assert.doesNotMatch(prompt, /\{\{popupType\}\}/);
  assert.doesNotMatch(prompt, /\{\{mainMessage\}\}/);
  assert.doesNotMatch(prompt, /\{\{audience\}\}/);
  assert.doesNotMatch(prompt, /\{\{sourceDetails\}\}/);
  assert.doesNotMatch(prompt, /\{\{offer\}\}/);
  assert.doesNotMatch(prompt, /\{\{fieldName\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("Website Popup form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "website-popup");
  assert.equal(schema.title, "Website Popup");
  assert.equal(schema.fieldCount, 24);
  assert.equal(variables.length, 24);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "websiteName",
    "websiteUrl",
    "popupType",
    "mainMessage",
    "audience",
    "sourceDetails",
    "offer",
    "language",
    "fieldName",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("Website Popup groups and help metadata follow the Compact schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    ["essentials", "offer_conversion", "brand_experience", "privacy_output"],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 10);
  assert.equal(
    variables.filter((field) => field.group === "offer_conversion").length,
    5,
  );
  assert.equal(
    variables.filter((field) => field.group === "brand_experience").length,
    4,
  );
  assert.equal(
    variables.filter((field) => field.group === "privacy_output").length,
    5,
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

test("Website Popup options, conditional fields, and type adaptations match the specification", () => {
  assert.deepEqual(getField("popupGoal").options, [
    "Grow email list",
    "Promote an offer",
    "Deliver a free resource",
    "Announce news or event",
    "Drive to a page or product",
    "Recover an exiting visitor",
    "Collect feedback",
    "Other",
  ]);
  assert.deepEqual(getField("triggerType").options, [
    "Auto",
    "Immediately on page load",
    "After a timed delay",
    "After scroll progress",
    "Exit intent",
    "After a visitor action",
    "Specific page or event",
  ]);
  assert.deepEqual(getField("secondaryAction").options, [
    "Auto",
    "Not now",
    "Continue browsing",
    "None",
    "Custom",
  ]);
  assert.deepEqual(getField("variantCount").options, ["1", "2", "3", "4"]);

  const destinationUrl = getField("destinationUrl");
  assert.equal(destinationUrl.type, "text");
  assert.equal(destinationUrl.format, "url");

  const privacyUrl = getField("privacyUrl");
  assert.equal(privacyUrl.type, "text");
  assert.equal(privacyUrl.format, "url");

  const dataCollected = getField("dataCollected");
  assert.equal(dataCollected.type, "textarea");

  assert.equal(
    isTemplateFieldVisible(getField("incentiveDetails"), {
      incentiveType: "Discount",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("incentiveDetails"), {
      incentiveType: "None",
    }),
    false,
  );
  assert.equal(
    isTemplateFieldVisible(getField("customSecondaryText"), {
      secondaryAction: "Custom",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("privacyUrl"), {
      dataCollected: "Email address, first name",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("privacyUrl"), {
      dataCollected: "",
    }),
    false,
  );
});

test("Website Popup validation and prompt rendering use form metadata", () => {
  const values = {
    ...buildDefaultValues(variables),
    popupGoal: "Grow email list",
    popupSubject: "15% welcome discount for first-time customers",
    targetAudience:
      "First-time visitors comparing affordable project-management tools",
    keyDetails:
      "The discount applies to the first monthly subscription, excludes annual plans, and expires August 31, 2026.",
    desiredAction: "Enter an email address and receive the guide",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, { ...values, popupGoal: "Unknown" }) ?? "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      destinationUrl: "not-a-url",
    }) ?? "",
    /valid URL/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      dataCollected: "Email address",
      privacyUrl: "not-a-url",
    }) ?? "",
    /valid URL/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      secondaryAction: "Custom",
      customSecondaryText: "x".repeat(61),
    }) ?? "",
    /60 characters or fewer/,
  );

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b/);
  assert.match(rendered, /15% welcome discount/);
  assert.match(rendered, /First-time visitors/);
  assert.match(rendered, /\* Goal: Grow email list/);
});

test("Website Popup catalog and Help integration use the full form", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "website-popup");
  assert.ok(item, "Catalog should include Website Popup");
  assert.equal(item.title, "Website Popup");
  assert.equal(item.category, "app_ux");
  assert.equal(item.requiredPlan, "pro");
  assert.match(item.description, /concise website popup copy/);
  assert.equal(normalizeLineEndings(item.prompt), normalizeLineEndings(prompt));
  assert.equal(item.variables.length, 24);
  assert.deepEqual(sorted(item.variables.map((variable) => variable.key)), sorted(expectedKeys));

  const helpButton = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpButton, /WEBSITE_POPUP_GUIDE_PATH/);
  assert.match(helpButton, /"website-popup": WEBSITE_POPUP_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "website-popup",
    "page.tsx",
  );
  assert.match(guidePage, /Website Popup - field guide/);
  assert.match(guidePage, /templateSlug="website-popup"/);
});
