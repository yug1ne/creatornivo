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

type QuoraAnswerFormSchema = {
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
  "quoraQuestion",
  "answerGoal",
  "targetReader",
  "directAnswer",
  "keyPoints",
  "perspectiveType",
  "outputLanguage",
  "tone",
  "answerLength",
  "questionContext",
  "supportingEvidence",
  "examplesOrSteps",
  "firstHandDetails",
  "credentialsContext",
  "uncertaintyLimits",
  "affiliationType",
  "affiliatedEntity",
  "relevantLink",
  "readerAction",
  "structureStyle",
  "openingStyle",
  "readingLevel",
  "includeSourceNotes",
  "additionalRequirements",
] as const;

const requiredKeys = [
  "quoraQuestion",
  "answerGoal",
  "directAnswer",
  "keyPoints",
  "perspectiveType",
  "outputLanguage",
] as const;

const prompt = readProjectFile("prisma", "template-prompts", "quora-answer.txt");
const schema = readJson<QuoraAnswerFormSchema>(
  "src",
  "config",
  "template-forms",
  "quora-answer-variables.json",
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

test("Quora Answer prompt is replaced with the approved 24-variable prompt", () => {
  assert.match(prompt, /senior Quora answer writer/);
  assert.match(prompt, /Question: \{\{quoraQuestion\}\}/);
  assert.match(prompt, /Primary goal: \{\{answerGoal\}\}/);
  assert.match(prompt, /Affiliation type: \{\{affiliationType\}\}/);
  assert.match(prompt, /Include source notes: \{\{includeSourceNotes\}\}/);
  assert.match(prompt, /## Source & Verification Notes/);
  assert.match(prompt, /FINAL CHECK/);

  assert.doesNotMatch(prompt, /experienced Quora writer/);
  assert.doesNotMatch(prompt, /QUESTION INFORMATION/);
  assert.doesNotMatch(prompt, /\{\{question\}\}/);
  assert.doesNotMatch(prompt, /\{\{topic\}\}/);
  assert.doesNotMatch(prompt, /\{\{questionType\}\}/);
  assert.doesNotMatch(prompt, /\{\{audience\}\}/);
  assert.doesNotMatch(prompt, /\{\{language\}\}/);
  assert.doesNotMatch(prompt, /\{\{authorExpertise\}\}/);
  assert.doesNotMatch(prompt, /\{\{mainAnswer\}\}/);
  assert.doesNotMatch(prompt, /\{\{personalExperience\}\}/);
  assert.doesNotMatch(prompt, /\{\{sourceDetails\}\}/);
  assert.doesNotMatch(prompt, /\{\{desiredAction\}\}/);
  assert.doesNotMatch(prompt, /\{\{link\}\}/);
  assert.doesNotMatch(prompt, /\{\{restrictions\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("Quora Answer form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "quora-answer");
  assert.equal(schema.title, "Quora Answer");
  assert.equal(schema.fieldCount, 24);
  assert.equal(variables.length, 24);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "question",
    "topic",
    "questionType",
    "audience",
    "language",
    "authorExpertise",
    "mainAnswer",
    "authorRole",
    "authorVoice",
    "personalExperience",
    "sourceDetails",
    "desiredAction",
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

test("Quora Answer groups and help metadata follow the Standard schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    [
      "essentials",
      "evidence_credibility",
      "promotion_disclosure",
      "style_output",
    ],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 10);
  assert.equal(
    variables.filter((field) => field.group === "evidence_credibility").length,
    5,
  );
  assert.equal(
    variables.filter((field) => field.group === "promotion_disclosure").length,
    4,
  );
  assert.equal(variables.filter((field) => field.group === "style_output").length, 5);

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

test("Quora Answer options, URL field, and conditional fields match the specification", () => {
  assert.deepEqual(getField("answerGoal").options, [
    "Explain clearly",
    "Compare options",
    "Recommend an approach",
    "Troubleshoot a problem",
    "Share experience",
    "Correct a misconception",
  ]);
  assert.deepEqual(getField("perspectiveType").options, [
    "Neutral explainer",
    "Subject-matter expertise",
    "First-hand experience",
    "Experience and expertise",
    "Company representative",
    "Personal opinion",
  ]);
  assert.deepEqual(getField("affiliationType").options, [
    "No material affiliation",
    "Founder or owner",
    "Employee or representative",
    "Customer or user",
    "Consultant or partner",
    "Affiliate relationship",
    "Paid sponsorship",
    "Investor or other connection",
  ]);
  assert.deepEqual(getField("readerAction").options, [
    "None",
    "Invite discussion",
    "Read a resource",
    "Try a product or service",
    "Contact the author or company",
    "Follow the profile",
    "Auto",
  ]);
  assert.deepEqual(getField("structureStyle").options, [
    "Natural paragraphs",
    "Step by step",
    "Comparison",
    "Mixed",
    "Auto",
  ]);
  assert.deepEqual(getField("openingStyle").options, [
    "Direct answer",
    "Brief context",
    "Clarify the premise",
    "Personal observation",
    "Auto",
  ]);
  assert.deepEqual(getField("readingLevel").options, [
    "Simple",
    "General audience",
    "Informed audience",
    "Specialist",
    "Auto",
  ]);

  const includeSourceNotes = getField("includeSourceNotes");
  assert.equal(includeSourceNotes.type, "select");
  assert.deepEqual(includeSourceNotes.options, ["On", "Off"]);
  assert.equal(includeSourceNotes.defaultValue, "Off");

  const relevantLink = getField("relevantLink");
  assert.equal(relevantLink.type, "text");
  assert.equal(relevantLink.format, "url");
  assert.equal(relevantLink.placeholder, "https://www.creatornivo.com/resources");

  const firstHandDetails = getField("firstHandDetails");
  assert.equal(
    isTemplateFieldVisible(firstHandDetails, {
      perspectiveType: "First-hand experience",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(firstHandDetails, {
      perspectiveType: "Experience and expertise",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(firstHandDetails, {
      perspectiveType: "Neutral explainer",
    }),
    false,
  );

  const affiliatedEntity = getField("affiliatedEntity");
  assert.equal(
    isTemplateFieldVisible(affiliatedEntity, {
      affiliationType: "Founder or owner",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(affiliatedEntity, {
      affiliationType: "No material affiliation",
    }),
    false,
  );
});

test("Quora Answer validation and prompt rendering use form metadata", () => {
  const values = {
    ...buildDefaultValues(variables),
    quoraQuestion:
      "What is the best way for solo founders to stay consistent with content?",
    directAnswer:
      "A simple repeatable system is more reliable than waiting for motivation.",
    keyPoints:
      "Use templates, define a weekly cadence, save prompts that work, and review which drafts become publishable.",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, { ...values, answerGoal: "Unknown" }) ??
      "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      relevantLink: "not-a-url",
    }) ?? "",
    /valid URL/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      quoraQuestion: "x".repeat(301),
    }) ?? "",
    /300 characters or fewer/,
  );

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b|\bN\/A\b/);
  assert.match(rendered, /solo founders/);
  assert.match(rendered, /Explain clearly/);
  assert.match(rendered, /Neutral explainer/);
});

test("Quora Answer catalog and Help integration use the full form", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "quora-answer");
  assert.ok(item, "Catalog should include Quora Answer");
  assert.equal(item.title, "Quora Answer");
  assert.equal(item.category, "community");
  assert.equal(item.requiredPlan, "pro");
  assert.match(item.description, /optional evidence, transparent affiliation disclosure/);
  assert.equal(item.variables.length, 24);
  assert.deepEqual(sorted(item.variables.map((variable) => variable.key)), sorted(expectedKeys));

  const helpButton = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpButton, /QUORA_ANSWER_GUIDE_PATH/);
  assert.match(helpButton, /"quora-answer": QUORA_ANSWER_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "quora-answer",
    "page.tsx",
  );
  assert.match(guidePage, /Quora Answer - field guide/);
  assert.match(guidePage, /templateSlug="quora-answer"/);
});
