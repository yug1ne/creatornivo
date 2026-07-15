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

type KickstarterCampaignFormSchema = {
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
  "projectName",
  "projectCategory",
  "projectSummary",
  "projectPromise",
  "primaryAudience",
  "fundingGoal",
  "fundingCurrency",
  "fundingPurpose",
  "rewardTiers",
  "creatorIdentity",
  "projectStage",
  "outputLanguage",
  "additionalRequirements",
  "originStory",
  "backerProblem",
  "projectSolution",
  "keyDifferences",
  "currentProgress",
  "creatorCredibility",
  "audienceMotivation",
  "evidenceAndValidation",
  "rewardFormat",
  "rewardLimitsAndEarlyBirds",
  "shippingPlan",
  "budgetBreakdown",
  "stretchGoals",
  "campaignDurationDays",
  "plannedLaunchDate",
  "productionPlan",
  "timelineMilestones",
  "fulfillmentPlan",
  "partnersSuppliers",
  "knownRisks",
  "mitigationPlan",
  "prototypeAndManufacturingEvidence",
  "tone",
  "campaignVoice",
  "mediaAssets",
  "campaignVideoApproach",
  "sourceMaterials",
  "sensitiveClaimArea",
  "claimSupport",
  "restrictions",
] as const;

const requiredKeys = [
  "projectName",
  "projectCategory",
  "projectSummary",
  "primaryAudience",
  "fundingGoal",
  "fundingCurrency",
  "fundingPurpose",
  "rewardTiers",
] as const;

const prompt = readProjectFile(
  "prisma",
  "template-prompts",
  "kickstarter-campaign.txt",
);
const schema = readJson<KickstarterCampaignFormSchema>(
  "src",
  "config",
  "template-forms",
  "kickstarter-campaign-variables.json",
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

test("Kickstarter Campaign prompt is replaced with the approved 43-variable prompt", () => {
  assert.match(prompt, /senior Kickstarter campaign strategist/);
  assert.match(prompt, /Project name: \{\{projectName\}\}/);
  assert.match(prompt, /Category: \{\{projectCategory\}\}/);
  assert.match(prompt, /Reward tiers: \{\{rewardTiers\}\}/);
  assert.match(prompt, /Sensitive claim area: \{\{sensitiveClaimArea\}\}/);
  assert.match(prompt, /# 1\. Campaign Direction/);
  assert.match(prompt, /# 10\. Campaign Video Plan/);
  assert.match(prompt, /# 13\. Creator Review Notes/);
  assert.match(prompt, /FINAL CHECK/);

  assert.doesNotMatch(prompt, /experienced Kickstarter campaign strategist/);
  assert.doesNotMatch(prompt, /CAMPAIGN INFORMATION/);
  assert.doesNotMatch(prompt, /\{\{workingTitle\}\}/);
  assert.doesNotMatch(prompt, /\{\{projectDescription\}\}/);
  assert.doesNotMatch(prompt, /\{\{audience\}\}/);
  assert.doesNotMatch(prompt, /\{\{projectGoal\}\}/);
  assert.doesNotMatch(prompt, /\{\{mainBenefit\}\}/);
  assert.doesNotMatch(prompt, /\{\{primaryUseCase\}\}/);
  assert.doesNotMatch(prompt, /\{\{developmentStage\}\}/);
  assert.doesNotMatch(prompt, /\{\{language\}\}/);
  assert.doesNotMatch(prompt, /\{\{sourceDetails\}\}/);
  assert.doesNotMatch(prompt, /\{\{painPoint\}\}/);
  assert.doesNotMatch(prompt, /\{\{desiredOutcome\}\}/);
  assert.doesNotMatch(prompt, /\{\{campaignDuration\}\}/);
  assert.doesNotMatch(prompt, /\{\{launchDate\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("Kickstarter Campaign form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "kickstarter-campaign");
  assert.equal(schema.title, "Kickstarter Campaign");
  assert.equal(schema.fieldCount, 43);
  assert.equal(variables.length, 43);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "workingTitle",
    "projectDescription",
    "audience",
    "projectGoal",
    "mainBenefit",
    "primaryUseCase",
    "developmentStage",
    "language",
    "sourceDetails",
    "painPoint",
    "desiredOutcome",
    "campaignDuration",
    "launchDate",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("Kickstarter Campaign groups and help metadata follow the Complex schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    [
      "essentials",
      "story_positioning",
      "rewards_funding",
      "delivery_risk",
      "voice_media_compliance",
    ],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 13);
  assert.equal(
    variables.filter((field) => field.group === "story_positioning").length,
    8,
  );
  assert.equal(
    variables.filter((field) => field.group === "rewards_funding").length,
    7,
  );
  assert.equal(variables.filter((field) => field.group === "delivery_risk").length, 7);
  assert.equal(
    variables.filter((field) => field.group === "voice_media_compliance").length,
    8,
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

test("Kickstarter Campaign options, conditional fields, and type adaptations match the specification", () => {
  assert.deepEqual(getField("projectCategory").options, [
    "Design & Technology",
    "Games",
    "Film & Video",
    "Publishing & Comics",
    "Music & Performance",
    "Art & Photography",
    "Food & Craft",
    "Fashion",
    "Journalism",
    "Other Creative Project",
  ]);
  assert.deepEqual(getField("rewardFormat").options, [
    "Auto-detect from rewards",
    "Physical",
    "Digital",
    "Experience or service",
    "Mixed",
    "Support without reward",
  ]);
  assert.deepEqual(getField("campaignVideoApproach").options, [
    "Auto",
    "Full 2–3 minute script",
    "Short 60–90 second script",
    "Outline only",
    "No video section",
  ]);
  assert.deepEqual(getField("sensitiveClaimArea").options, [
    "None",
    "Medical or health",
    "Financial or investment",
    "Legal or regulatory",
    "Safety or child-related",
    "Environmental claims",
    "Political or public-interest",
    "Other regulated area",
  ]);

  assert.equal(getField("fundingGoal").type, "number");
  assert.equal(getField("fundingGoal").min, 1);
  assert.equal(getField("campaignDurationDays").type, "number");
  assert.equal(getField("campaignDurationDays").min, 1);
  assert.equal(getField("campaignDurationDays").max, 60);
  assert.equal(getField("plannedLaunchDate").type, "text");
  assert.match(getField("plannedLaunchDate").hint ?? "", /YYYY-MM-DD/);

  assert.equal(
    isTemplateFieldVisible(getField("shippingPlan"), {
      rewardFormat: "Physical",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("shippingPlan"), {
      rewardFormat: "Digital",
    }),
    false,
  );
  assert.equal(
    isTemplateFieldVisible(getField("prototypeAndManufacturingEvidence"), {
      projectCategory: "Design & Technology",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("prototypeAndManufacturingEvidence"), {
      projectCategory: "Games",
    }),
    false,
  );
  assert.equal(
    isTemplateFieldVisible(getField("claimSupport"), {
      sensitiveClaimArea: "Medical or health",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("claimSupport"), {
      sensitiveClaimArea: "None",
    }),
    false,
  );
});

test("Kickstarter Campaign validation and prompt rendering use server form metadata", () => {
  const values = {
    ...buildDefaultValues(variables),
    projectName: "Foldlight Modular Desk Lamp",
    projectCategory: "Design & Technology",
    projectSummary:
      "A modular desk lamp with adjustable light panels for small creative workspaces.",
    primaryAudience:
      "Design-conscious remote workers, students, and creators who need flexible lighting in small rooms.",
    fundingGoal: "25000",
    fundingCurrency: "USD",
    fundingPurpose:
      "Tooling, first production run, quality checks, packaging, and fulfillment preparation.",
    rewardTiers:
      "$10 Supporter update pack; $49 Early lamp kit; $79 Standard lamp kit.",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, {
      ...values,
      projectCategory: "Unknown",
    }) ?? "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      fundingGoal: "0",
    }) ?? "",
    /at least 1/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      campaignDurationDays: "61",
    }) ?? "",
    /at most 60/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      projectName: "x".repeat(121),
    }) ?? "",
    /120 characters or fewer/,
  );

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b/);
  assert.match(rendered, /Foldlight Modular Desk Lamp/);
  assert.match(rendered, /Design & Technology/);
  assert.match(rendered, /25000/);
  assert.match(rendered, /USD/);
});

test("Kickstarter Campaign hard-excludes restrictions and bans streamline/transform hype", () => {
  assert.match(prompt, /USER AVOID \/ CLAIM RESTRICTIONS — HARD EXCLUSIONS/);
  assert.match(
    prompt,
    /Treat \{\{restrictions\}\} and \{\{additionalRequirements\}\} as HARD EXCLUSIONS/,
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
    /do not introduce default campaign hype such as unlock, elevate, revolutionary, game-changing, seamless, effortlessly, streamline, transform, boost, increase, guaranteed/,
  );
  assert.doesNotMatch(prompt, /Respect \{\{restrictions\}\}/);
});

test("Kickstarter Campaign catalog and Help integration use the full form", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "kickstarter-campaign");
  assert.ok(item, "Catalog should include Kickstarter Campaign");
  assert.equal(item.title, "Kickstarter Campaign");
  assert.equal(item.category, "product_launch");
  assert.equal(item.requiredPlan, "pro");
  assert.match(item.description, /credible Kickstarter campaign page/);
  assert.equal(item.variables.length, 43);
  assert.deepEqual(sorted(item.variables.map((variable) => variable.key)), sorted(expectedKeys));
  assert.equal(item.prompt.trim(), prompt.trim());

  const helpButton = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpButton, /KICKSTARTER_CAMPAIGN_GUIDE_PATH/);
  assert.match(helpButton, /"kickstarter-campaign": KICKSTARTER_CAMPAIGN_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "kickstarter-campaign",
    "page.tsx",
  );
  assert.match(guidePage, /Kickstarter Campaign - field guide/);
  assert.match(guidePage, /templateSlug="kickstarter-campaign"/);
});
