import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { assertGeneratedOutputQuality } from "../src/lib/templates/generation-qa";
import {
  buildDefaultValues,
  fillPromptTemplate,
  parseTemplateVariables,
  validateVariableValues,
} from "../src/lib/templates/utils";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readProjectFile(...parts: string[]): string {
  return readFileSync(path.join(root, ...parts), "utf8");
}

function readJson<T>(...parts: string[]): T {
  return JSON.parse(readProjectFile(...parts)) as T;
}

type CaseStudyFormSchema = {
  slug: string;
  title: string;
  fieldCount: number;
  requiredKeys: string[];
  variables: unknown;
};

type CatalogTemplate = {
  slug: string;
  title: string;
  category: string;
  requiredPlan: string;
  prompt: string;
  variables: Array<{ key: string }>;
};

const prompt = readProjectFile("prisma", "template-prompts", "case-study.txt");
const schema = readJson<CaseStudyFormSchema>(
  "src",
  "config",
  "template-forms",
  "case-study-variables.json",
);
const variables = parseTemplateVariables(schema.variables);

test("Case Study marketing guardrails cover results, quotes, privacy, and testimonials", () => {
  assert.match(prompt, /When \{\{measurableResults\}\} is blank, do not invent numbers/);
  assert.match(prompt, /If no approved quote is supplied, omit direct quotes/);
  assert.match(prompt, /Do not transform \{\{approvedQuotes\}\}[\s\S]*synthetic testimonials/);
  assert.match(prompt, /When \{\{privacyMode\}\} or \{\{restrictionsAndDisclosures\}\} requires suppression/);
  assert.match(prompt, /privacy restrictions and disclosure restrictions are enforced/);
});

test("Case Study renders required inputs without unresolved placeholders", () => {
  const values = {
    ...buildDefaultValues(variables),
    caseStudySubject: "Regional content operations cleanup",
    primaryGoal: "Demonstrate impact",
    targetAudience: "Small content teams with inconsistent publishing processes",
    clientDisplayName: "An anonymized regional services team",
    challengeSummary: "The team had scattered briefs and inconsistent review notes.",
    solutionSummary: "They introduced a shared planning checklist and weekly review rhythm.",
    resultsSummary: "The team reported fewer missed handoffs during the pilot.",
    outputLanguage: "English",
    measurableResults: "",
    approvedQuotes: "",
    privacyMode: "Fully anonymized",
    restrictionsAndDisclosures: 'Avoid "named executive endorsement".',
  };

  assert.equal(validateVariableValues(variables, values), null);

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b|\[object Object\]/i);
  assert.match(rendered, /named executive endorsement/);
});

test("Case Study deterministic QA catches exact restricted phrases and empty sentinel sections", () => {
  const values = {
    restrictionsAndDisclosures: 'Avoid "named executive endorsement".',
  };

  const prohibited = assertGeneratedOutputQuality(
    [
      "# Case Study",
      "",
      "The named executive endorsement proves the workflow worked.",
    ].join("\n"),
    { variables, values },
  );
  assert.equal(prohibited.ok, false);
  assert.ok(
    prohibited.hardFailures.some(
      (issue) => issue.code === "user_prohibited_phrase",
    ),
  );

  const emptySection = assertGeneratedOutputQuality(
    ["## Editorial Verification Notes", "", "None"].join("\n"),
    { variables, values: {} },
  );
  assert.equal(emptySection.ok, false);
  assert.ok(
    emptySection.hardFailures.some(
      (issue) => issue.code === "empty_sentinel_section",
    ),
  );
});

test("Case Study hard-excludes restrictions and bans streamline/transform hype", () => {
  assert.match(prompt, /USER AVOID \/ CLAIM RESTRICTIONS — HARD EXCLUSIONS/);
  assert.match(
    prompt,
    /Treat \{\{restrictionsAndDisclosures\}\} as HARD EXCLUSIONS/,
  );
  assert.match(
    prompt,
    /Do not soften this as “respect,” “consider,” “try to avoid,” or “where possible\.”/,
  );
  assert.match(
    prompt,
    /Matching is case-insensitive: if “streamline” or “transform” is prohibited/,
  );
  assert.match(
    prompt,
    /do not introduce default marketing hype such as unlock, elevate, revolutionary, game-changing, seamless, effortlessly, streamline, transform, boost, increase, or guaranteed/,
  );
  assert.match(
    prompt,
    /\{\{restrictionsAndDisclosures\}\} was treated as HARD EXCLUSIONS/,
  );

  const result = assertGeneratedOutputQuality(
    "The program helped transform delivery and streamline operations.",
    {
      variables,
      values: {
        restrictionsAndDisclosures:
          "Do not use the phrases: streamline, transform.",
      },
    },
  );
  assert.equal(result.ok, false);
  assert.ok(
    result.hardFailures.some(
      (issue) =>
        issue.code === "user_prohibited_phrase" &&
        /streamline|transform/i.test(issue.match ?? ""),
    ),
  );
});

test("Case Study runtime catalog stays synced with the source prompt", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "case-study");

  assert.ok(item, "Catalog should include Case Study");
  assert.equal(item.title, "Case Study");
  assert.equal(item.category, "marketing");
  assert.equal(item.requiredPlan, "pro");
  assert.equal(item.prompt.trim(), prompt.trim());
  assert.equal(item.variables.length, schema.fieldCount);
});
