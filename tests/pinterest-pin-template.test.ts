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

type PinterestPinFormSchema = {
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
  variables: Array<{
    key: string;
    format?: string;
    maxLength?: number;
    min?: number;
    max?: number;
  }>;
};

const expectedKeys = [
  "pinSubject",
  "primaryGoal",
  "targetAudience",
  "keyMessage",
  "pinFormat",
  "destinationUrl",
  "destinationSummary",
  "outputLanguage",
  "tone",
  "variantCount",
  "priorityKeywords",
  "contentAngle",
  "mustInclude",
  "seasonalTiming",
  "timingDetails",
  "brandName",
  "brandVoice",
  "visualAssets",
  "visualStyle",
  "ctaPreference",
  "offerDetails",
  "promotionRelationship",
  "disclosureText",
  "additionalRequirements",
] as const;

const requiredKeys = [
  "pinSubject",
  "primaryGoal",
  "targetAudience",
  "keyMessage",
  "outputLanguage",
] as const;

const prompt = readProjectFile("prisma", "template-prompts", "pinterest-pin.txt");
const schema = readJson<PinterestPinFormSchema>(
  "src",
  "config",
  "template-forms",
  "pinterest-pin-variables.json",
);
const variables = parseTemplateVariables(schema.variables);

function getField(key: string): TemplateVariable {
  const field = variables.find((variable) => variable.key === key);
  assert.ok(field, `Missing field ${key}`);
  return field;
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

test("Pinterest Pin prompt is replaced with the approved 24-variable prompt", () => {
  assert.match(prompt, /senior Pinterest content strategist/);
  assert.match(prompt, /Pin subject or offer: \{\{pinSubject\}\}/);
  assert.match(prompt, /Required disclosure text: \{\{disclosureText\}\}/);
  assert.match(prompt, /PINTEREST PIN PACKAGE/);
  assert.match(prompt, /Output only the completed Pinterest Pin package/);

  assert.doesNotMatch(prompt, /experienced Pinterest SEO strategist/);
  assert.doesNotMatch(prompt, /PIN DETAILS/);
  assert.doesNotMatch(prompt, /BOARD NAME SUGGESTIONS/);
  assert.doesNotMatch(prompt, /Primary keyword: \{\{primaryKeyword\}\}/);
  assert.doesNotMatch(prompt, /Relevant link or destination: \{\{link\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("Pinterest Pin form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "pinterest-pin");
  assert.equal(schema.title, "Pinterest Pin");
  assert.equal(schema.fieldCount, 24);
  assert.equal(variables.length, 24);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "topic",
    "pinType",
    "contentType",
    "primaryKeyword",
    "secondaryKeywords",
    "searchIntent",
    "audience",
    "knowledgeLevel",
    "goal",
    "desiredAction",
    "market",
    "language",
    "destinationPageType",
    "pageSummary",
    "pageValue",
    "link",
    "visualContext",
    "sourceDetails",
    "confirmedDetails",
    "timingContext",
    "restrictions",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("Pinterest Pin field groups and metadata follow the Compact schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    [
      "essentials",
      "search_content",
      "brand_visual_direction",
      "conversion_requirements",
    ],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 10);
  assert.equal(
    variables.filter((field) => field.group === "search_content").length,
    5,
  );
  assert.equal(
    variables.filter((field) => field.group === "brand_visual_direction").length,
    4,
  );
  assert.equal(
    variables.filter((field) => field.group === "conversion_requirements").length,
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

test("Pinterest Pin options and technical field adaptations match the specification", () => {
  assert.deepEqual(getField("primaryGoal").options, [
    "Drive website traffic",
    "Increase saves",
    "Promote a product or service",
    "Grow brand awareness",
    "Generate leads",
    "Educate or inspire",
  ]);
  assert.deepEqual(getField("pinFormat").options, [
    "Auto",
    "Image Pin",
    "Video Pin",
    "Product Pin",
    "Article or Blog Pin",
    "Recipe or How-to Pin",
  ]);
  assert.deepEqual(getField("ctaPreference").options, [
    "Auto",
    "Visit the website",
    "Read more",
    "Shop now",
    "Save for later",
    "Learn more",
    "Download",
    "Sign up",
    "None",
  ]);

  const destinationUrl = getField("destinationUrl");
  assert.equal(destinationUrl.type, "text");
  assert.equal(destinationUrl.format, "url");
  assert.equal(destinationUrl.maxLength, 500);

  const variantCount = getField("variantCount");
  assert.equal(variantCount.type, "number");
  assert.equal(variantCount.defaultValue, "3");
  assert.equal(variantCount.min, 1);
  assert.equal(variantCount.max, 5);
});

test("Pinterest Pin validation enforces required, URL, select, length, and number rules", () => {
  const values = {
    ...buildDefaultValues(variables),
    pinSubject: "Beginner balcony garden checklist",
    primaryGoal: "Increase saves",
    targetAudience: "First-time apartment renters who want affordable decor ideas",
    keyMessage: "A small balcony can support a simple herb garden with a few containers.",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, { ...values, pinSubject: "" }) ?? "",
    /Pin topic or offer/,
  );
  assert.match(
    validateVariableValues(variables, { ...values, primaryGoal: "Go viral" }) ?? "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      keyMessage: "x".repeat(1201),
    }) ?? "",
    /1,200 characters|1200 characters/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      destinationUrl: "not-a-url",
    }) ?? "",
    /valid URL/,
  );
  assert.match(
    validateVariableValues(variables, { ...values, variantCount: "6" }) ?? "",
    /at most 5/,
  );
});

test("Pinterest Pin conditional fields render only when relevant", () => {
  const values = buildDefaultValues(variables);
  const timingDetails = getField("timingDetails");
  const offerDetails = getField("offerDetails");
  const disclosureText = getField("disclosureText");

  assert.equal(isTemplateFieldVisible(timingDetails, values), false);
  assert.equal(
    isTemplateFieldVisible(timingDetails, {
      ...values,
      seasonalTiming: "Current season",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(timingDetails, {
      ...values,
      seasonalTiming: "Specific date or campaign window",
    }),
    true,
  );

  assert.equal(isTemplateFieldVisible(offerDetails, values), false);
  assert.equal(
    isTemplateFieldVisible(offerDetails, {
      ...values,
      primaryGoal: "Promote a product or service",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(offerDetails, {
      ...values,
      primaryGoal: "Generate leads",
    }),
    true,
  );

  assert.equal(isTemplateFieldVisible(disclosureText, values), false);
  assert.equal(
    isTemplateFieldVisible(disclosureText, {
      ...values,
      promotionRelationship: "Affiliate relationship",
    }),
    true,
  );
});

test("Pinterest Pin prompt filling does not invent optional field placeholders", () => {
  const values = {
    ...buildDefaultValues(variables),
    pinSubject: "A small balcony herb garden",
    primaryGoal: "Increase saves",
    targetAudience: "Apartment renters with limited outdoor space",
    keyMessage: "Use containers, sunlight, and a small weekly care routine.",
    destinationUrl: "",
    destinationSummary: "",
    timingDetails: "",
    offerDetails: "",
    disclosureText: "",
  };
  const filled = fillPromptTemplate(prompt, values);

  assert.doesNotMatch(filled, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(
    filled,
    new RegExp(`\\[(${expectedKeys.join("|")})\\]`),
  );
  assert.doesNotMatch(filled, /\bundefined\b/i);
  assert.doesNotMatch(filled, /\bnull\b/i);
  assert.doesNotMatch(filled, /\bN\/A\b/i);
});

test("Pinterest Pin catalog, summary, builder, and Help integration are in sync", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const matches = catalog.filter((item) => item.slug === "pinterest-pin");
  assert.equal(matches.length, 1);
  const template = matches[0];
  assert.equal(template.title, "Pinterest Pin");
  assert.equal(
    template.description,
    "Generate search-aware Pinterest titles, descriptions, image-overlay copy, visual direction, and destination-aligned Pin variants.",
  );
  assert.equal(template.category, "pinterest");
  assert.equal(template.requiredPlan, "pro");
  assert.equal(template.prompt.trim(), prompt.trim());
  assert.equal(template.variables.length, 24);
  assert.deepEqual(
    sorted(template.variables.map((field) => field.key)),
    sorted(expectedKeys),
  );
  assert.equal(
    template.variables.find((field) => field.key === "destinationUrl")?.format,
    "url",
  );
  assert.equal(
    template.variables.find((field) => field.key === "variantCount")?.max,
    5,
  );

  const summary = readJson<Array<{ slug: string; vars: number }>>(
    "prisma",
    "templates-summary.json",
  );
  assert.equal(summary.find((item) => item.slug === "pinterest-pin")?.vars, 24);

  const helpConfig = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpConfig, /"pinterest-pin": PINTEREST_PIN_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "pinterest-pin",
    "page.tsx",
  );
  assert.match(guidePage, /templateSlug="pinterest-pin"/);
  assert.match(guidePage, /pinterestPinFormVariables/);
  assert.match(guidePage, /pinterestPinFormGroups/);

  const builder = readProjectFile("scripts", "build-pinterest-pin-form.mjs");
  assert.match(builder, /approved 24-field specification/);
  assert.doesNotMatch(builder, /Instagram Carousel/);
});
