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

type InstagramCarouselFormSchema = {
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
  variables: Array<{ key: string; format?: string; maxLength?: number }>;
};

const expectedKeys = [
  "carouselTopic",
  "primaryGoal",
  "targetAudience",
  "keyMessage",
  "essentialPoints",
  "outputLanguage",
  "carouselLength",
  "contentAngle",
  "ctaType",
  "destinationUrl",
  "sourceMaterial",
  "evidenceAndProof",
  "offerDetails",
  "exampleOrStory",
  "contentDepth",
  "slideFlowPreference",
  "brandName",
  "tone",
  "brandVoice",
  "writingStyle",
  "wordsToAvoid",
  "visualDirection",
  "brandColors",
  "imageOrientation",
  "includeVisualPrompts",
  "altTextMode",
  "assetType",
  "captionLength",
  "hashtagMode",
  "emojiUse",
  "relationshipType",
  "disclosureText",
  "riskCategory",
  "additionalContext",
] as const;

const requiredKeys = [
  "carouselTopic",
  "primaryGoal",
  "targetAudience",
  "keyMessage",
  "essentialPoints",
  "outputLanguage",
] as const;

const prompt = readProjectFile(
  "prisma",
  "template-prompts",
  "instagram-carousel.txt",
);
const schema = readJson<InstagramCarouselFormSchema>(
  "src",
  "config",
  "template-forms",
  "instagram-carousel-variables.json",
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

test("Instagram Carousel prompt is replaced with the approved 34-variable prompt", () => {
  assert.match(prompt, /senior Instagram carousel strategist/);
  assert.match(prompt, /Topic, product, or idea:\n\{\{carouselTopic\}\}/);
  assert.match(prompt, /Required disclosure:\n\{\{disclosureText\}\}/);
  assert.match(prompt, /# Instagram Carousel/);
  assert.match(prompt, /Slide-by-Slide Carousel/);

  assert.doesNotMatch(prompt, /experienced Instagram carousel strategist/);
  assert.doesNotMatch(prompt, /CAROUSEL DETAILS/);
  assert.doesNotMatch(prompt, /Author or brand role: \{\{authorRole\}\}/);
  assert.doesNotMatch(prompt, /Approved personal experience: \{\{personalExperience\}\}/);
  assert.doesNotMatch(prompt, /Relevant link or destination: \{\{link\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("Instagram Carousel form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "instagram-carousel");
  assert.equal(schema.title, "Instagram Carousel");
  assert.equal(schema.fieldCount, 34);
  assert.equal(variables.length, 34);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "topic",
    "goal",
    "audience",
    "knowledgeLevel",
    "awarenessStage",
    "authorRole",
    "slideCount",
    "mainMessage",
    "desiredAction",
    "offer",
    "sourceDetails",
    "personalExperience",
    "link",
    "visualStyle",
    "designConstraints",
    "language",
    "restrictions",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("Instagram Carousel field groups and metadata follow the Standard schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    [
      "essentials",
      "content_structure",
      "brand_tone",
      "visual_accessibility",
      "publishing_compliance",
    ],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 10);
  assert.equal(
    variables.filter((field) => field.group === "content_structure").length,
    6,
  );
  assert.equal(variables.filter((field) => field.group === "brand_tone").length, 5);
  assert.equal(
    variables.filter((field) => field.group === "visual_accessibility").length,
    6,
  );
  assert.equal(
    variables.filter((field) => field.group === "publishing_compliance").length,
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

test("Instagram Carousel options and technical field adaptations match the specification", () => {
  assert.deepEqual(getField("primaryGoal").options, [
    "Educate or explain",
    "Build authority",
    "Drive engagement",
    "Promote an offer",
    "Generate leads",
    "Launch or announce",
    "Tell a story",
    "Increase awareness",
  ]);
  assert.deepEqual(getField("carouselLength").options, [
    "Auto",
    "5 slides",
    "7 slides",
    "8 slides",
    "10 slides",
    "12 slides",
    "15 slides",
    "20 slides",
  ]);
  assert.deepEqual(getField("ctaType").options, [
    "Auto",
    "Save the post",
    "Share the post",
    "Comment or reply",
    "Follow the account",
    "Visit profile or link",
    "Download or learn more",
    "Buy or book",
    "No CTA",
  ]);

  const destinationUrl = getField("destinationUrl");
  assert.equal(destinationUrl.type, "text");
  assert.equal(destinationUrl.format, "url");
  assert.equal(destinationUrl.maxLength, 2048);

  const writingStyle = getField("writingStyle");
  assert.equal(writingStyle.type, "textarea");
  assert.match(writingStyle.hint ?? "", /up to eight/);

  const includeVisualPrompts = getField("includeVisualPrompts");
  assert.equal(includeVisualPrompts.type, "select");
  assert.deepEqual(includeVisualPrompts.options, ["Yes", "No"]);
  assert.equal(includeVisualPrompts.defaultValue, "Yes");
});

test("Instagram Carousel validation enforces required, URL, select, and length rules", () => {
  const values = {
    ...buildDefaultValues(variables),
    carouselTopic: "A reusable content planning workflow",
    targetAudience: "Independent creators who publish weekly",
    keyMessage: "Reusable structures make content creation more consistent.",
    essentialPoints: "Choose a template. Add audience and facts. Save reusable outputs.",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, { ...values, carouselTopic: "" }) ?? "",
    /Topic, product, or idea/,
  );
  assert.match(
    validateVariableValues(variables, { ...values, primaryGoal: "Go viral" }) ?? "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      keyMessage: "x".repeat(501),
    }) ?? "",
    /500 characters or fewer/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      destinationUrl: "not-a-url",
    }) ?? "",
    /valid URL/,
  );
});

test("Instagram Carousel conditional fields render only when relevant", () => {
  const values = buildDefaultValues(variables);
  const offerDetails = getField("offerDetails");
  const disclosureText = getField("disclosureText");

  assert.equal(isTemplateFieldVisible(offerDetails, values), false);
  assert.equal(
    isTemplateFieldVisible(offerDetails, {
      ...values,
      primaryGoal: "Promote an offer",
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
      relationshipType: "Affiliate",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(disclosureText, {
      ...values,
      relationshipType: "Own brand or product",
    }),
    false,
  );
});

test("Instagram Carousel prompt filling does not invent optional field placeholders", () => {
  const values = {
    ...buildDefaultValues(variables),
    carouselTopic: "A product workflow carousel",
    targetAudience: "Creators who publish several times per week",
    keyMessage: "Templates help reduce repeated prompt rewriting.",
    essentialPoints: "Start from a template. Keep facts consistent. Save useful outputs.",
    destinationUrl: "",
    offerDetails: "",
    disclosureText: "",
    sourceMaterial: "",
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

test("Instagram Carousel catalog, summary, builder, and Help integration are in sync", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const matches = catalog.filter((item) => item.slug === "instagram-carousel");
  assert.equal(matches.length, 1);
  const template = matches[0];
  assert.equal(template.title, "Instagram Carousel");
  assert.equal(
    template.description,
    "Creates a structured Instagram carousel with slide cogs, and accessible alt text.",
  );
  assert.equal(template.category, "instagram_post");
  assert.equal(template.requiredPlan, "pro");
  assert.equal(template.prompt.trim(), prompt.trim());
  assert.equal(template.variables.length, 34);
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
    2048,
  );

  const summary = readJson<Array<{ slug: string; vars: number }>>(
    "prisma",
    "templates-summary.json",
  );
  assert.equal(
    summary.find((item) => item.slug === "instagram-carousel")?.vars,
    34,
  );

  const helpConfig = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpConfig, /"instagram-carousel": INSTAGRAM_CAROUSEL_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "instagram-carousel",
    "page.tsx",
  );
  assert.match(guidePage, /templateSlug="instagram-carousel"/);
  assert.match(guidePage, /instagramCarouselFormVariables/);
  assert.match(guidePage, /instagramCarouselFormGroups/);

  const builder = readProjectFile("scripts", "build-instagram-carousel-form.mjs");
  assert.match(builder, /approved 34-field specification/);
  assert.doesNotMatch(builder, /Facebook Post/);
});
