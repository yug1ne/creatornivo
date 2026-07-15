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

type PaidAdCopyFormSchema = {
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

const prompt = readProjectFile("prisma", "template-prompts", "paid-ad-copy.txt");
const schema = readJson<PaidAdCopyFormSchema>(
  "src",
  "config",
  "template-forms",
  "paid-ad-copy-variables.json",
);
const variables = parseTemplateVariables(schema.variables);

test("Paid Ad Copy guardrails cover prohibited claims, disclosures, regulated wording, and fake proof", () => {
  assert.match(prompt, /USER AVOID \/ CLAIM RESTRICTIONS — HARD EXCLUSIONS/);
  assert.match(
    prompt,
    /Treat \{\{prohibitedClaims\}\} and \{\{additionalRequirements\}\} as HARD EXCLUSIONS/,
  );
  assert.match(
    prompt,
    /Do not soften this as “respect,” “consider,” “try to avoid,” or “where possible\.”/,
  );
  assert.match(
    prompt,
    /Exact prohibited words and phrases from those fields must not appear anywhere in the generated package/,
  );
  assert.match(
    prompt,
    /headlines, primary text, descriptions, and CTAs/,
  );
  assert.match(prompt, /Claim & Policy Review and Implementation Notes/);
  assert.match(
    prompt,
    /Matching is case-insensitive: if “streamline,” “transform,” or “effortlessly” is prohibited/,
  );
  assert.match(
    prompt,
    /if “streamline” is prohibited, do not write “streamlined” or “streamlining”/,
  );
  assert.match(
    prompt,
    /avoid default paid-ad hype such as unlock, elevate, revolutionary, game-changing, seamless, seamlessly, effortless, effortlessly, streamline, transform, boost, increase, guaranteed/,
  );
  assert.match(
    prompt,
    /Prefer concrete verbs: plan, create, organize, draft, choose, save, export, manage, support, compare, and learn/,
  );
  assert.match(prompt, /Do not drop mandatory disclosures to satisfy brevity/);
  assert.match(prompt, /regulated-category handling uses cautious wording without claiming compliance/);
  assert.match(prompt, /Never invent or imply statistics[\s\S]*campaign performance[\s\S]*discounts[\s\S]*deadlines[\s\S]*scarcity/);
  assert.match(
    prompt,
    /\{\{prohibitedClaims\}\} and \{\{additionalRequirements\}\} were treated as HARD EXCLUSIONS/,
  );
});

test("Paid Ad Copy blocks streamline/transform/effortlessly when user lists them", () => {
  const values = {
    prohibitedClaims:
      "Do not use the phrases: streamline, transform, effortlessly.",
  };

  for (const sample of [
    "Headline: Transform your content workflow effortlessly.",
    "Primary text: Streamline weekly planning with one reusable structure.",
    "Description: Effortlessly plan hooks, CTAs, and notes.",
    "Implementation note: Avoided claims that used streamline language.",
  ]) {
    const result = assertGeneratedOutputQuality(sample, { variables, values });
    assert.equal(result.ok, false, `expected hard fail for: ${sample}`);
    assert.ok(
      result.hardFailures.some(
        (issue) =>
          issue.code === "user_prohibited_phrase" &&
          /streamline|transform|effortlessly/i.test(issue.match ?? ""),
      ),
      `missing prohibited-phrase fail for: ${sample}`,
    );
  }

  const clean = assertGeneratedOutputQuality(
    [
      "Headline: Plan weekly content from one structure.",
      "Primary text: Organize hooks, CTAs, and notes in one place.",
      "Description: Draft next week’s posts with reusable prompts.",
    ].join("\n"),
    { variables, values },
  );
  assert.equal(clean.ok, true);
});

test("Paid Ad Copy renders required inputs without unresolved placeholders", () => {
  const values = {
    ...buildDefaultValues(variables),
    adPlatform: "Google Search Ads",
    productOrOffer: "A content workflow planner for solo creators",
    campaignGoal: "Lead generation",
    targetAudience: "Solo creators who plan content weekly",
    coreValueProposition: "Reuse structured prompts instead of starting from a blank page.",
    outputLanguage: "English",
    mandatoryDisclosures: "Beta product. Terms apply.",
    prohibitedClaims: 'Avoid "instant guaranteed revenue".',
    regulatedCategory: "None",
  };

  assert.equal(validateVariableValues(variables, values), null);

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b|\[object Object\]/i);
  assert.match(rendered, /instant guaranteed revenue/);
});

test("Paid Ad Copy deterministic QA catches exact prohibited claims, missing disclosures, and empty sections", () => {
  const values = {
    prohibitedClaims: 'Avoid "instant guaranteed revenue".',
  };

  const prohibited = assertGeneratedOutputQuality(
    "Headline: Instant guaranteed revenue for creators.",
    { variables, values },
  );
  assert.equal(prohibited.ok, false);
  assert.ok(
    prohibited.hardFailures.some(
      (issue) => issue.code === "user_prohibited_phrase",
    ),
  );

  const disclosureMissing = assertGeneratedOutputQuality(
    "Primary text: Plan next week of content from one reusable structure.",
    {
      variables,
      values: {},
      requiredDisclosurePhrases: ["Beta product. Terms apply."],
    },
  );
  assert.equal(disclosureMissing.ok, false);
  assert.ok(
    disclosureMissing.hardFailures.some(
      (issue) => issue.code === "required_disclosure_missing",
    ),
  );

  const emptySection = assertGeneratedOutputQuality(
    ["## Implementation Notes", "", "N/A"].join("\n"),
  );
  assert.equal(emptySection.ok, false);
  assert.ok(
    emptySection.hardFailures.some(
      (issue) => issue.code === "empty_sentinel_section",
    ),
  );
});

test("Paid Ad Copy runtime catalog stays synced with the source prompt", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "paid-ad-copy");

  assert.ok(item, "Catalog should include Paid Ad Copy");
  assert.equal(item.title, "Paid Ad Copy");
  assert.equal(item.category, "marketing");
  assert.equal(item.requiredPlan, "pro");
  assert.equal(item.prompt.trim(), prompt.trim());
  assert.equal(item.variables.length, schema.fieldCount);
});
