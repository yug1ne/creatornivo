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

type SalesProposalFormSchema = {
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
  "providerName",
  "clientName",
  "offerName",
  "offerOverview",
  "clientSituation",
  "clientChallenges",
  "desiredOutcomes",
  "decisionAudience",
  "proposalGoal",
  "primaryNextStep",
  "outputLanguage",
  "proposalLength",
  "relationshipStage",
  "industryContext",
  "decisionCriteria",
  "stakeholdersAndRoles",
  "positioningPriority",
  "competitorsOrAlternatives",
  "objectionsAndRisks",
  "deliverables",
  "approachAndMethod",
  "phasesAndMilestones",
  "timeline",
  "proposedStartDate",
  "clientResponsibilities",
  "assumptions",
  "exclusions",
  "includePricing",
  "pricingModel",
  "pricingDetails",
  "currencyAndTax",
  "paymentTerms",
  "optionalAddOns",
  "proposalValidUntil",
  "commercialNotes",
  "differentiators",
  "proofAndCaseExamples",
  "referencesAndSources",
  "brandVoice",
  "tone",
  "outputFeatures",
  "additionalRequirements",
] as const;

const requiredKeys = [
  "providerName",
  "clientName",
  "offerName",
  "offerOverview",
  "clientSituation",
  "clientChallenges",
  "desiredOutcomes",
  "decisionAudience",
  "outputLanguage",
] as const;

const oldKeys = [
  "proposalTitle",
  "solutionSummary",
  "businessOutcomes",
  "solutionName",
  "scopeSummary",
  "totalPrice",
  "language",
  "clientIndustry",
] as const;

const prompt = readProjectFile(
  "prisma",
  "template-prompts",
  "sales-proposal.txt",
);
const schema = readJson<SalesProposalFormSchema>(
  "src",
  "config",
  "template-forms",
  "sales-proposal-variables.json",
);
const variables = parseTemplateVariables(schema.variables);

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

function getField(key: string): TemplateVariable {
  const field = variables.find((variable) => variable.key === key);
  assert.ok(field, `Missing field ${key}`);
  return field;
}

test("Sales Proposal prompt is replaced with the approved 42-variable prompt", () => {
  assert.match(
    prompt,
    /senior B2B sales-proposal strategist, solution consultant, commercial copywriter/,
  );
  assert.match(
    prompt,
    /Build one complete sales proposal for \{\{providerName\}\} to present to \{\{clientName\}\}/,
  );
  assert.match(prompt, /SOURCE INPUTS/);
  assert.match(prompt, /CLIENT-FACING STRUCTURE/);
  assert.match(prompt, /OUTPUT FEATURE HANDLING/);
  assert.match(prompt, /TRUTHFULNESS, ETHICS, AND COMPLIANCE/);
  assert.match(prompt, /OUTPUT INSTRUCTION/);

  assert.doesNotMatch(prompt, /experienced B2B sales-proposal strategist/);
  for (const oldKey of oldKeys) {
    assert.doesNotMatch(prompt, new RegExp(`\\{\\{${oldKey}\\}\\}`));
  }

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("Sales Proposal form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "sales-proposal");
  assert.equal(schema.title, "Sales Proposal");
  assert.equal(schema.fieldCount, 42);
  assert.equal(variables.length, 42);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of oldKeys) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("Sales Proposal groups and Help metadata follow the Standard schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    [
      "essentials",
      "client_strategy",
      "scope_delivery",
      "pricing_commercial_terms",
      "evidence_brand_output",
    ],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 12);
  assert.equal(
    variables.filter((field) => field.group === "client_strategy").length,
    7,
  );
  assert.equal(
    variables.filter((field) => field.group === "scope_delivery").length,
    8,
  );
  assert.equal(
    variables.filter((field) => field.group === "pricing_commercial_terms").length,
    8,
  );
  assert.equal(
    variables.filter((field) => field.group === "evidence_brand_output").length,
    7,
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

test("Sales Proposal options, conditional fields, and type adaptations match the specification", () => {
  assert.deepEqual(getField("proposalGoal").options, [
    "Auto",
    "Win approval",
    "Secure budget",
    "Start a pilot",
    "Replace a provider",
    "Expand an engagement",
    "Renew an agreement",
    "Respond to an RFP",
  ]);
  assert.deepEqual(getField("relationshipStage").options, [
    "Auto",
    "New prospect",
    "After discovery",
    "Requested proposal",
    "Formal RFP",
    "Renewal",
    "Expansion",
    "Partnership discussion",
  ]);
  assert.deepEqual(getField("pricingModel").options, [
    "Auto",
    "Fixed fee",
    "Time and materials",
    "Retainer",
    "Subscription",
    "Per unit",
    "Tiered packages",
    "Custom or mixed",
  ]);
  assert.deepEqual(getField("tone").options, [
    "Auto",
    "Clear and consultative",
    "Confident",
    "Formal",
    "Warm",
    "Technical",
    "Executive",
    "Direct",
  ]);

  assert.equal(getField("includePricing").type, "select");
  assert.deepEqual(getField("includePricing").options, ["Off", "On"]);
  assert.equal(getField("proposedStartDate").type, "text");
  assert.equal(getField("proposedStartDate").maxLength, 10);
  assert.equal(getField("proposalValidUntil").type, "text");
  assert.equal(getField("proposalValidUntil").maxLength, 10);

  const outputFeatures = getField("outputFeatures");
  assert.equal(outputFeatures.type, "textarea");
  assert.deepEqual(outputFeatures.options, [
    "Cover page",
    "Contents",
    "Executive snapshot",
    "Implementation table",
    "Risk table",
    "Acceptance block",
    "Email cover note",
  ]);

  for (const key of [
    "pricingModel",
    "pricingDetails",
    "currencyAndTax",
    "paymentTerms",
    "optionalAddOns",
    "proposalValidUntil",
    "commercialNotes",
  ]) {
    assert.equal(
      isTemplateFieldVisible(getField(key), { includePricing: "On" }),
      true,
      `${key} should be visible when pricing is on`,
    );
    assert.equal(
      isTemplateFieldVisible(getField(key), { includePricing: "Off" }),
      false,
      `${key} should be hidden when pricing is off`,
    );
  }
});

test("Sales Proposal validation and prompt rendering use form metadata", () => {
  const values = {
    ...buildDefaultValues(variables),
    providerName: "Acme Consulting",
    clientName: "Northstar Retail Group",
    offerName: "Customer Support Automation Program",
    offerOverview:
      "A consulting and implementation package for support workflow automation.",
    clientSituation:
      "The client is growing support volume while relying on manual triage.",
    clientChallenges:
      "Slow routing, inconsistent answers, and limited reporting visibility.",
    desiredOutcomes:
      "Faster triage, clearer reporting, and a more consistent customer experience.",
    decisionAudience:
      "Operations director, customer support lead, finance reviewer, and technical evaluator.",
    outputLanguage: "English",
    includePricing: "On",
    pricingModel: "Fixed fee",
    pricingDetails: "Implementation package: $12,000 fixed fee.",
    currencyAndTax: "USD, taxes not included.",
    paymentTerms: "50% on approval and 50% after implementation handoff.",
    proposedStartDate: "2026-09-14",
    proposalValidUntil: "2026-10-01",
    outputFeatures:
      "Executive snapshot, Implementation table, Acceptance block, Email cover note",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, {
      ...values,
      proposalGoal: "Unknown",
    }) ?? "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      proposedStartDate: "September 14, 2026",
    }) ?? "",
    /10 characters or fewer/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      clientName: "x".repeat(161),
    }) ?? "",
    /160 characters or fewer/,
  );
  assert.equal(
    validateVariableValues(variables, {
      ...values,
      includePricing: "Off",
      pricingDetails: "x".repeat(2001),
    }),
    null,
  );

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b/);
  assert.match(rendered, /Acme Consulting/);
  assert.match(rendered, /Northstar Retail Group/);
  assert.match(rendered, /Implementation package: \$12,000 fixed fee\./);
  assert.match(rendered, /Proposal valid until: 2026-10-01/);
});

test("Sales Proposal catalog and Help integration use the full form", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "sales-proposal");
  assert.ok(item, "Catalog should include Sales Proposal");
  assert.equal(item.title, "Sales Proposal");
  assert.equal(item.category, "sales");
  assert.equal(item.requiredPlan, "pro");
  assert.match(item.description, /Client-ready proposal/);
  assert.equal(normalizeLineEndings(item.prompt), normalizeLineEndings(prompt));
  assert.equal(item.variables.length, 42);
  assert.deepEqual(sorted(item.variables.map((variable) => variable.key)), sorted(expectedKeys));

  const helpButton = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpButton, /SALES_PROPOSAL_GUIDE_PATH/);
  assert.match(helpButton, /"sales-proposal": SALES_PROPOSAL_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "sales-proposal",
    "page.tsx",
  );
  assert.match(guidePage, /Sales Proposal - field guide/);
  assert.match(guidePage, /templateSlug="sales-proposal"/);
});
