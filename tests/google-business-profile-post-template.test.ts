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

type GoogleBusinessProfilePostFormSchema = {
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
  }>;
};

const expectedKeys = [
  "businessName",
  "businessType",
  "postType",
  "primaryGoal",
  "keyMessage",
  "locationFocus",
  "targetAudience",
  "ctaType",
  "destinationUrl",
  "outputLanguage",
  "campaignTitle",
  "timingDetails",
  "offerValue",
  "couponCode",
  "termsAndConditions",
  "eventLocation",
  "localContext",
  "brandVoice",
  "tone",
  "wordsToAvoid",
  "variantCount",
  "visualSuggestion",
  "additionalContext",
] as const;

const requiredKeys = [
  "businessName",
  "postType",
  "primaryGoal",
  "keyMessage",
  "campaignTitle",
  "timingDetails",
] as const;

const prompt = readProjectFile(
  "prisma",
  "template-prompts",
  "google-business-profile-post.txt",
);
const schema = readJson<GoogleBusinessProfilePostFormSchema>(
  "src",
  "config",
  "template-forms",
  "google-business-profile-post-variables.json",
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

test("Google Business Profile Post prompt is replaced with the approved 23-variable prompt", () => {
  assert.match(prompt, /senior local-business copywriter/);
  assert.match(prompt, /Business name: \{\{businessName\}\}/);
  assert.match(prompt, /Offer or event title: \{\{campaignTitle\}\}/);
  assert.match(prompt, /Include visual suggestion: \{\{visualSuggestion\}\}/);
  assert.match(prompt, /Return only this package and omit non-applicable sections/);

  assert.doesNotMatch(prompt, /experienced Google Business Profile content strategist/);
  assert.doesNotMatch(prompt, /PROFILE AND BUSINESS INFORMATION/);
  assert.doesNotMatch(prompt, /Internal campaign name: \{\{campaignName\}\}/);
  assert.doesNotMatch(prompt, /Public profile name: \{\{profileName\}\}/);
  assert.doesNotMatch(prompt, /Primary local audience: \{\{audience\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("Google Business Profile Post form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "google-business-profile-post");
  assert.equal(schema.title, "Google Business Profile Post");
  assert.equal(schema.fieldCount, 23);
  assert.equal(variables.length, 23);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "campaignName",
    "profileName",
    "legalBusinessName",
    "profileUrl",
    "websiteUrl",
    "primaryCategory",
    "secondaryCategories",
    "productsServices",
    "topic",
    "primaryObjective",
    "desiredAction",
    "language",
    "targetLocale",
    "audience",
    "selectedCtaButton",
    "characterLimit",
    "publishDate",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("Google Business Profile Post field groups and metadata follow the Compact schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    ["essentials", "offer_event_details", "local_fit_brand", "output_options"],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 10);
  assert.equal(
    variables.filter((field) => field.group === "offer_event_details").length,
    6,
  );
  assert.equal(
    variables.filter((field) => field.group === "local_fit_brand").length,
    4,
  );
  assert.equal(
    variables.filter((field) => field.group === "output_options").length,
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

test("Google Business Profile Post options and technical field adaptations match the specification", () => {
  assert.deepEqual(getField("postType").options, ["Update", "Offer", "Event"]);
  assert.deepEqual(getField("primaryGoal").options, [
    "Announce an update",
    "Promote an offer",
    "Promote an event",
    "Drive bookings",
    "Drive orders or sales",
    "Highlight a service",
    "Educate customers",
    "Share a seasonal reminder",
  ]);
  assert.deepEqual(getField("ctaType").options, [
    "Auto",
    "Learn more",
    "Book",
    "Order online",
    "Buy",
    "Sign up",
    "Call",
    "Get offer",
    "No button",
  ]);

  const destinationUrl = getField("destinationUrl");
  assert.equal(destinationUrl.type, "text");
  assert.equal(destinationUrl.format, "url");
  assert.equal(destinationUrl.maxLength, 500);

  const visualSuggestion = getField("visualSuggestion");
  assert.equal(visualSuggestion.type, "select");
  assert.deepEqual(visualSuggestion.options, ["Yes", "No"]);
  assert.equal(visualSuggestion.defaultValue, "Yes");
});

test("Google Business Profile Post validation enforces required, conditional required, URL, select, and length rules", () => {
  const values = {
    ...buildDefaultValues(variables),
    businessName: "Green Street Dental",
    postType: "Update",
    primaryGoal: "Announce an update",
    keyMessage: "New Saturday appointments are available starting July 20.",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, { ...values, businessName: "" }) ?? "",
    /Business name/,
  );
  assert.match(
    validateVariableValues(variables, { ...values, postType: "Story" }) ?? "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      keyMessage: "x".repeat(1001),
    }) ?? "",
    /1,000 characters|1000 characters/,
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
      postType: "Offer",
      campaignTitle: "",
      timingDetails: "",
    }) ?? "",
    /Offer or event title/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      postType: "Event",
      campaignTitle: "Open house",
      timingDetails: "",
    }) ?? "",
    /Dates, times, and time zone/,
  );
});

test("Google Business Profile Post conditional fields render only when relevant", () => {
  const values = buildDefaultValues(variables);
  const campaignTitle = getField("campaignTitle");
  const timingDetails = getField("timingDetails");
  const offerValue = getField("offerValue");
  const couponCode = getField("couponCode");
  const termsAndConditions = getField("termsAndConditions");
  const eventLocation = getField("eventLocation");

  assert.equal(isTemplateFieldVisible(campaignTitle, values), false);
  assert.equal(isTemplateFieldVisible(timingDetails, values), false);
  assert.equal(isTemplateFieldVisible(offerValue, values), false);
  assert.equal(isTemplateFieldVisible(eventLocation, values), false);

  const offerValues = { ...values, postType: "Offer" };
  assert.equal(isTemplateFieldVisible(campaignTitle, offerValues), true);
  assert.equal(isTemplateFieldVisible(timingDetails, offerValues), true);
  assert.equal(isTemplateFieldVisible(offerValue, offerValues), true);
  assert.equal(isTemplateFieldVisible(couponCode, offerValues), true);
  assert.equal(isTemplateFieldVisible(termsAndConditions, offerValues), true);
  assert.equal(isTemplateFieldVisible(eventLocation, offerValues), false);

  const eventValues = { ...values, postType: "Event" };
  assert.equal(isTemplateFieldVisible(campaignTitle, eventValues), true);
  assert.equal(isTemplateFieldVisible(timingDetails, eventValues), true);
  assert.equal(isTemplateFieldVisible(offerValue, eventValues), false);
  assert.equal(isTemplateFieldVisible(eventLocation, eventValues), true);
});

test("Google Business Profile Post prompt filling does not invent optional field placeholders", () => {
  const values = {
    ...buildDefaultValues(variables),
    businessName: "Green Street Dental",
    postType: "Update",
    primaryGoal: "Announce an update",
    keyMessage: "Saturday appointments are now available for routine checkups.",
    destinationUrl: "",
    campaignTitle: "",
    timingDetails: "",
    offerValue: "",
    eventLocation: "",
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

test("Google Business Profile Post catalog, summary, builder, and Help integration are in sync", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const matches = catalog.filter(
    (item) => item.slug === "google-business-profile-post",
  );
  assert.equal(matches.length, 1);
  const template = matches[0];
  assert.equal(template.title, "Google Business Profile Post");
  assert.equal(
    template.description,
    "Creates a concise local update, offer, or event post with one CTA, structured details, local relevance, and claim-safe wording for Search and Maps.",
  );
  assert.equal(template.category, "google_business");
  assert.equal(template.requiredPlan, "free");
  assert.equal(template.prompt.trim(), prompt.trim());
  assert.equal(template.variables.length, 23);
  assert.deepEqual(
    sorted(template.variables.map((field) => field.key)),
    sorted(expectedKeys),
  );
  assert.equal(
    template.variables.find((field) => field.key === "destinationUrl")?.format,
    "url",
  );
  assert.equal(
    template.variables.find((field) => field.key === "destinationUrl")
      ?.maxLength,
    500,
  );

  const summary = readJson<Array<{ slug: string; vars: number }>>(
    "prisma",
    "templates-summary.json",
  );
  assert.equal(
    summary.find((item) => item.slug === "google-business-profile-post")?.vars,
    23,
  );

  const helpConfig = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(
    helpConfig,
    /"google-business-profile-post": GOOGLE_BUSINESS_PROFILE_POST_GUIDE_PATH/,
  );

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "google-business-profile-post",
    "page.tsx",
  );
  assert.match(guidePage, /templateSlug="google-business-profile-post"/);
  assert.match(guidePage, /googleBusinessProfilePostFormVariables/);
  assert.match(guidePage, /Google Business Profile Post form/);

  const builder = readProjectFile(
    "scripts",
    "build-google-business-profile-post-form.mjs",
  );
  assert.match(builder, /approved 23-field specification/);
  assert.doesNotMatch(builder, /423/);
});
