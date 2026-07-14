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

const prompt = readProjectFile(
  "prisma",
  "template-prompts",
  "cold-email-outreach.txt",
);
const schema = readJson<FormSchema>(
  "src",
  "config",
  "template-forms",
  "cold-email-outreach-variables.json",
);
const variables = parseTemplateVariables(schema.variables);

function valueForField(field: TemplateVariable): string {
  if (field.format === "url") {
    return "https://www.creatornivo.com/resource";
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

  values.offerAndOutcome =
    "A free weekly content planner that can help small teams organize topics, hooks, CTAs, and notes.";
  values.ctaPreference = "Ask permission to send details";
  values.optOutStyle = "Simple reply-to-opt-out line";
  values.variantCount = "3";

  return values;
}

function assertCleanRenderedPrompt(rendered: string): void {
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b|\[object Object\]/);
}

test("Cold Email Outreach prompt enforces variant count and follow-up controls", () => {
  assert.equal(schema.slug, "cold-email-outreach");
  assert.equal(schema.title, "Cold Email Outreach");
  assert.match(prompt, /Follow `\{\{variantCount\}\}` exactly/);
  assert.match(prompt, /if it is 1, output exactly one initial email variant/);
  assert.match(prompt, /if it is 2, output exactly two initial email variants/);
  assert.match(prompt, /if it is 3, output exactly three initial email variants/);
  assert.match(prompt, /write only the selected number/);
});

test("Cold Email Outreach prompt keeps opt-out and CTA behavior low-friction", () => {
  assert.match(prompt, /Simple reply-to-opt-out line/);
  assert.match(prompt, /If this is not relevant, feel free to tell me/);
  assert.match(prompt, /Do not invent an unsubscribe URL, legal footer, postal address/);
  assert.match(prompt, /Do not make a walkthrough, demo, or meeting the first CTA/);
  assert.match(prompt, /ask whether the recipient wants the link, details, or next step/);
});

test("Cold Email Outreach prompt uses cautious pain framing and restrained language", () => {
  assert.match(prompt, /Do not state uncertain recipient pain as fact/);
  assert.match(prompt, /If this is currently a priority/);
  assert.match(prompt, /effortlessly/);
  assert.match(prompt, /streamline/);
  assert.match(prompt, /seamless/);
  assert.match(prompt, /in 15 minutes/);
  assert.match(prompt, /could be useful if weekly planning feels scattered/);
});

test("Cold Email Outreach Pre-Send Verification is conditional and never None-only", () => {
  assert.match(prompt, /## 7\. Pre-Send Verification/);
  assert.match(prompt, /Include this section only when a concrete verification item remains/);
  assert.match(prompt, /When no concrete verification item remains, omit this entire section/);
  assert.match(prompt, /Never output "None," "N\/A," "Not provided," "Not specified," "No notes,"/);
});

test("Cold Email Outreach renders required-only and full-field prompts cleanly", () => {
  const required = requiredValues();
  assert.equal(validateVariableValues(variables, required), null);
  assertCleanRenderedPrompt(fillPromptTemplate(prompt, required));

  const full = fullValues();
  assert.equal(validateVariableValues(variables, full), null);
  const rendered = fillPromptTemplate(prompt, full);
  assertCleanRenderedPrompt(rendered);
  assert.match(rendered, /A free weekly content planner/);
  assert.match(rendered, /Simple reply-to-opt-out line/);
});

test("Cold Email Outreach source prompt and runtime catalog stay in sync", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const template = catalog.find((item) => item.slug === "cold-email-outreach");

  assert.ok(template);
  assert.equal(template.title, "Cold Email Outreach");
  assert.equal(template.prompt.trim(), prompt.trim());
});
