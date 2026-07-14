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

type ProductDescriptionFormSchema = {
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
  "product-description.txt",
);
const schema = readJson<ProductDescriptionFormSchema>(
  "src",
  "config",
  "template-forms",
  "product-description-variables.json",
);
const variables = parseTemplateVariables(schema.variables);

const OUTPUT_CONTRACT_HEADINGS = [
  "## Product Title Options",
  "## Short Product Summary",
  "## Main Product Description",
  "## Key Benefits",
  "## Key Features",
  "## Specifications and Product Details",
  "## Purchase Information",
  "## Primary CTA",
  "## SEO Elements",
  "## Verification Notes",
] as const;

test("Product Description prompt treats claims and additional requirements as hard restrictions", () => {
  assert.match(
    prompt,
    /Treat \{\{claimsRestrictions\}\} and \{\{additionalRequirements\}\} as hard user restrictions/,
  );
  assert.match(
    prompt,
    /do not use those exact words or phrases anywhere in the package/,
  );
  assert.match(
    prompt,
    /if “streamline” is prohibited, do not write “streamlined” or “streamlining”/,
  );
  assert.match(
    prompt,
    /Claims and restrictions and Additional requirements were treated as hard exclusions/,
  );
});

test("Product Description prompt forbids common unsupported marketing hype", () => {
  assert.match(
    prompt,
    /streamline, streamlined, effortlessly, seamless, seamlessly, transform, boost, enhance/,
  );
  assert.match(
    prompt,
    /guaranteed, save time, capture attention, drive engagement, increase sales/,
  );
  assert.match(
    prompt,
    /never run out, take the uncertainty out, and clarity and ease/,
  );
  assert.match(
    prompt,
    /boosts engagement, increases sales, drives growth, or guarantees outcomes/,
  );
});

test("Product Description prompt prefers grounded verbs and possible-use framing", () => {
  assert.match(
    prompt,
    /Frame benefits as possible uses or supported capabilities, not guaranteed outcomes/,
  );
  assert.match(
    prompt,
    /organize, keep in one place, outline, plan, draft, review, use, include, and support/,
  );
  assert.match(
    prompt,
    /Use the 10 hook starters as prompts for drafting post openings/,
  );
  assert.match(
    prompt,
    /Keep content ideas, calls to action, and campaign notes in one place/,
  );
  assert.match(
    prompt,
    /When the product is a free digital planner, checklist, template pack, or similar resource/,
  );
});

test("Product Description prompt forbids invented proof, urgency, and commercial claims", () => {
  assert.match(prompt, /Do not invent or embellish:/);
  assert.match(prompt, /reviews;/);
  assert.match(prompt, /ratings;/);
  assert.match(prompt, /testimonials;/);
  assert.match(prompt, /statistics;/);
  assert.match(prompt, /fake discounts;/);
  assert.match(prompt, /invented deadlines;/);
  assert.match(prompt, /“selling fast” claims;/);
  assert.match(
    prompt,
    /no price, offer, review, rating, testimonial, certification, statistic, performance result/,
  );
});

test("Product Description prompt forbids empty None\/N\/A sections and keeps output contract", () => {
  assert.match(
    prompt,
    /do not write “not provided,” “unknown,” “N\/A,” or similar wording/,
  );
  assert.match(prompt, /do not create a heading for an empty section/);
  assert.match(
    prompt,
    /no None \/ N\/A \/ Not provided-only section appears/,
  );
  assert.match(
    prompt,
    /When no material verification issue exists, omit the section entirely/,
  );

  for (const heading of OUTPUT_CONTRACT_HEADINGS) {
    assert.match(prompt, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("Product Description renders required inputs without unresolved placeholders", () => {
  const values = {
    ...buildDefaultValues(variables),
    productName: "Creatornivo Weekly Content Planner",
    productFormat: "Digital product",
    productCategory: "Digital download / content planning tool",
    targetAudience: "Solo creators who plan social posts weekly",
    primaryGoal: "Explain the product clearly",
    coreProductFacts:
      "A free PDF planner with weekly pages, 10 hook starters, CTA prompts, and campaign notes.",
    topBenefits:
      "Keep ideas in one place; outline weekly posts; draft openings with prompt starters.",
    claimsRestrictions:
      "Avoid the words: streamline, transform, effortlessly, seamless, guaranteed, boost engagement.",
    additionalRequirements: "Do not invent reviews or sales results.",
    priceOfferInfo: "",
    proofCredentials: "",
  };

  assert.equal(validateVariableValues(variables, values), null);

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b|\[object Object\]/i);
  assert.match(rendered, /Avoid the words: streamline/);
  assert.match(rendered, /Do not invent reviews or sales results/);
  assert.match(rendered, /Creatornivo Weekly Content Planner/);
});

test("Product Description deterministic QA catches prohibited phrases, empty sentinels, and fake commercial invent", () => {
  const values = {
    claimsRestrictions:
      'Avoid the words: streamline, transform, effortlessly, guaranteed.',
    priceOfferInfo: "",
    proofCredentials: "",
  };

  const prohibited = assertGeneratedOutputQuality(
    [
      "## Main Product Description",
      "",
      "This free planner helps creators streamline weekly planning effortlessly.",
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
    ["## Verification Notes", "", "None"].join("\n"),
    { variables, values: {} },
  );
  assert.equal(emptySection.ok, false);
  assert.ok(
    emptySection.hardFailures.some(
      (issue) => issue.code === "empty_sentinel_section",
    ),
  );

  const fakeCommercial = assertGeneratedOutputQuality(
    [
      "## Purchase Information",
      "",
      "Only $9 today. Ends tomorrow. Rated 4.9 stars.",
    ].join("\n"),
    { variables, values },
  );
  assert.equal(fakeCommercial.ok, false);
  assert.ok(
    fakeCommercial.hardFailures.some(
      (issue) =>
        issue.code === "output_validation_issue" ||
        issue.code === "unsupported_commercial_detail" ||
        issue.code === "unsupported_proof_detail" ||
        /price|deadline|urgency|review|rating|testimonial|statistic/i.test(
          issue.message,
        ),
    ),
  );
});

test("Product Description runtime catalog stays synced with the source prompt", () => {
  const catalog = readJson<CatalogTemplate[]>(
    "prisma",
    "templates-catalog.json",
  );
  const item = catalog.find(
    (template) => template.slug === "product-description",
  );

  assert.ok(item, "Catalog should include Product Description");
  assert.equal(item.title, "Product Description");
  assert.equal(item.category, "product");
  assert.equal(item.requiredPlan, "free");
  assert.equal(item.prompt.trim(), prompt.trim());
  assert.equal(item.variables.length, schema.fieldCount);
});
