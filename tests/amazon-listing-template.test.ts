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

type AmazonListingFormSchema = {
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
  "marketplace",
  "outputLanguage",
  "productName",
  "brandName",
  "productCategory",
  "targetCustomer",
  "productFacts",
  "keyDifferentiators",
  "primaryUseCases",
  "listingGoal",
  "specifications",
  "materialsIngredients",
  "dimensionsWeight",
  "packageContents",
  "compatibilityFit",
  "careInstructions",
  "safetyWarnings",
  "warrantySupport",
  "primaryKeywords",
  "secondaryKeywords",
  "positioningAngle",
  "toneStyle",
  "mustUseOrAvoidWording",
  "productRiskType",
  "claimsAndEvidence",
  "sellerCentralRules",
  "hasVariations",
  "variationDetails",
  "currentListing",
  "referenceSource",
  "additionalContext",
] as const;

const requiredKeys = [
  "marketplace",
  "productName",
  "productCategory",
  "targetCustomer",
  "productFacts",
] as const;

const prompt = readProjectFile("prisma", "template-prompts", "amazon-listing.txt");
const schema = readJson<AmazonListingFormSchema>(
  "src",
  "config",
  "template-forms",
  "amazon-listing-variables.json",
);
const variables = parseTemplateVariables(schema.variables);

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

function getField(key: string): TemplateVariable {
  const field = variables.find((variable) => variable.key === key);
  assert.ok(field, `Missing field ${key}`);
  return field;
}

test("Amazon Listing prompt is replaced with the approved 31-variable prompt", () => {
  assert.match(prompt, /Amazon marketplace listing strategist/);
  assert.match(prompt, /Marketplace: \{\{marketplace\}\}/);
  assert.match(prompt, /Verified product facts: \{\{productFacts\}\}/);
  assert.match(prompt, /Product risk type: \{\{productRiskType\}\}/);
  assert.match(prompt, /Has variations: \{\{hasVariations\}\}/);
  assert.match(prompt, /FINAL CHECK/);

  assert.doesNotMatch(prompt, /experienced Amazon marketplace listing copywriter/);
  assert.doesNotMatch(prompt, /MARKETPLACE INFORMATION/);
  assert.doesNotMatch(prompt, /\{\{targetLocale\}\}/);
  assert.doesNotMatch(prompt, /\{\{language\}\}/);
  assert.doesNotMatch(prompt, /\{\{brand\}\}/);
  assert.doesNotMatch(prompt, /\{\{buyer\}\}/);
  assert.doesNotMatch(prompt, /\{\{features\}\}/);
  assert.doesNotMatch(prompt, /\{\{benefits\}\}/);
  assert.doesNotMatch(prompt, /\{\{primaryKeyword\}\}/);
  assert.doesNotMatch(prompt, /\{\{tone\}\}/);
  assert.doesNotMatch(prompt, /\{\{sourceDetails\}\}/);
  assert.doesNotMatch(prompt, /\{\{includedItems\}\}/);
  assert.doesNotMatch(prompt, /\{\{aPlusEligible\}\}/);
  assert.doesNotMatch(prompt, /\{\{restrictions\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("Amazon Listing form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "amazon-listing");
  assert.equal(schema.title, "Amazon Listing");
  assert.equal(schema.fieldCount, 31);
  assert.equal(variables.length, 31);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "targetLocale",
    "language",
    "productType",
    "categoryRules",
    "listingDate",
    "brand",
    "model",
    "productDescription",
    "primaryUseCase",
    "buyer",
    "knowledgeLevel",
    "painPoint",
    "desiredOutcome",
    "features",
    "benefits",
    "materials",
    "dimensions",
    "weight",
    "variations",
    "compatibility",
    "includedItems",
    "excludedItems",
    "instructions",
    "ageRestrictions",
    "limitations",
    "sourceDetails",
    "certifications",
    "primaryKeyword",
    "tone",
    "brandVoice",
    "goal",
    "restrictions",
    "aPlusEligible",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("Amazon Listing groups and help metadata follow the Standard schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    [
      "essentials",
      "product_facts_purchase_info",
      "search_positioning",
      "compliance_variations_sources",
    ],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 10);
  assert.equal(
    variables.filter((field) => field.group === "product_facts_purchase_info")
      .length,
    8,
  );
  assert.equal(
    variables.filter((field) => field.group === "search_positioning").length,
    5,
  );
  assert.equal(
    variables.filter((field) => field.group === "compliance_variations_sources")
      .length,
    8,
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

test("Amazon Listing options, conditional fields, and technical adaptations match the specification", () => {
  assert.deepEqual(getField("listingGoal").options, [
    "Balanced conversion and discoverability",
    "Improve discoverability",
    "Improve purchase confidence",
    "Premium positioning",
    "New product launch",
    "Refresh an existing listing",
  ]);
  assert.deepEqual(getField("positioningAngle").options, [
    "Auto",
    "Practical value",
    "Premium quality",
    "Durability",
    "Ease of use",
    "Performance",
    "Space saving",
    "Eco-conscious",
    "Giftable",
    "Specialized use",
  ]);
  assert.deepEqual(getField("productRiskType").options, [
    "Standard consumer product",
    "Health or medical product",
    "Dietary supplement",
    "Food or beverage",
    "Beauty or cosmetic product",
    "Children’s product",
    "Electrical or safety product",
    "Other regulated product",
  ]);

  const hasVariations = getField("hasVariations");
  assert.equal(hasVariations.type, "select");
  assert.deepEqual(hasVariations.options, ["True", "False"]);
  assert.equal(hasVariations.defaultValue, "False");

  const claims = getField("claimsAndEvidence");
  assert.equal(
    isTemplateFieldVisible(claims, {
      productRiskType: "Dietary supplement",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(claims, {
      productRiskType: "Standard consumer product",
    }),
    false,
  );

  const variationDetails = getField("variationDetails");
  assert.equal(
    isTemplateFieldVisible(variationDetails, { hasVariations: "True" }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(variationDetails, { hasVariations: "False" }),
    false,
  );
});

test("Amazon Listing validation and prompt rendering use form metadata", () => {
  const values = {
    ...buildDefaultValues(variables),
    marketplace: "Amazon.com US",
    productName: "Adjustable Bamboo Drawer Organizer",
    productCategory: "Kitchen drawer organizers",
    targetCustomer:
      "Apartment renters and homeowners who want tidier kitchen drawers without custom cabinetry.",
    productFacts:
      "Expandable bamboo organizer, 7 compartments, fits drawers from 13 to 20 inches wide, non-slip feet, no tools required.",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, { ...values, listingGoal: "Unknown" }) ??
      "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      marketplace: "x".repeat(81),
    }) ?? "",
    /80 characters or fewer/,
  );

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b|\bN\/A\b/);
  assert.match(rendered, /Amazon\.com US/);
  assert.match(rendered, /Adjustable Bamboo Drawer Organizer/);
});

test("Amazon Listing catalog and Help integration use the full form", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "amazon-listing");
  assert.ok(item, "Catalog should include Amazon Listing");
  assert.equal(item.title, "Amazon Listing");
  assert.equal(item.category, "ecommerce");
  assert.equal(item.requiredPlan, "pro");
  assert.match(item.description, /claim-safe Amazon title/);
  assert.equal(item.variables.length, 31);
  assert.deepEqual(sorted(item.variables.map((variable) => variable.key)), sorted(expectedKeys));

  const helpButton = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpButton, /AMAZON_LISTING_GUIDE_PATH/);
  assert.match(helpButton, /"amazon-listing": AMAZON_LISTING_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "amazon-listing",
    "page.tsx",
  );
  assert.match(guidePage, /Amazon Listing - field guide/);
  assert.match(guidePage, /templateSlug="amazon-listing"/);
});
