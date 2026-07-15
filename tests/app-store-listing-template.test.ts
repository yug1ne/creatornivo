import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { assertGeneratedOutputQuality } from "../src/lib/templates/generation-qa";
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

type AppStoreListingFormSchema = {
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
  "platformTarget",
  "appName",
  "appCategory",
  "appSummary",
  "targetAudience",
  "coreFeatures",
  "keyBenefits",
  "primaryGoal",
  "monetizationModel",
  "listingStage",
  "outputLanguage",
  "userProblem",
  "differentiators",
  "competitorContext",
  "brandVoice",
  "targetRegions",
  "featureDetails",
  "pricingDetails",
  "supportedDevices",
  "usageRequirements",
  "proofCredentials",
  "dataPrivacyNotes",
  "visualAssetsContext",
  "keywordThemes",
  "keywordsToAvoid",
  "promotionalFocus",
  "existingListing",
  "versionNumber",
  "releaseChanges",
  "sensitiveCategory",
  "ageAudience",
  "claimsRestrictions",
  "outputModules",
  "additionalRequirements",
] as const;

const requiredKeys = [
  "platformTarget",
  "appName",
  "appSummary",
  "targetAudience",
  "coreFeatures",
  "keyBenefits",
  "outputLanguage",
] as const;

const prompt = readProjectFile("prisma", "template-prompts", "app-store-listing.txt");
const schema = readJson<AppStoreListingFormSchema>(
  "src",
  "config",
  "template-forms",
  "app-store-listing-variables.json",
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

test("App Store Listing prompt is replaced with the approved 34-variable prompt", () => {
  assert.match(prompt, /senior app-store copywriter/);
  assert.match(prompt, /Adapt it to \{\{platformTarget\}\}/);
  assert.match(prompt, /App: \{\{appName\}\}/);
  assert.match(prompt, /Supported devices: \{\{supportedDevices\}\}/);
  assert.match(prompt, /Requested modules: \{\{outputModules\}\}/);
  assert.match(prompt, /Output only the completed listing package/);

  assert.doesNotMatch(prompt, /experienced Apple App Store Optimization strategist/);
  assert.doesNotMatch(prompt, /APP INFORMATION/);
  assert.doesNotMatch(prompt, /\{\{appNameStatus\}\}/);
  assert.doesNotMatch(prompt, /\{\{secondaryCategory\}\}/);
  assert.doesNotMatch(prompt, /\{\{appDescription\}\}/);
  assert.doesNotMatch(prompt, /\{\{audience\}\}/);
  assert.doesNotMatch(prompt, /\{\{mainBenefit\}\}/);
  assert.doesNotMatch(prompt, /\{\{language\}\}/);
  assert.doesNotMatch(prompt, /\{\{targetLocale\}\}/);
  assert.doesNotMatch(prompt, /\{\{primaryKeywords\}\}/);
  assert.doesNotMatch(prompt, /\{\{pricingModel\}\}/);
  assert.doesNotMatch(prompt, /\{\{releaseStage\}\}/);
  assert.doesNotMatch(prompt, /\{\{restrictions\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("App Store Listing form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "app-store-listing");
  assert.equal(schema.title, "App Store Listing");
  assert.equal(schema.fieldCount, 34);
  assert.equal(variables.length, 34);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "appNameStatus",
    "secondaryCategory",
    "appType",
    "appDescription",
    "primaryUseCase",
    "audience",
    "knowledgeLevel",
    "painPoint",
    "mainBenefit",
    "desiredOutcome",
    "features",
    "differentiator",
    "alternatives",
    "limitations",
    "releaseStage",
    "updateDetails",
    "bugFixes",
    "performanceImprovements",
    "pricingModel",
    "freeFeatures",
    "paidFeatures",
    "subscriptionDetails",
    "trialDetails",
    "inAppPurchases",
    "purchaseConditions",
    "language",
    "targetLocale",
    "targetMarket",
    "primaryKeywords",
    "secondaryKeywords",
    "sourceDetails",
    "approvedAwards",
    "privacyDetails",
    "regulatedClaims",
    "restrictions",
    "screenshotAssets",
    "interfaceScreens",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("App Store Listing groups and help metadata follow the Standard schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    [
      "essentials",
      "audience_positioning",
      "product_trust_details",
      "discovery_visuals_release",
      "compliance_output",
    ],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 11);
  assert.equal(
    variables.filter((field) => field.group === "audience_positioning").length,
    5,
  );
  assert.equal(
    variables.filter((field) => field.group === "product_trust_details").length,
    7,
  );
  assert.equal(
    variables.filter((field) => field.group === "discovery_visuals_release").length,
    6,
  );
  assert.equal(
    variables.filter((field) => field.group === "compliance_output").length,
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

test("App Store Listing options, conditions, and technical adaptations match the specification", () => {
  assert.deepEqual(getField("platformTarget").options, [
    "Apple App Store",
    "Google Play",
    "Both",
  ]);
  assert.deepEqual(getField("monetizationModel").options, [
    "Auto",
    "Free",
    "Paid upfront",
    "Freemium",
    "Subscription",
    "In-app purchases",
    "Ad-supported",
    "Mixed",
  ]);
  assert.deepEqual(getField("outputModules").options, [
    "Core listing copy",
    "Keyword suggestions",
    "Screenshot messages",
    "Promotional text",
    "Release notes",
    "Review report",
  ]);

  const supportedDevices = getField("supportedDevices");
  assert.equal(supportedDevices.type, "textarea");
  assert.deepEqual(supportedDevices.options, [
    "Auto",
    "iPhone",
    "iPad",
    "Mac",
    "Apple Watch",
    "Apple TV",
    "Apple Vision",
    "Android phone",
    "Android tablet",
    "Wear OS",
  ]);

  const outputModules = getField("outputModules");
  assert.equal(outputModules.type, "textarea");
  assert.equal(
    outputModules.defaultValue,
    "Core listing copy, Keyword suggestions, Screenshot messages, Review report",
  );

  const visualAssetsContext = getField("visualAssetsContext");
  assert.equal(
    isTemplateFieldVisible(visualAssetsContext, {
      outputModules: "Core listing copy, Screenshot messages",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(visualAssetsContext, {
      outputModules: "Core listing copy, Keyword suggestions",
    }),
    false,
  );

  const promotionalFocus = getField("promotionalFocus");
  assert.equal(
    isTemplateFieldVisible(promotionalFocus, {
      outputModules: "Core listing copy, Promotional text",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(promotionalFocus, {
      outputModules: "Core listing copy, Review report",
    }),
    false,
  );

  const existingListing = getField("existingListing");
  assert.equal(
    isTemplateFieldVisible(existingListing, {
      listingStage: "Existing listing refresh",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(existingListing, { listingStage: "Version update" }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(existingListing, { listingStage: "New launch" }),
    false,
  );

  const versionNumber = getField("versionNumber");
  const releaseChanges = getField("releaseChanges");
  assert.equal(
    isTemplateFieldVisible(versionNumber, { listingStage: "Version update" }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(releaseChanges, { listingStage: "Version update" }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(versionNumber, { listingStage: "New launch" }),
    false,
  );
});

test("App Store Listing validation and prompt rendering use form metadata", () => {
  const values = {
    ...buildDefaultValues(variables),
    platformTarget: "Apple App Store",
    appName: "Creatornivo",
    appSummary:
      "A structured AI content workspace that turns briefs into platform-ready drafts.",
    targetAudience: "Solo founders and creators who publish content every week.",
    coreFeatures:
      "Template library, saved prompts, personal content library, Markdown export.",
    keyBenefits:
      "Create consistent first drafts without rebuilding every prompt from scratch.",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, { ...values, platformTarget: "Unknown" }) ?? "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      appName: "x".repeat(81),
    }) ?? "",
    /80 characters or fewer/,
  );

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b|\bN\/A\b/);
  assert.match(rendered, /Creatornivo/);
  assert.match(rendered, /Apple App Store/);
});

test("App Store Listing hard-excludes claim restrictions and invent bans for rankings", () => {
  assert.match(prompt, /USER AVOID \/ CLAIM RESTRICTIONS — HARD EXCLUSIONS/);
  assert.match(
    prompt,
    /Treat \{\{keywordsToAvoid\}\}, \{\{claimsRestrictions\}\}, and \{\{additionalRequirements\}\} as HARD EXCLUSIONS/,
  );
  assert.match(
    prompt,
    /Do not soften this as “respect,” “consider,” “try to avoid,” or “where possible\.”/,
  );
  assert.match(
    prompt,
    /Exact prohibited words and phrases from those fields must not appear anywhere in the generated package/,
  );
  assert.match(prompt, /Apple App Store output/);
  assert.match(prompt, /Google Play output/);
  assert.match(prompt, /screenshot messages/);
  assert.match(prompt, /keyword and search-theme lists/);
  assert.match(prompt, /verification, review, compliance, and developer-facing notes/);
  assert.match(
    prompt,
    /Matching is case-insensitive: if “streamline” or “transform” is prohibited/,
  );
  assert.match(
    prompt,
    /if “streamline” is prohibited, do not write “streamlined” or “streamlining”/,
  );
  assert.match(
    prompt,
    /Do not repeat prohibited phrases in notes, review sections, examples, metadata, screenshot copy/,
  );
  assert.match(
    prompt,
    /Enforce \{\{keywordsToAvoid\}\} as hard exclusions \(exact phrases and close banned variants\)/,
  );
  assert.match(
    prompt,
    /Do not invent “#1 app,” “top-rated,” “best app,” “editor’s choice,” store approval/,
  );
  assert.match(
    prompt,
    /Do not fabricate or imply ratings, reviews, testimonials, awards, rankings, downloads/,
  );
  assert.match(prompt, /no invented downloads, rankings, ratings, awards, Apple endorsement/);
  assert.match(prompt, /None \/ N\/A \/ Not provided-only headings/);
  assert.doesNotMatch(
    prompt,
    /Respect claimsRestrictions and keywordsToAvoid/,
  );
});

test("App Store Listing bans streamline/transform hype and requires functional alternatives", () => {
  assert.match(
    prompt,
    /do not use default app-store hype such as unlock, elevate, revolutionary, game-changing, seamless, seamlessly, effortlessly, streamline, streamlined, streamlining, transform, transformed, transforming, boost, increase, guaranteed/,
  );
  assert.match(
    prompt,
    /Prefer plain functional verbs: create, organize, draft, save, export, choose, edit, manage, support, plan, review, and keep in one place/,
  );
  assert.match(prompt, /Bad: “Transform how you plan and create content\.”/);
  assert.match(prompt, /Good: “Plan and draft content with reusable structures\.”/);
  assert.match(prompt, /Bad: “Streamline your drafting process\.”/);
  assert.match(prompt, /Good: “Organize drafting steps and keep notes in one place\.”/);

  // Contract: hard exclusions apply across Apple/Google descriptions, screenshots, notes.
  assert.match(
    prompt,
    /no exact prohibited words\/phrases \(any capitalization\) and no close banned variants appear in Apple output, Google Play output, promotional text, descriptions, keywords\/search themes, screenshot messages, release notes, verification\/review notes/,
  );

  // Static anti-contract: these banned stems must be instructed as exclusions, not as recommended copy.
  assert.match(prompt, /\bstreamline\b/i);
  assert.match(prompt, /\btransform\b/i);
  assert.doesNotMatch(
    prompt,
    /recommend[^\n]{0,40}\bstreamline\b/i,
  );
  assert.doesNotMatch(
    prompt,
    /use phrases such as “streamline”/i,
  );
});

test("App Store Listing restriction fields hard-fail extracted streamline/transform in sample package text", () => {
  const variables = parseTemplateVariables(schema.variables);
  const values = {
    keywordsToAvoid: "streamline, transform",
    claimsRestrictions:
      "Do not use the phrases: streamline, transform, effortlessly.",
    additionalRequirements: "Keep copy plain and functional.",
  };

  const forbidden = ["streamline", "transform", "effortlessly"];
  for (const phrase of forbidden) {
    for (const sample of [
      `Short description: Transform how you plan and create content.`,
      `Full description: Streamline your drafting process with reusable templates.`,
      `Screenshot 1: Transform Ideas into Structured Content`,
      `Review note: Removed claim that used streamline language.`,
      `Apple description: Streamline weekly planning.`,
      `Google Play description: Transform your content workflow.`,
    ]) {
      if (!new RegExp(`\\b${phrase}\\b`, "i").test(sample)) continue;
      const result = assertGeneratedOutputQuality(sample, {
        variables,
        values,
      });
      assert.equal(
        result.ok,
        false,
        `expected hard fail for "${phrase}" in: ${sample}`,
      );
      assert.ok(
        result.hardFailures.some(
          (issue) =>
            issue.code === "user_prohibited_phrase" &&
            issue.match.toLowerCase() === phrase,
        ),
        `missing user_prohibited_phrase for ${phrase} in: ${sample}`,
      );
    }
  }

  const clean = assertGeneratedOutputQuality(
    [
      "Short description: Plan and draft content with reusable structures.",
      "Full description: Organize drafting steps and keep notes in one place.",
      "Screenshot 1: Turn Ideas into Structured Content",
      "Review note: Softened unsupported superiority language.",
    ].join("\n"),
    { variables, values },
  );
  assert.equal(clean.ok, true);
  assert.doesNotMatch(clean.warnings.map((w) => w.match).join(" "), /streamline|transform/i);
});

test("App Store Listing catalog stays synced and Help integration uses the full form", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "app-store-listing");
  assert.ok(item, "Catalog should include App Store Listing");
  assert.equal(item.title, "App Store Listing");
  assert.equal(item.category, "ecommerce");
  assert.equal(item.requiredPlan, "pro");
  assert.match(item.description, /Apple App Store and Google Play listing copy/);
  assert.equal(item.variables.length, 34);
  assert.deepEqual(sorted(item.variables.map((variable) => variable.key)), sorted(expectedKeys));
  assert.equal(item.prompt.trim(), prompt.trim());

  const helpButton = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpButton, /APP_STORE_LISTING_GUIDE_PATH/);
  assert.match(helpButton, /"app-store-listing": APP_STORE_LISTING_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "app-store-listing",
    "page.tsx",
  );
  assert.match(guidePage, /App Store Listing - field guide/);
  assert.match(guidePage, /templateSlug="app-store-listing"/);
});
