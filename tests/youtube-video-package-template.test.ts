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

type YouTubeVideoPackageFormSchema = {
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
  "primaryGoal",
  "targetAudience",
  "keyMessage",
  "essentialFacts",
  "videoFormat",
  "scriptDepth",
  "targetDuration",
  "outputLanguage",
  "toneStyle",
  "channelContext",
  "primaryCTA",
  "viewerProblem",
  "openingDirection",
  "mustInclude",
  "mustAvoid",
  "sourceMaterial",
  "storyExamples",
  "retentionStyle",
  "searchIntent",
  "targetKeywords",
  "titleAngle",
  "titleVariantCount",
  "thumbnailStyle",
  "packagingRestrictions",
  "descriptionLinks",
  "channelName",
  "brandVoice",
  "presenterStyle",
  "filmingResources",
  "visualAssets",
  "editingComplexity",
  "chapterMode",
  "commercialRelationship",
  "promotionDetails",
  "disclosureText",
  "regulatedContext",
  "jurisdiction",
  "privacyRestrictions",
  "additionalRequirements",
] as const;

const requiredKeys = [
  "videoTopic",
  "primaryGoal",
  "targetAudience",
  "keyMessage",
  "essentialFacts",
  "videoFormat",
  "scriptDepth",
  "targetDuration",
] as const;

const prompt = readProjectFile(
  "prisma",
  "template-prompts",
  "youtube-video-package.txt",
);
const schema = readJson<YouTubeVideoPackageFormSchema>(
  "src",
  "config",
  "template-forms",
  "youtube-video-package-variables.json",
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

test("YouTube Video Package prompt is replaced with the approved 40-variable prompt", () => {
  assert.match(prompt, /senior YouTube content strategist/);
  assert.match(prompt, /Video topic, offer, or subject: \{\{videoTopic\}\}/);
  assert.match(prompt, /Commercial relationship: \{\{commercialRelationship\}\}/);
  assert.match(prompt, /OUTPUT FORMAT/);
  assert.match(prompt, /Claim and Publishing Check/);

  assert.doesNotMatch(prompt, /experienced YouTube packaging strategist/);
  assert.doesNotMatch(prompt, /Create a complete YouTube video package using the information below/);
  assert.doesNotMatch(prompt, /PACKAGING CONTEXT/);
  assert.doesNotMatch(prompt, /\{\{topic\}\}/);
  assert.doesNotMatch(prompt, /\{\{duration\}\}/);
  assert.doesNotMatch(prompt, /\{\{mainMessage\}\}/);
  assert.doesNotMatch(prompt, /\{\{mainPromise\}\}/);
  assert.doesNotMatch(prompt, /\{\{sourceDetails\}\}/);
  assert.doesNotMatch(prompt, /\{\{restrictions\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("YouTube Video Package form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "youtube-video-package");
  assert.equal(schema.title, "YouTube Video Package");
  assert.equal(schema.fieldCount, 40);
  assert.equal(variables.length, 40);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "topic",
    "audience",
    "mainMessage",
    "mainPromise",
    "duration",
    "goal",
    "desiredAction",
    "sourceDetails",
    "restrictions",
    "approvedLinks",
    "thumbnailAssets",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("YouTube Video Package groups and metadata follow the Complex schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    [
      "essentials",
      "content_retention",
      "discovery_packaging",
      "channel_brand_production",
      "monetization_safety_final",
    ],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 12);
  assert.equal(
    variables.filter((field) => field.group === "content_retention").length,
    7,
  );
  assert.equal(
    variables.filter((field) => field.group === "discovery_packaging").length,
    7,
  );
  assert.equal(
    variables.filter((field) => field.group === "channel_brand_production").length,
    7,
  );
  assert.equal(
    variables.filter((field) => field.group === "monetization_safety_final").length,
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
    assert.match(field.type ?? "text", /^(text|textarea|select|number)$/);
  }
});

test("YouTube Video Package options and technical field adaptations match the specification", () => {
  assert.deepEqual(getField("primaryGoal").options, [
    "Educate or explain",
    "Attract search traffic",
    "Build authority",
    "Increase engagement",
    "Generate leads or sales",
    "Launch or announce",
    "Entertain or tell a story",
    "Support existing customers",
  ]);
  assert.deepEqual(getField("scriptDepth").options, [
    "Full script",
    "Detailed outline",
    "Hybrid script + talking points",
  ]);
  assert.deepEqual(getField("targetDuration").options, [
    "Under 3 minutes",
    "3–5 minutes",
    "5–8 minutes",
    "8–12 minutes",
    "12–20 minutes",
    "20–30 minutes",
    "30–45 minutes",
    "More than 45 minutes",
  ]);

  const titleVariantCount = getField("titleVariantCount");
  assert.equal(titleVariantCount.type, "number");
  assert.equal(titleVariantCount.defaultValue, "5");
  assert.equal(titleVariantCount.min, 3);
  assert.equal(titleVariantCount.max, 10);

  const titleAngle = getField("titleAngle");
  assert.equal(titleAngle.type, "textarea");
  assert.match(titleAngle.hint ?? "", /Multi-select adapted to textarea/);
  assert.deepEqual(titleAngle.options, [
    "Search-led",
    "Curiosity-led",
    "Benefit-led",
    "Problem and solution",
    "Contrarian",
    "Authority-led",
    "Story-led",
    "Comparison-led",
  ]);

  const filmingResources = getField("filmingResources");
  assert.equal(filmingResources.type, "textarea");
  assert.match(filmingResources.hint ?? "", /Multi-select adapted to textarea/);
  assert.equal(filmingResources.defaultValue, "Basic setup only");
});

test("YouTube Video Package validation enforces required, select, length, and number rules", () => {
  const values = {
    ...buildDefaultValues(variables),
    videoTopic: "How to build a weekly content system",
    primaryGoal: "Educate or explain",
    targetAudience: "Solo founders who publish weekly",
    keyMessage: "A simple weekly system prevents burnout.",
    essentialFacts: "The system includes planning, batching, drafting, and review.",
    videoFormat: "Tutorial or how-to",
    scriptDepth: "Hybrid script + talking points",
    targetDuration: "8–12 minutes",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, { ...values, videoTopic: "" }) ?? "",
    /Video topic or offer/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      primaryGoal: "Go viral",
    }) ?? "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      titleVariantCount: "2",
    }) ?? "",
    /at least 3/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      titleVariantCount: "11",
    }) ?? "",
    /at most 10/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      keyMessage: "x".repeat(701),
    }) ?? "",
    /700 characters or fewer/,
  );
});

test("YouTube Video Package conditional fields render only when relevant", () => {
  const values = buildDefaultValues(variables);
  const promotionDetails = getField("promotionDetails");
  const disclosureText = getField("disclosureText");
  const jurisdiction = getField("jurisdiction");

  assert.equal(isTemplateFieldVisible(promotionDetails, values), false);
  assert.equal(isTemplateFieldVisible(disclosureText, values), false);
  assert.equal(
    isTemplateFieldVisible(promotionDetails, {
      ...values,
      commercialRelationship: "Sponsor or paid integration",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(disclosureText, {
      ...values,
      commercialRelationship: "Affiliate relationship",
    }),
    true,
  );

  assert.equal(isTemplateFieldVisible(jurisdiction, values), false);
  assert.equal(
    isTemplateFieldVisible(jurisdiction, {
      ...values,
      regulatedContext: "Financial or investing",
    }),
    true,
  );
});

test("YouTube Video Package prompt filling leaves no unresolved placeholders", () => {
  const values = {
    ...buildDefaultValues(variables),
    videoTopic: "How to build a weekly content system",
    primaryGoal: "Educate or explain",
    targetAudience: "Solo founders who publish weekly",
    keyMessage: "A simple weekly system prevents burnout.",
    essentialFacts: "The system includes planning, batching, drafting, and review.",
    videoFormat: "Tutorial or how-to",
    scriptDepth: "Hybrid script + talking points",
    targetDuration: "8–12 minutes",
    sourceMaterial: "",
    storyExamples: "",
    descriptionLinks: "",
    promotionDetails: "",
    disclosureText: "",
  };
  const filled = fillPromptTemplate(prompt, values);

  assert.doesNotMatch(filled, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(filled, /\bundefined\b/i);
  assert.doesNotMatch(filled, /\bnull\b/i);
  assert.doesNotMatch(filled, /\bN\/A\b/i);
});

test("YouTube Video Package catalog, summary, builder, and Help integration are in sync", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const template = catalog.find((item) => item.slug === "youtube-video-package");
  assert.ok(template);
  assert.equal(template.title, "YouTube Video Package");
  assert.equal(
    template.description,
    "Creates a complete YouTube package with titles, thumbnail concepts, retention structure, script, description, chapters, keywords, and pinned comment.",
  );
  assert.equal(template.category, "youtube");
  assert.equal(template.requiredPlan, "pro");
  assert.equal(template.prompt.trim(), prompt.trim());
  assert.equal(template.variables.length, 40);
  assert.deepEqual(
    sorted(template.variables.map((field) => (field as { key: string }).key)),
    sorted(expectedKeys),
  );

  const summary = readJson<Array<{ slug: string; vars: number }>>(
    "prisma",
    "templates-summary.json",
  );
  assert.equal(
    summary.find((item) => item.slug === "youtube-video-package")?.vars,
    40,
  );

  const helpConfig = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(
    helpConfig,
    /"youtube-video-package": YOUTUBE_VIDEO_PACKAGE_GUIDE_PATH/,
  );

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "youtube-video-package",
    "page.tsx",
  );
  assert.match(guidePage, /templateSlug="youtube-video-package"/);
  assert.match(guidePage, /youtubeVideoPackageFormVariables/);
  assert.match(guidePage, /youtubeVideoPackageFormGroups/);

  const builder = readProjectFile(
    "scripts",
    "build-youtube-video-package-form.mjs",
  );
  assert.match(builder, /approved 40-field specification/);
  assert.doesNotMatch(builder, /PACKAGING CONTEXT/);
});
