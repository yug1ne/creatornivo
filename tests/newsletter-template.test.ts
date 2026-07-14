import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildDefaultValues,
  fillPromptTemplate,
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

type FormSchema = {
  slug: string;
  title: string;
  variables: unknown;
};

type CatalogTemplate = {
  slug: string;
  title: string;
  prompt: string;
};

const prompt = readProjectFile("prisma", "template-prompts", "newsletter.txt");
const schema = readJson<FormSchema>(
  "src",
  "config",
  "template-forms",
  "newsletter-variables.json",
);
const variables = parseTemplateVariables(schema.variables);

function valueForField(field: TemplateVariable): string {
  if (field.format === "url") {
    return "https://www.creatornivo.com/newsletter";
  }

  if (field.type === "number") {
    return field.defaultValue ?? String(field.min ?? 1);
  }

  if (field.type === "select") {
    return field.defaultValue ?? field.options?.[0] ?? "Auto";
  }

  return `${field.label} example`;
}

function requiredValues(): Record<string, string> {
  const values = buildDefaultValues(variables);

  for (const field of variables) {
    if (field.required) {
      values[field.key] = valueForField(field);
    }
  }

  return values;
}

function fullValues(): Record<string, string> {
  const values = buildDefaultValues(variables);

  for (const field of variables) {
    values[field.key] = valueForField(field);
  }

  values.newsletterTopic = "A free weekly content planner for solo creators";
  values.keyMessage =
    "The planner can help organize weekly content ideas, hooks, CTAs, and campaign notes in one place.";
  values.primaryCta = "Download the planner";
  values.ctaUrl = "https://www.creatornivo.com/planner";
  values.disclosedRelationships = "Creator-owned resource from the sender";

  return values;
}

function assertCleanRenderedPrompt(rendered: string): void {
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b|\[object Object\]/);
}

test("Newsletter prompt keeps Pre-Publication Notes conditional and never None-only", () => {
  assert.equal(schema.slug, "newsletter");
  assert.equal(schema.title, "Newsletter");
  assert.match(prompt, /## Pre-Publication Notes/);
  assert.match(prompt, /Include this section only when action is genuinely required/);
  assert.match(prompt, /When no real pre-publication action remains, omit this entire section/);
  assert.match(prompt, /Never output a Pre-Publication Notes heading followed only by "None,"/);
  assert.match(prompt, /a missing destination URL required by the selected CTA/);
});

test("Newsletter prompt preserves required newsletter package sections", () => {
  assert.match(prompt, /## Subject Line Options/);
  assert.match(prompt, /## Preview Text Options/);
  assert.match(prompt, /## Newsletter Body/);
  assert.match(prompt, /one primary CTA/);
  assert.match(prompt, /## Plain-Text Version/);
  assert.match(prompt, /commercial disclosure when required/);
});

test("Newsletter prompt avoids planner overpromises and finished-post implications", () => {
  assert.match(prompt, /Do not imply that the resource creates finished posts/);
  assert.match(prompt, /guarantees consistency/);
  assert.match(prompt, /guarantees engagement/);
  assert.match(prompt, /organize your weekly content ideas/);
  assert.match(prompt, /keep topics, hooks, CTAs, and notes in one place/);
  assert.match(prompt, /Master Your Week/);
  assert.match(prompt, /Weekly Content Made Easy/);
  assert.match(prompt, /solution you have been searching for/);
});

test("Newsletter renders required-only and full-field prompts cleanly", () => {
  const required = requiredValues();
  assert.equal(validateVariableValues(variables, required), null);
  assertCleanRenderedPrompt(fillPromptTemplate(prompt, required));

  const full = fullValues();
  assert.equal(validateVariableValues(variables, full), null);
  const rendered = fillPromptTemplate(prompt, full);
  assertCleanRenderedPrompt(rendered);
  assert.match(rendered, /A free weekly content planner for solo creators/);
  assert.match(rendered, /Creator-owned resource from the sender/);
});

test("Newsletter source prompt and runtime catalog stay in sync", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const template = catalog.find((item) => item.slug === "newsletter");

  assert.ok(template);
  assert.equal(template.title, "Newsletter");
  assert.equal(template.prompt.trim(), prompt.trim());
});
