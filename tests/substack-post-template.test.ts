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

type SubstackPostFormSchema = {
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
  "postTopic",
  "primaryGoal",
  "targetAudience",
  "centralThesis",
  "keyPoints",
  "sourceMaterial",
  "postFormat",
  "outputLanguage",
  "postLength",
  "callToAction",
  "titleDirection",
  "editorialAngle",
  "audienceKnowledge",
  "openingApproach",
  "structurePreference",
  "depthLevel",
  "includeCounterpoints",
  "endingStyle",
  "tone",
  "pointOfView",
  "voiceSample",
  "authorContext",
  "termsToAvoid",
  "publicationName",
  "accessModel",
  "previewBoundary",
  "paidOfferDetails",
  "emailSubjectStyle",
  "urlSlug",
  "tags",
  "claimsEvidence",
  "quotesAttribution",
  "linksToInclude",
  "disclosure",
  "sensitiveContext",
  "additionalRequirements",
] as const;

const requiredKeys = [
  "postTopic",
  "primaryGoal",
  "targetAudience",
  "centralThesis",
  "keyPoints",
  "outputLanguage",
] as const;

const prompt = readProjectFile("prisma", "template-prompts", "substack-post.txt");
const schema = readJson<SubstackPostFormSchema>(
  "src",
  "config",
  "template-forms",
  "substack-post-variables.json",
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

test("Substack Post prompt is replaced with the approved 36-variable prompt", () => {
  assert.match(prompt, /senior Substack editor/);
  assert.match(prompt, /Topic: \{\{postTopic\}\}/);
  assert.match(prompt, /Central thesis: \{\{centralThesis\}\}/);
  assert.match(prompt, /Access model: \{\{accessModel\}\}/);
  assert.match(prompt, /Preferred URL slug: \{\{urlSlug\}\}/);
  assert.match(prompt, /## Publication-Ready Post/);
  assert.match(prompt, /Output only the finished package below/);

  assert.doesNotMatch(prompt, /experienced Substack writer/);
  assert.doesNotMatch(prompt, /PUBLICATION INFORMATION/);
  assert.doesNotMatch(prompt, /\{\{topic\}\}/);
  assert.doesNotMatch(prompt, /\{\{audience\}\}/);
  assert.doesNotMatch(prompt, /\{\{mainMessage\}\}/);
  assert.doesNotMatch(prompt, /\{\{goal\}\}/);
  assert.doesNotMatch(prompt, /\{\{desiredAction\}\}/);
  assert.doesNotMatch(prompt, /\{\{preferredLength\}\}/);
  assert.doesNotMatch(prompt, /\{\{language\}\}/);
  assert.doesNotMatch(prompt, /\{\{authorVoice\}\}/);
  assert.doesNotMatch(prompt, /\{\{authorRole\}\}/);
  assert.doesNotMatch(prompt, /\{\{authorName\}\}/);
  assert.doesNotMatch(prompt, /\{\{sourceDetails\}\}/);
  assert.doesNotMatch(prompt, /\{\{personalExperience\}\}/);
  assert.doesNotMatch(prompt, /\{\{restrictions\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("Substack Post form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "substack-post");
  assert.equal(schema.title, "Substack Post");
  assert.equal(schema.fieldCount, 36);
  assert.equal(variables.length, 36);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "topic",
    "audience",
    "tone",
    "mainMessage",
    "desiredAction",
    "preferredLength",
    "language",
    "authorVoice",
    "authorRole",
    "authorName",
    "sourceDetails",
    "personalExperience",
    "goal",
    "restrictions",
  ]) {
    if (oldKey === "tone") continue;
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("Substack Post groups and help metadata follow the Standard schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    [
      "essentials",
      "editorial_shape",
      "voice_author_context",
      "publishing_monetization",
      "facts_sources_restrictions",
    ],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 11);
  assert.equal(
    variables.filter((field) => field.group === "editorial_shape").length,
    7,
  );
  assert.equal(
    variables.filter((field) => field.group === "voice_author_context").length,
    5,
  );
  assert.equal(
    variables.filter((field) => field.group === "publishing_monetization").length,
    7,
  );
  assert.equal(
    variables.filter((field) => field.group === "facts_sources_restrictions").length,
    6,
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

test("Substack Post options and conditional fields match the specification", () => {
  assert.deepEqual(getField("primaryGoal").options, [
    "Inform or explain",
    "Share analysis",
    "Persuade readers",
    "Tell a story",
    "Build reader trust",
    "Start a discussion",
    "Drive subscriptions",
    "Announce an update",
  ]);
  assert.deepEqual(getField("postFormat").options, [
    "Auto",
    "Essay",
    "Analysis",
    "How-to guide",
    "Personal story",
    "Commentary",
    "Curated roundup",
    "Announcement or update",
    "Interview or Q&A",
  ]);
  assert.deepEqual(getField("accessModel").options, [
    "Free",
    "Paid",
    "Paid with free preview",
  ]);
  assert.deepEqual(getField("emailSubjectStyle").options, [
    "Auto",
    "Direct and clear",
    "Curiosity-led",
    "Benefit-led",
    "Editorial",
    "Personal and understated",
  ]);

  const includeCounterpoints = getField("includeCounterpoints");
  assert.equal(includeCounterpoints.type, "select");
  assert.deepEqual(includeCounterpoints.options, ["Off", "On"]);
  assert.equal(includeCounterpoints.defaultValue, "Off");

  const tone = getField("tone");
  assert.equal(tone.type, "textarea");
  assert.match(tone.hint ?? "", /Provocative but fair/);

  assert.equal(
    isTemplateFieldVisible(getField("previewBoundary"), {
      accessModel: "Paid with free preview",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("previewBoundary"), {
      accessModel: "Paid",
    }),
    false,
  );
  assert.equal(
    isTemplateFieldVisible(getField("paidOfferDetails"), {
      accessModel: "Paid",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("paidOfferDetails"), {
      accessModel: "Paid with free preview",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("paidOfferDetails"), {
      accessModel: "Free",
    }),
    false,
  );
});

test("Substack Post validation and prompt rendering use form metadata", () => {
  const values = {
    ...buildDefaultValues(variables),
    postTopic: "Why small creators struggle to stay consistent",
    targetAudience:
      "Solo creators who publish weekly and want a calmer editorial workflow.",
    centralThesis:
      "Consistency improves when creators stop rebuilding their process from scratch.",
    keyPoints:
      "Templates reduce blank-page friction, saved prompts preserve useful patterns, and simple weekly review keeps the system honest.",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, { ...values, primaryGoal: "Unknown" }) ??
      "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      urlSlug: "x".repeat(49),
    }) ?? "",
    /48 characters or fewer/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      postTopic: "x".repeat(601),
    }) ?? "",
    /600 characters or fewer/,
  );

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b|\bN\/A\b/);
  assert.match(rendered, /Why small creators struggle to stay consistent/);
  assert.match(rendered, /Inform or explain/);
  assert.match(rendered, /Platform appropriate/);
});

test("Substack Post catalog and Help integration use the full form", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "substack-post");
  assert.ok(item, "Catalog should include Substack Post");
  assert.equal(item.title, "Substack Post");
  assert.equal(item.category, "community");
  assert.equal(item.requiredPlan, "pro");
  assert.match(item.description, /publication-ready Substack post/);
  assert.equal(item.variables.length, 36);
  assert.deepEqual(sorted(item.variables.map((variable) => variable.key)), sorted(expectedKeys));

  const helpButton = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpButton, /SUBSTACK_POST_GUIDE_PATH/);
  assert.match(helpButton, /"substack-post": SUBSTACK_POST_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "substack-post",
    "page.tsx",
  );
  assert.match(guidePage, /Substack Post - field guide/);
  assert.match(guidePage, /templateSlug="substack-post"/);
});
