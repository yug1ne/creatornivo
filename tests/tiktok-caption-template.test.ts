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

type TikTokCaptionFormSchema = {
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
  variables: unknown[];
};

const expectedKeys = [
  "videoTopic",
  "videoSummary",
  "videoFormat",
  "primaryGoal",
  "targetAudience",
  "keyMessage",
  "outputLanguage",
  "captionLength",
  "variantCount",
  "contentRelationship",
  "tone",
  "openingStyle",
  "ctaType",
  "ctaDetails",
  "emojiLevel",
  "offerDetails",
  "disclosureText",
  "includeOnScreenHook",
  "hashtagMode",
  "hashtagCount",
  "hashtagKeywords",
  "factsAndClaims",
  "privacyRestrictions",
  "additionalRequirements",
] as const;

const requiredKeys = [
  "videoTopic",
  "videoSummary",
  "primaryGoal",
  "targetAudience",
  "keyMessage",
] as const;

const prompt = readProjectFile("prisma", "template-prompts", "tiktok-caption.txt");
const schema = readJson<TikTokCaptionFormSchema>(
  "src",
  "config",
  "template-forms",
  "tiktok-caption-variables.json",
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

test("TikTok Caption prompt is replaced with the approved 24-variable prompt", () => {
  assert.match(prompt, /TikTok caption writer, short-form editor and content-safety reviewer/);
  assert.match(prompt, /Video topic: \{\{videoTopic\}\}/);
  assert.match(prompt, /Disclosure wording: \{\{disclosureText\}\}/);
  assert.match(prompt, /Output only this package in \{\{outputLanguage\}\}/);
  assert.match(prompt, /FINAL CHECK/);

  assert.doesNotMatch(prompt, /experienced TikTok caption writer/);
  assert.doesNotMatch(prompt, /CONTENT DETAILS/);
  assert.doesNotMatch(prompt, /OPENING HOOKS/);
  assert.doesNotMatch(prompt, /ON-SCREEN TEXT IDEAS/);
  assert.doesNotMatch(prompt, /\{\{topic\}\}/);
  assert.doesNotMatch(prompt, /\{\{goal\}\}/);
  assert.doesNotMatch(prompt, /\{\{audience\}\}/);
  assert.doesNotMatch(prompt, /\{\{mainMessage\}\}/);
  assert.doesNotMatch(prompt, /\{\{desiredAction\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("TikTok Caption keeps planning copy casual without generic productivity slogans", () => {
  assert.match(prompt, /For planning, productivity, and workflow topics/);
  assert.match(prompt, /streamline the process/);
  assert.match(prompt, /Plan smarter, not harder/);
  assert.match(prompt, /keep ideas, hooks, CTAs, and notes in one place/);
  assert.match(prompt, /make planning feel more organized/);
  assert.match(prompt, /reduce scattered planning/);
  assert.match(prompt, /caption work with the video/);
});

test("TikTok Caption form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "tiktok-caption");
  assert.equal(schema.title, "TikTok Caption");
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
    "audience",
    "goal",
    "mainMessage",
    "desiredAction",
    "creatorRole",
    "brandVoice",
    "language",
    "videoContext",
    "sourceDetails",
    "personalExperience",
    "restrictions",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("TikTok Caption field groups and metadata follow the Compact schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    ["essentials", "voice_conversion", "discovery_safeguards"],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 10);
  assert.equal(
    variables.filter((field) => field.group === "voice_conversion").length,
    7,
  );
  assert.equal(
    variables.filter((field) => field.group === "discovery_safeguards").length,
    7,
  );

  for (const field of variables) {
    assert.ok(field.label, `${field.key} needs a label`);
    assert.ok(field.placeholder, `${field.key} needs a placeholder`);
    assert.ok(field.hint, `${field.key} needs helper text`);
    assert.ok(field.help?.what, `${field.key} needs help.what`);
    assert.ok(field.help?.why, `${field.key} needs help.why`);
    assert.ok(field.help?.example, `${field.key} needs help.example`);
    assert.ok(field.help?.avoid, `${field.key} needs help.avoid`);
    assert.match(field.type ?? "text", /^(text|textarea|select)$/);
  }
});

test("TikTok Caption options and technical field adaptations match the specification", () => {
  assert.deepEqual(getField("videoFormat").options, [
    "Auto",
    "Talking head",
    "Tutorial / how-to",
    "Storytime",
    "Product demo",
    "Before-and-after",
    "Behind the scenes",
    "Trend / reaction",
    "List / tips",
    "Vlog / lifestyle",
  ]);
  assert.deepEqual(getField("primaryGoal").options, [
    "Awareness",
    "Engagement",
    "Education",
    "Community",
    "Traffic",
    "Conversion",
    "Personal expression",
  ]);
  assert.deepEqual(getField("contentRelationship").options, [
    "Organic / no promotion",
    "Own product or service",
    "Sponsored brand partnership",
    "Affiliate content",
    "Paid ad or Spark Ad",
  ]);
  assert.deepEqual(getField("ctaType").options, [
    "Auto",
    "None",
    "Comment",
    "Follow",
    "Save",
    "Share",
    "Visit profile",
    "Visit link / shop",
    "Buy / book",
  ]);

  const includeOnScreenHook = getField("includeOnScreenHook");
  assert.equal(includeOnScreenHook.type, "select");
  assert.deepEqual(includeOnScreenHook.options, ["Enabled", "Disabled"]);
  assert.equal(includeOnScreenHook.defaultValue, "Enabled");

  assert.deepEqual(getField("variantCount").options, ["1", "3", "5"]);
  assert.equal(getField("variantCount").defaultValue, "3");
  assert.deepEqual(getField("hashtagCount").options, ["1–2", "3–5", "6–8"]);
  assert.equal(getField("videoTopic").maxLength, 160);
  assert.equal(getField("videoSummary").maxLength, 1000);
});

test("TikTok Caption validation enforces required, select, and length rules", () => {
  const values = {
    ...buildDefaultValues(variables),
    videoTopic: "Three editing mistakes beginners make",
    videoSummary: "A creator shows three common jump cut and caption timing mistakes.",
    primaryGoal: "Engagement",
    targetAudience: "Freelance designers learning short-form video",
    keyMessage: "Clear editing choices matter more than over-polished effects.",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, { ...values, videoSummary: "" }) ?? "",
    /What happens in the video\?/,
  );
  assert.match(
    validateVariableValues(variables, { ...values, primaryGoal: "Viral reach" }) ?? "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      videoTopic: "x".repeat(161),
    }) ?? "",
    /160 characters or fewer/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      hashtagMode: "Custom only",
      hashtagKeywords: "x".repeat(501),
    }) ?? "",
    /500 characters or fewer/,
  );
});

test("TikTok Caption conditional fields render only when relevant", () => {
  const values = buildDefaultValues(variables);
  const ctaDetails = getField("ctaDetails");
  const offerDetails = getField("offerDetails");
  const disclosureText = getField("disclosureText");
  const hashtagCount = getField("hashtagCount");
  const hashtagKeywords = getField("hashtagKeywords");

  assert.equal(isTemplateFieldVisible(ctaDetails, values), false);
  assert.equal(
    isTemplateFieldVisible(ctaDetails, { ...values, ctaType: "Comment" }),
    true,
  );

  assert.equal(isTemplateFieldVisible(offerDetails, values), false);
  assert.equal(
    isTemplateFieldVisible(offerDetails, {
      ...values,
      contentRelationship: "Own product or service",
    }),
    true,
  );

  assert.equal(isTemplateFieldVisible(disclosureText, values), false);
  assert.equal(
    isTemplateFieldVisible(disclosureText, {
      ...values,
      contentRelationship: "Sponsored brand partnership",
    }),
    true,
  );

  assert.equal(isTemplateFieldVisible(hashtagCount, values), true);
  assert.equal(
    isTemplateFieldVisible(hashtagCount, { ...values, hashtagMode: "None" }),
    false,
  );

  assert.equal(isTemplateFieldVisible(hashtagKeywords, values), false);
  assert.equal(
    isTemplateFieldVisible(hashtagKeywords, {
      ...values,
      hashtagMode: "Brand + niche",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(hashtagKeywords, {
      ...values,
      hashtagMode: "Custom only",
    }),
    true,
  );
});

test("TikTok Caption prompt filling leaves no unresolved placeholders", () => {
  const values = {
    ...buildDefaultValues(variables),
    videoTopic: "Three editing mistakes beginners make",
    videoSummary: "A creator shows three common jump cut and caption timing mistakes.",
    targetAudience: "Freelance designers learning short-form video",
    keyMessage: "Clear editing choices matter more than over-polished effects.",
    ctaDetails: "",
    offerDetails: "",
    disclosureText: "",
    hashtagKeywords: "",
    factsAndClaims: "",
    privacyRestrictions: "",
  };
  const filled = fillPromptTemplate(prompt, values);

  assert.doesNotMatch(filled, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(filled, /\bundefined\b/i);
  assert.doesNotMatch(filled, /\bnull\b/i);
  assert.doesNotMatch(filled, /\bN\/A\b/i);
});

test("TikTok Caption catalog, summary, builder, and Help integration are in sync", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const template = catalog.find((item) => item.slug === "tiktok-caption");
  assert.ok(template);
  assert.equal(template.title, "TikTok Caption");
  assert.equal(
    template.description,
    "Generate concise, platform-native TikTok captions with optional hooks, CTAs, hashtags, promotional disclosures, and multiple variants.",
  );
  assert.equal(template.category, "tiktok");
  assert.equal(template.requiredPlan, "free");
  assert.equal(template.prompt.trim(), prompt.trim());
  assert.equal(template.variables.length, 24);
  assert.deepEqual(
    sorted(template.variables.map((field) => (field as { key: string }).key)),
    sorted(expectedKeys),
  );

  const summary = readJson<Array<{ slug: string; vars: number }>>(
    "prisma",
    "templates-summary.json",
  );
  assert.equal(summary.find((item) => item.slug === "tiktok-caption")?.vars, 24);

  const helpConfig = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpConfig, /"tiktok-caption": TIKTOK_CAPTION_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "tiktok-caption",
    "page.tsx",
  );
  assert.match(guidePage, /templateSlug="tiktok-caption"/);
  assert.match(guidePage, /tiktokCaptionFormVariables/);
  assert.match(guidePage, /tiktokCaptionFormGroups/);

  const builder = readProjectFile("scripts", "build-tiktok-caption-form.mjs");
  assert.match(builder, /approved 24-field specification/);
  assert.doesNotMatch(builder, /CONTENT DETAILS/);
});
