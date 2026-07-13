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

type ThreadsFormSchema = {
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
  variables: Array<{ key: string; format?: string; min?: number; max?: number }>;
};

const expectedKeys = [
  "topic",
  "goal",
  "audience",
  "keyMessage",
  "language",
  "postFormat",
  "tone",
  "cta",
  "variants",
  "accountType",
  "pointOfView",
  "brandVoice",
  "context",
  "wordingPreferences",
  "openingStyle",
  "sequenceLength",
  "replyPrompt",
  "destinationUrl",
  "emojiLevel",
  "topicTagMode",
  "sourceMaterial",
  "commercialRelationship",
  "disclosureText",
  "additionalRequirements",
] as const;

const requiredKeys = [
  "topic",
  "goal",
  "audience",
  "keyMessage",
  "language",
] as const;

const prompt = readProjectFile("prisma", "template-prompts", "threads-post.txt");
const schema = readJson<ThreadsFormSchema>(
  "src",
  "config",
  "template-forms",
  "threads-post-variables.json",
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

test("Threads Post prompt is replaced with the approved 24-variable prompt", () => {
  assert.match(prompt, /You are a Threads copywriter/);
  assert.match(prompt, /Topic: \{\{topic\}\}/);
  assert.match(prompt, /Commercial relationship: \{\{commercialRelationship\}\}/);
  assert.match(prompt, /# Threads Post/);
  assert.match(prompt, /every post is below 480 characters/);

  assert.doesNotMatch(prompt, /experienced Threads editor/);
  assert.doesNotMatch(prompt, /POST DETAILS/);
  assert.doesNotMatch(prompt, /Author role: \{\{authorRole\}\}/);
  assert.doesNotMatch(prompt, /Approved personal experience: \{\{personalExperience\}\}/);
  assert.doesNotMatch(prompt, /Relevant link or destination: \{\{link\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("Threads Post form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "threads-post");
  assert.equal(schema.title, "Threads Post");
  assert.equal(schema.fieldCount, 24);
  assert.equal(variables.length, 24);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "authorRole",
    "mainMessage",
    "desiredAction",
    "visualContext",
    "sourceDetails",
    "personalExperience",
    "link",
    "restrictions",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("Threads Post field groups and metadata follow the compact schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    [
      "essentials",
      "voice_positioning",
      "format_engagement",
      "facts_restrictions",
    ],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 9);
  assert.equal(
    variables.filter((field) => field.group === "voice_positioning").length,
    5,
  );
  assert.equal(
    variables.filter((field) => field.group === "format_engagement").length,
    6,
  );
  assert.equal(
    variables.filter((field) => field.group === "facts_restrictions").length,
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

test("Threads Post select options and special field behavior match the specification", () => {
  assert.deepEqual(getField("goal").options, [
    "Share an insight",
    "Start a conversation",
    "Tell a story",
    "Promote an offer",
    "Announce an update",
    "Educate the audience",
    "Build awareness",
    "Other",
  ]);
  assert.deepEqual(getField("postFormat").options, [
    "Auto",
    "Single post",
    "Short sequence",
  ]);
  assert.deepEqual(getField("cta").options, [
    "Auto",
    "Reply",
    "Share experience",
    "Follow",
    "Visit link",
    "No CTA",
  ]);

  const sequenceLength = getField("sequenceLength");
  assert.equal(sequenceLength.type, "number");
  assert.equal(sequenceLength.defaultValue, "3");
  assert.equal(sequenceLength.min, 2);
  assert.equal(sequenceLength.max, 6);

  const destinationUrl = getField("destinationUrl");
  assert.equal(destinationUrl.type, "text");
  assert.equal(destinationUrl.format, "url");
  assert.equal(destinationUrl.maxLength, 500);

  assert.deepEqual(getField("commercialRelationship").options, [
    "None",
    "Own product or service",
    "Affiliate relationship",
    "Sponsored or paid",
    "Employer or client",
    "Other material relationship",
  ]);
});

test("Threads Post validation enforces required, URL, select, length, and number rules", () => {
  const values = {
    ...buildDefaultValues(variables),
    topic: "Content workflow simplification",
    goal: "Start a conversation",
    audience: "Solo founders publishing weekly",
    keyMessage: "A smaller repeatable workflow is easier to maintain than a perfect system.",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, { ...values, topic: "" }) ?? "",
    /Topic or subject/,
  );
  assert.match(
    validateVariableValues(variables, { ...values, goal: "Go viral" }) ?? "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, { ...values, audience: "x".repeat(201) }) ?? "",
    /200 characters or fewer/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      postFormat: "Short sequence",
      sequenceLength: "7",
    }) ?? "",
    /at most 6/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      cta: "Visit link",
      destinationUrl: "not-a-url",
    }) ?? "",
    /valid URL/,
  );
});

test("Threads Post conditional fields render only when relevant", () => {
  const values = buildDefaultValues(variables);
  const sequenceLength = getField("sequenceLength");
  const destinationUrl = getField("destinationUrl");
  const disclosureText = getField("disclosureText");

  assert.equal(isTemplateFieldVisible(sequenceLength, values), false);
  assert.equal(
    isTemplateFieldVisible(sequenceLength, {
      ...values,
      postFormat: "Short sequence",
    }),
    true,
  );

  assert.equal(isTemplateFieldVisible(destinationUrl, values), false);
  assert.equal(
    isTemplateFieldVisible(destinationUrl, { ...values, cta: "Visit link" }),
    true,
  );

  assert.equal(isTemplateFieldVisible(disclosureText, values), false);
  assert.equal(
    isTemplateFieldVisible(disclosureText, {
      ...values,
      commercialRelationship: "Own product or service",
    }),
    true,
  );
});

test("Threads Post prompt filling does not invent optional placeholders", () => {
  const values = {
    ...buildDefaultValues(variables),
    topic: "A product workflow observation",
    audience: "Creators who publish several times per week",
    keyMessage: "Templates help reduce repeated prompt rewriting.",
    destinationUrl: "",
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

test("Threads Post catalog, summary, builder, and Help integration are in sync", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const matches = catalog.filter((item) => item.slug === "threads-post");
  assert.equal(matches.length, 1);
  const template = matches[0];
  assert.equal(template.title, "Threads Post");
  assert.equal(
    template.description,
    "Create concise, conversational Threads posts or short connected sequences that sound natural, encourage genuine replies, and stay claim-safe.",
  );
  assert.equal(template.category, "threads_post");
  assert.equal(template.requiredPlan, "free");
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
    template.variables.find((field) => field.key === "sequenceLength")?.min,
    2,
  );
  assert.equal(
    template.variables.find((field) => field.key === "sequenceLength")?.max,
    6,
  );

  const summary = readJson<Array<{ slug: string; vars: number }>>(
    "prisma",
    "templates-summary.json",
  );
  assert.equal(summary.find((item) => item.slug === "threads-post")?.vars, 24);

  const helpConfig = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpConfig, /"threads-post": THREADS_POST_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "threads-post",
    "page.tsx",
  );
  assert.match(guidePage, /templateSlug="threads-post"/);
  assert.match(guidePage, /threadsPostFormVariables/);
  assert.match(guidePage, /threadsPostFormGroups/);

  const builder = readProjectFile("scripts", "build-threads-post-form.mjs");
  assert.match(builder, /approved 24-field specification/);
  assert.doesNotMatch(builder, /Facebook Post/);
});
