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

type LandingPageCopyFormSchema = {
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

const prompt = readProjectFile(
  "prisma",
  "template-prompts",
  "landing-page-copy.txt",
);
const schema = readJson<LandingPageCopyFormSchema>(
  "src",
  "config",
  "template-forms",
  "landing-page-copy-variables.json",
);
const variables = parseTemplateVariables(schema.variables);

test("Landing Page Copy guardrails cover proof, urgency, privacy, and disclosures", () => {
  assert.match(prompt, /When \{\{proofAvailable\}\} is “Off”/);
  assert.match(prompt, /do not create proof strips, testimonials, logos, reviews, case studies, metrics, ratings, or trust badges/);
  assert.match(prompt, /When \{\{timeSensitiveOffer\}\} is disabled, blank, or unsupported/);
  assert.match(prompt, /Do not turn \{\{privacyOrDataNotes\}\} or \{\{restrictionsAndDisclosures\}\} into broader legal/);
  assert.match(prompt, /proof is used only from \{\{proofDetails\}\}/);
});

test("Landing Page Copy renders required inputs without unresolved placeholders", () => {
  const values = {
    ...buildDefaultValues(variables),
    brandOrCompany: "Creatornivo",
    offerName: "Content workflow planner",
    offerType: "SaaS or software",
    primaryGoal: "Get sign-ups",
    targetAudience: "Solo creators who reuse repeatable content workflows",
    coreProblem: "They rebuild prompts from scratch and lose useful drafts.",
    mainPromise: "A calmer way to start from reusable content structures.",
    proofAvailable: "Off",
    proofDetails: "",
    timeSensitiveOffer: "Off",
    deadlineOrScarcityDetails: "",
    privacyOrDataNotes: "Email is used for account access and support.",
    restrictionsAndDisclosures: 'Avoid "certified legal compliance".',
  };

  assert.equal(validateVariableValues(variables, values), null);

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b|\[object Object\]/i);
  assert.match(rendered, /certified legal compliance/);
});

test("Landing Page Copy deterministic QA catches restricted phrases, missing disclosures, and fake placeholders", () => {
  const values = {
    restrictionsAndDisclosures: 'Avoid "certified legal compliance".',
  };

  const restricted = assertGeneratedOutputQuality(
    "Hero: Certified legal compliance for your entire workflow.",
    { variables, values },
  );
  assert.equal(restricted.ok, false);
  assert.ok(
    restricted.hardFailures.some(
      (issue) => issue.code === "user_prohibited_phrase",
    ),
  );

  const missingDisclosure = assertGeneratedOutputQuality(
    "Start your workflow with a reusable planner.",
    {
      variables,
      values: {},
      requiredDisclosurePhrases: ["Beta product. Terms apply."],
    },
  );
  assert.equal(missingDisclosure.ok, false);
  assert.ok(
    missingDisclosure.hardFailures.some(
      (issue) => issue.code === "required_disclosure_missing",
    ),
  );

  const placeholders = assertGeneratedOutputQuality("CTA: Visit [link].");
  assert.equal(placeholders.ok, false);
  assert.ok(
    placeholders.hardFailures.some((issue) => issue.code === "placeholder_url"),
  );
});

test("Landing Page Copy runtime catalog stays synced with the source prompt", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "landing-page-copy");

  assert.ok(item, "Catalog should include Landing Page Copy");
  assert.equal(item.title, "Landing Page Copy");
  assert.equal(item.category, "marketing");
  assert.equal(item.requiredPlan, "pro");
  assert.equal(item.prompt.trim(), prompt.trim());
  assert.equal(item.variables.length, schema.fieldCount);
});
