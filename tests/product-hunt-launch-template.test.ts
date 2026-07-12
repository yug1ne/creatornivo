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

type ProductHuntLaunchFormSchema = {
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
  "productName",
  "productUrl",
  "productSummary",
  "targetAudience",
  "coreProblem",
  "keyOutcome",
  "pricingType",
  "productType",
  "launchGoal",
  "outputLanguage",
  "keyFeatures",
  "mainUseCases",
  "differentiation",
  "proofPoints",
  "availability",
  "productStatus",
  "competitorContext",
  "makerNames",
  "makerStory",
  "buildJourney",
  "feedbackRequest",
  "tone",
  "promoAvailable",
  "promoDetails",
  "launchTags",
  "galleryPlan",
  "demoVideoUrl",
  "ctaFocus",
  "regulatedArea",
  "jurisdiction",
  "variantCount",
  "additionalRequirements",
] as const;

const requiredKeys = [
  "productName",
  "productUrl",
  "productSummary",
  "targetAudience",
  "coreProblem",
  "keyOutcome",
  "pricingType",
] as const;

const prompt = readProjectFile(
  "prisma",
  "template-prompts",
  "product-hunt-launch.txt",
);
const schema = readJson<ProductHuntLaunchFormSchema>(
  "src",
  "config",
  "template-forms",
  "product-hunt-launch-variables.json",
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

test("Product Hunt Launch prompt is replaced with the approved 32-variable prompt", () => {
  assert.match(prompt, /Product Hunt launch copywriter/);
  assert.match(prompt, /Product URL: \{\{productUrl\}\}/);
  assert.match(prompt, /Core problem: \{\{coreProblem\}\}/);
  assert.match(prompt, /Promo available: \{\{promoAvailable\}\}/);
  assert.match(prompt, /ensure the first maker comment sounds human and specific/);

  assert.doesNotMatch(prompt, /experienced Product Hunt launch copywriter/);
  assert.doesNotMatch(prompt, /PRODUCT INFORMATION/);
  assert.doesNotMatch(prompt, /\{\{productCategory\}\}/);
  assert.doesNotMatch(prompt, /\{\{productDescription\}\}/);
  assert.doesNotMatch(prompt, /\{\{audience\}\}/);
  assert.doesNotMatch(prompt, /\{\{primaryBenefit\}\}/);
  assert.doesNotMatch(prompt, /\{\{launchOffer\}\}/);
  assert.doesNotMatch(prompt, /\{\{makerName\}\}/);
  assert.doesNotMatch(prompt, /\{\{sourceDetails\}\}/);
  assert.doesNotMatch(prompt, /\{\{roadmap\}\}/);
  assert.doesNotMatch(prompt, /\{\{restrictions\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("Product Hunt Launch form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "product-hunt-launch");
  assert.equal(schema.title, "Product Hunt Launch");
  assert.equal(schema.fieldCount, 32);
  assert.equal(variables.length, 32);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "productCategory",
    "productDescription",
    "audience",
    "primaryUseCase",
    "painPoint",
    "primaryBenefit",
    "features",
    "differentiator",
    "alternatives",
    "limitations",
    "language",
    "launchStatus",
    "pricingStatus",
    "pricingDetails",
    "freePlanOrTrial",
    "launchOffer",
    "promoCode",
    "promoExpiration",
    "offerTerms",
    "makerName",
    "makerRole",
    "coMakers",
    "sourceDetails",
    "verifiedUserCount",
    "approvedQuotes",
    "galleryAssets",
    "screenshots",
    "demoVideo",
    "desiredAction",
    "roadmap",
    "restrictions",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("Product Hunt Launch groups and help metadata follow the Standard schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    [
      "essentials",
      "positioning_evidence",
      "maker_story_offer",
      "launch_assets_controls",
    ],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 10);
  assert.equal(
    variables.filter((field) => field.group === "positioning_evidence").length,
    7,
  );
  assert.equal(
    variables.filter((field) => field.group === "maker_story_offer").length,
    7,
  );
  assert.equal(
    variables.filter((field) => field.group === "launch_assets_controls").length,
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

test("Product Hunt Launch conditions, validation, and technical adaptations match the specification", () => {
  assert.deepEqual(getField("pricingType").options, [
    "Free",
    "Freemium",
    "Paid",
    "Paid with free trial",
    "Open source",
    "Custom pricing",
  ]);
  assert.deepEqual(getField("productType").options, [
    "Auto",
    "SaaS or web app",
    "Mobile app",
    "Desktop app",
    "Browser extension",
    "Developer tool or API",
    "Hardware",
    "Marketplace or community",
    "Other",
  ]);
  assert.deepEqual(getField("variantCount").options, ["1", "3", "5"]);

  const productUrl = getField("productUrl");
  assert.equal(productUrl.type, "text");
  assert.equal(productUrl.format, "url");

  const demoVideoUrl = getField("demoVideoUrl");
  assert.equal(demoVideoUrl.type, "text");
  assert.equal(demoVideoUrl.format, "url");

  const promoAvailable = getField("promoAvailable");
  assert.equal(promoAvailable.type, "select");
  assert.deepEqual(promoAvailable.options, ["On", "Off"]);
  assert.equal(promoAvailable.defaultValue, "Off");

  const promoDetails = getField("promoDetails");
  assert.equal(isTemplateFieldVisible(promoDetails, { promoAvailable: "On" }), true);
  assert.equal(isTemplateFieldVisible(promoDetails, { promoAvailable: "Off" }), false);

  const jurisdiction = getField("jurisdiction");
  assert.equal(
    isTemplateFieldVisible(jurisdiction, { regulatedArea: "Legal" }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(jurisdiction, { regulatedArea: "None" }),
    false,
  );
});

test("Product Hunt Launch validation and prompt rendering use form metadata", () => {
  const values = {
    ...buildDefaultValues(variables),
    productName: "Creatornivo",
    productUrl: "https://www.creatornivo.com",
    productSummary:
      "A structured AI workspace that helps creators turn briefs into platform-ready content.",
    targetAudience: "Solo founders, marketers, and creators publishing weekly.",
    coreProblem:
      "Blank-page friction and inconsistent prompting slow down content production.",
    keyOutcome: "Create more consistent first drafts without rebuilding every prompt.",
    pricingType: "Freemium",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, { ...values, productUrl: "not a url" }) ?? "",
    /valid URL/,
  );
  assert.match(
    validateVariableValues(variables, { ...values, pricingType: "Unknown" }) ?? "",
    /available options/,
  );

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b|\bN\/A\b/);
  assert.match(rendered, /Creatornivo/);
  assert.match(rendered, /https:\/\/www\.creatornivo\.com/);
});

test("Product Hunt Launch catalog and Help integration use the full form", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "product-hunt-launch");
  assert.ok(item, "Catalog should include Product Hunt Launch");
  assert.equal(item.title, "Product Hunt Launch");
  assert.equal(item.category, "product_launch");
  assert.equal(item.requiredPlan, "pro");
  assert.match(item.description, /Product Hunt messaging/);
  assert.equal(item.variables.length, 32);
  assert.deepEqual(sorted(item.variables.map((variable) => variable.key)), sorted(expectedKeys));

  const helpButton = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpButton, /PRODUCT_HUNT_LAUNCH_GUIDE_PATH/);
  assert.match(helpButton, /"product-hunt-launch": PRODUCT_HUNT_LAUNCH_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "product-hunt-launch",
    "page.tsx",
  );
  assert.match(guidePage, /Product Hunt Launch - field guide/);
  assert.match(guidePage, /templateSlug="product-hunt-launch"/);
});
