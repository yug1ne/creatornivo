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

type IndieHackersPostFormSchema = {
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
  "postType",
  "projectOrTopic",
  "projectSummary",
  "primaryGoal",
  "targetReaders",
  "coreStory",
  "relationshipToProject",
  "buildStage",
  "desiredLength",
  "outputLanguage",
  "founderBackground",
  "contextTimeline",
  "challengesMistakes",
  "lessonsLearned",
  "metricsEvidence",
  "sourceLinks",
  "tone",
  "transparencyLevel",
  "titleApproach",
  "formattingPreference",
  "discussionQuestion",
  "promotionLevel",
  "projectUrl",
  "additionalRequirements",
] as const;

const requiredKeys = [
  "postType",
  "projectOrTopic",
  "projectSummary",
  "primaryGoal",
  "targetReaders",
  "coreStory",
] as const;

const prompt = readProjectFile(
  "prisma",
  "template-prompts",
  "indie-hackers-post.txt",
);
const schema = readJson<IndieHackersPostFormSchema>(
  "src",
  "config",
  "template-forms",
  "indie-hackers-post-variables.json",
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

test("Indie Hackers Post prompt is replaced with the approved 24-variable prompt", () => {
  assert.match(prompt, /senior founder-community writer/);
  assert.match(prompt, /Post type: \{\{postType\}\}/);
  assert.match(prompt, /Project or topic: \{\{projectOrTopic\}\}/);
  assert.match(prompt, /Core story or message: \{\{coreStory\}\}/);
  assert.match(prompt, /Promotion level: \{\{promotionLevel\}\}/);
  assert.match(prompt, /## Title options/);
  assert.match(prompt, /## Recommended title/);
  assert.match(prompt, /## Indie Hackers post/);
  assert.match(prompt, /## Creator notes/);
  assert.match(prompt, /Output only this package/);

  assert.doesNotMatch(prompt, /experienced Indie Hackers writer/);
  assert.doesNotMatch(prompt, /PROJECT INFORMATION/);
  assert.doesNotMatch(prompt, /\{\{productName\}\}/);
  assert.doesNotMatch(prompt, /\{\{topic\}\}/);
  assert.doesNotMatch(prompt, /\{\{mainMessage\}\}/);
  assert.doesNotMatch(prompt, /\{\{goal\}\}/);
  assert.doesNotMatch(prompt, /\{\{desiredAction\}\}/);
  assert.doesNotMatch(prompt, /\{\{communityQuestion\}\}/);
  assert.doesNotMatch(prompt, /\{\{authorName\}\}/);
  assert.doesNotMatch(prompt, /\{\{authorRelationship\}\}/);
  assert.doesNotMatch(prompt, /\{\{metrics\}\}/);
  assert.doesNotMatch(prompt, /\{\{sourceDetails\}\}/);
  assert.doesNotMatch(prompt, /\{\{language\}\}/);
  assert.doesNotMatch(prompt, /\{\{restrictions\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("Indie Hackers Post form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "indie-hackers-post");
  assert.equal(schema.title, "Indie Hackers Post");
  assert.equal(schema.fieldCount, 24);
  assert.equal(variables.length, 24);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "productName",
    "topic",
    "mainMessage",
    "goal",
    "desiredAction",
    "communityQuestion",
    "authorName",
    "authorRelationship",
    "metrics",
    "sourceDetails",
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

test("Indie Hackers Post groups and help metadata follow the Compact schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    [
      "essentials",
      "story_evidence",
      "voice_community_fit",
      "promotion_safeguards",
    ],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 10);
  assert.equal(
    variables.filter((field) => field.group === "story_evidence").length,
    6,
  );
  assert.equal(
    variables.filter((field) => field.group === "voice_community_fit").length,
    5,
  );
  assert.equal(
    variables.filter((field) => field.group === "promotion_safeguards").length,
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

test("Indie Hackers Post options, conditional URL, and type adaptations match the specification", () => {
  assert.deepEqual(getField("postType").options, [
    "Build update",
    "Lesson learned",
    "Feedback request",
    "Milestone",
    "Postmortem",
    "Launch story",
    "Question or discussion",
  ]);
  assert.deepEqual(getField("primaryGoal").options, [
    "Share useful progress",
    "Teach a lesson",
    "Get practical feedback",
    "Start a discussion",
    "Explain a milestone",
    "Analyze a failure",
    "Introduce a launch",
  ]);
  assert.deepEqual(getField("promotionLevel").options, [
    "No promotion",
    "Mention only",
    "Soft link",
    "Direct feedback invitation",
  ]);
  assert.deepEqual(getField("formattingPreference").options, undefined);
  assert.equal(getField("formattingPreference").type, "textarea");
  assert.match(getField("formattingPreference").hint ?? "", /Short paragraphs/);
  assert.equal(getField("projectUrl").type, "text");
  assert.equal(getField("projectUrl").format, "url");

  assert.equal(
    isTemplateFieldVisible(getField("projectUrl"), {
      promotionLevel: "Soft link",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("projectUrl"), {
      promotionLevel: "Direct feedback invitation",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("projectUrl"), {
      promotionLevel: "Mention only",
    }),
    false,
  );
});

test("Indie Hackers Post validation and prompt rendering use form metadata", () => {
  const values = {
    ...buildDefaultValues(variables),
    projectOrTopic: "Creatornivo, a content-template platform",
    projectSummary:
      "A structured AI workspace that helps creators turn briefs into platform-ready content.",
    targetReaders:
      "Solo SaaS founders struggling to validate an early product without fake launch hype.",
    coreStory:
      "We replaced generic prompts with structured template forms and learned that field quality matters more than template count.",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, { ...values, postType: "Unknown" }) ?? "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      promotionLevel: "Soft link",
      projectUrl: "not-a-url",
    }) ?? "",
    /valid URL/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      projectOrTopic: "x".repeat(161),
    }) ?? "",
    /160 characters or fewer/,
  );

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b/);
  assert.match(rendered, /Creatornivo, a content-template platform/);
  assert.match(rendered, /Build update/);
  assert.match(rendered, /Share useful progress/);
});

test("Indie Hackers Post catalog and Help integration use the full form", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "indie-hackers-post");
  assert.ok(item, "Catalog should include Indie Hackers Post");
  assert.equal(item.title, "Indie Hackers Post");
  assert.equal(item.category, "community");
  assert.equal(item.requiredPlan, "pro");
  assert.match(item.description, /transparent, useful founder post/);
  assert.equal(item.variables.length, 24);
  assert.deepEqual(sorted(item.variables.map((variable) => variable.key)), sorted(expectedKeys));

  const helpButton = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpButton, /INDIE_HACKERS_POST_GUIDE_PATH/);
  assert.match(helpButton, /"indie-hackers-post": INDIE_HACKERS_POST_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "indie-hackers-post",
    "page.tsx",
  );
  assert.match(guidePage, /Indie Hackers Post - field guide/);
  assert.match(guidePage, /templateSlug="indie-hackers-post"/);
});
