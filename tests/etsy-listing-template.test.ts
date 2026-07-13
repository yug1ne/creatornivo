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

type EtsyListingFormSchema = {
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
  "productFormat",
  "sellerRole",
  "productName",
  "productOverview",
  "targetBuyer",
  "keySellingPoints",
  "essentialSpecs",
  "primaryUseOccasion",
  "outputLanguage",
  "tone",
  "descriptionLength",
  "materialsOrComponents",
  "dimensionsAndSizing",
  "variations",
  "setContents",
  "personalizationEnabled",
  "personalizationDetails",
  "vintageDetails",
  "productionPartnerDetails",
  "processingTime",
  "shippingDelivery",
  "returnExchangeNotes",
  "digitalFileDetails",
  "softwareCompatibility",
  "usageLicense",
  "buyerInstructions",
  "priorityKeywords",
  "categoryAttributes",
  "listingFocus",
  "titleVariantCount",
  "shopVoice",
  "requiredTerms",
  "proofAndCredentials",
  "sensitiveCategory",
  "safetyComplianceFacts",
  "restrictionsAndContext",
] as const;

const requiredKeys = [
  "productFormat",
  "sellerRole",
  "productName",
  "productOverview",
  "targetBuyer",
  "keySellingPoints",
  "essentialSpecs",
] as const;

const prompt = readProjectFile("prisma", "template-prompts", "etsy-listing.txt");
const schema = readJson<EtsyListingFormSchema>(
  "src",
  "config",
  "template-forms",
  "etsy-listing-variables.json",
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

test("Etsy Listing prompt is replaced with the approved 36-variable prompt", () => {
  assert.match(prompt, /Etsy marketplace copywriter/);
  assert.match(prompt, /Product format: \{\{productFormat\}\}/);
  assert.match(prompt, /Seller role: \{\{sellerRole\}\}/);
  assert.match(prompt, /Product overview: \{\{productOverview\}\}/);
  assert.match(prompt, /Generate exactly 13 Etsy tag suggestions/);
  assert.match(prompt, /# Etsy Listing Package/);
  assert.match(prompt, /FINAL QUALITY CHECK/);

  assert.doesNotMatch(prompt, /Buyer-friendly Etsy title/);
  assert.doesNotMatch(prompt, /\{\{listingType\}\}/);
  assert.doesNotMatch(prompt, /\{\{buyer\}\}/);
  assert.doesNotMatch(prompt, /\{\{productDescription\}\}/);
  assert.doesNotMatch(prompt, /\{\{itemType\}\}/);
  assert.doesNotMatch(prompt, /\{\{materials\}\}/);
  assert.doesNotMatch(prompt, /\{\{primaryKeyword\}\}/);
  assert.doesNotMatch(prompt, /\{\{brandVoice\}\}/);
  assert.doesNotMatch(prompt, /\{\{language\}\}/);
  assert.doesNotMatch(prompt, /\{\{includedItems\}\}/);
  assert.doesNotMatch(prompt, /\{\{personalizationAvailable\}\}/);
  assert.doesNotMatch(prompt, /\{\{sourceDetails\}\}/);
  assert.doesNotMatch(prompt, /\{\{restrictions\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("Etsy Listing form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "etsy-listing");
  assert.equal(schema.title, "Etsy Listing");
  assert.equal(schema.fieldCount, 36);
  assert.equal(variables.length, 36);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "listingType",
    "buyer",
    "productDescription",
    "itemType",
    "materials",
    "primaryKeyword",
    "brandVoice",
    "language",
    "includedItems",
    "personalizationAvailable",
    "sourceDetails",
    "restrictions",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("Etsy Listing groups and help metadata follow the Standard schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    [
      "essentials",
      "item_details",
      "fulfillment_buyer_information",
      "seo_brand",
      "claims_restrictions",
    ],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 11);
  assert.equal(variables.filter((field) => field.group === "item_details").length, 8);
  assert.equal(
    variables.filter((field) => field.group === "fulfillment_buyer_information")
      .length,
    7,
  );
  assert.equal(variables.filter((field) => field.group === "seo_brand").length, 6);
  assert.equal(
    variables.filter((field) => field.group === "claims_restrictions").length,
    4,
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

test("Etsy Listing options and conditional fields match the specification", () => {
  assert.deepEqual(getField("productFormat").options, [
    "Physical item",
    "Instant digital download",
    "Made-to-order digital item",
  ]);
  assert.deepEqual(getField("sellerRole").options, [
    "Made by seller",
    "Designed by seller",
    "Sourced creative supply",
    "Handpicked vintage item",
  ]);
  assert.deepEqual(getField("tone").options, [
    "Clear and natural",
    "Warm and handmade",
    "Minimal and modern",
    "Playful and friendly",
    "Elegant and refined",
    "Rustic and personal",
    "Technical and precise",
  ]);
  assert.deepEqual(getField("descriptionLength").options, [
    "Auto",
    "Short",
    "Standard",
    "Detailed",
  ]);
  assert.deepEqual(getField("listingFocus").options, [
    "Search-balanced",
    "Benefits-first",
    "Details-first",
    "Gift-focused",
    "Story-led",
    "Minimal",
  ]);
  assert.deepEqual(getField("titleVariantCount").options, ["1", "3", "5"]);

  const personalizationEnabled = getField("personalizationEnabled");
  assert.equal(personalizationEnabled.type, "select");
  assert.deepEqual(personalizationEnabled.options, ["On", "Off"]);
  assert.equal(personalizationEnabled.defaultValue, "Off");

  const sensitiveCategory = getField("sensitiveCategory");
  assert.equal(sensitiveCategory.type, "select");
  assert.deepEqual(sensitiveCategory.options, ["On", "Off"]);
  assert.equal(sensitiveCategory.defaultValue, "Off");

  for (const key of [
    "materialsOrComponents",
    "dimensionsAndSizing",
    "variations",
    "shippingDelivery",
    "returnExchangeNotes",
  ]) {
    const field = getField(key);
    assert.equal(
      isTemplateFieldVisible(field, { productFormat: "Physical item" }),
      true,
      `${key} should show for physical items`,
    );
    assert.equal(
      isTemplateFieldVisible(field, {
        productFormat: "Instant digital download",
      }),
      false,
      `${key} should hide for instant digital downloads`,
    );
  }

  assert.equal(
    isTemplateFieldVisible(getField("processingTime"), {
      productFormat: "Made-to-order digital item",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("processingTime"), {
      productFormat: "Instant digital download",
    }),
    false,
  );

  for (const key of [
    "digitalFileDetails",
    "softwareCompatibility",
    "usageLicense",
  ]) {
    const field = getField(key);
    assert.equal(
      isTemplateFieldVisible(field, {
        productFormat: "Instant digital download",
      }),
      true,
      `${key} should show for instant digital downloads`,
    );
    assert.equal(
      isTemplateFieldVisible(field, { productFormat: "Physical item" }),
      false,
      `${key} should hide for physical items`,
    );
  }

  assert.equal(
    isTemplateFieldVisible(getField("personalizationDetails"), {
      personalizationEnabled: "On",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("personalizationDetails"), {
      personalizationEnabled: "Off",
    }),
    false,
  );
  assert.equal(
    isTemplateFieldVisible(getField("vintageDetails"), {
      sellerRole: "Handpicked vintage item",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("vintageDetails"), {
      sellerRole: "Made by seller",
    }),
    false,
  );

  const productionPartnerDetails = getField("productionPartnerDetails");
  assert.equal(
    isTemplateFieldVisible(productionPartnerDetails, {
      productFormat: "Physical item",
      sellerRole: "Designed by seller",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(productionPartnerDetails, {
      productFormat: "Physical item",
      sellerRole: "Made by seller",
    }),
    false,
  );
  assert.equal(
    isTemplateFieldVisible(productionPartnerDetails, {
      productFormat: "Instant digital download",
      sellerRole: "Designed by seller",
    }),
    false,
  );

  assert.equal(
    isTemplateFieldVisible(getField("safetyComplianceFacts"), {
      sensitiveCategory: "On",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("safetyComplianceFacts"), {
      sensitiveCategory: "Off",
    }),
    false,
  );
});

test("Etsy Listing validation and prompt rendering use form metadata", () => {
  const values = {
    ...buildDefaultValues(variables),
    productFormat: "Physical item",
    sellerRole: "Made by seller",
    productName: "Printable Weekly Meal Planner",
    productOverview:
      "A printable PDF meal-planning bundle with weekly menus, grocery lists, pantry inventory pages, and simple prep notes.",
    targetBuyer:
      "Busy families and home cooks who want a simple weekly planning routine.",
    keySellingPoints:
      "Editable Canva version, US Letter and A4 PDFs, Sunday and Monday start options.",
    essentialSpecs:
      "Digital PDF and Canva template, 12 pages, US Letter and A4 sizes, instant download, no physical item shipped.",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, { ...values, productFormat: "Unknown" }) ??
      "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      productName: "x".repeat(161),
    }) ?? "",
    /160 characters or fewer/,
  );

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b|\bN\/A\b/);
  assert.match(rendered, /Printable Weekly Meal Planner/);
  assert.match(rendered, /Made by seller/);
  assert.match(rendered, /Clear and natural/);
});

test("Etsy Listing catalog and Help integration use the full form", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "etsy-listing");
  assert.ok(item, "Catalog should include Etsy Listing");
  assert.equal(item.title, "Etsy Listing");
  assert.equal(item.category, "ecommerce");
  assert.equal(item.requiredPlan, "pro");
  assert.match(item.description, /title options, description, item details/);
  assert.equal(item.variables.length, 36);
  assert.deepEqual(sorted(item.variables.map((variable) => variable.key)), sorted(expectedKeys));

  const helpButton = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpButton, /ETSY_LISTING_GUIDE_PATH/);
  assert.match(helpButton, /"etsy-listing": ETSY_LISTING_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "etsy-listing",
    "page.tsx",
  );
  assert.match(guidePage, /Etsy Listing - field guide/);
  assert.match(guidePage, /templateSlug="etsy-listing"/);
});
