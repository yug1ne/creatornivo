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

type EmailSequenceFormSchema = {
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
  "sequenceName",
  "sequenceType",
  "primaryGoal",
  "businessName",
  "offerOrTopic",
  "targetAudience",
  "keyMessage",
  "outputLanguage",
  "emailCount",
  "sequenceDepth",
  "senderName",
  "primaryCta",
  "destinationUrl",
  "consentStatus",
  "awarenessLevel",
  "audiencePain",
  "desiredOutcome",
  "relationshipStage",
  "triggerEvent",
  "commonObjections",
  "personalizationData",
  "keyBenefits",
  "importantDetails",
  "offerTerms",
  "pricingDetails",
  "proofPoints",
  "testimonialsOrQuotes",
  "deadlineOrAvailability",
  "alternativesOrCompetitors",
  "tone",
  "brandVoice",
  "senderPerspective",
  "emailLength",
  "cadenceStyle",
  "timingConstraints",
  "emojiUse",
  "formattingPreferences",
  "regulatedTopic",
  "jurisdiction",
  "restrictions",
  "outputMode",
  "includePlainTextVersions",
  "additionalContext",
] as const;

const requiredKeys = [
  "sequenceName",
  "sequenceType",
  "primaryGoal",
  "businessName",
  "offerOrTopic",
  "targetAudience",
  "keyMessage",
  "outputLanguage",
  "consentStatus",
] as const;

const prompt = readProjectFile("prisma", "template-prompts", "email-sequence.txt");
const schema = readJson<EmailSequenceFormSchema>(
  "src",
  "config",
  "template-forms",
  "email-sequence-variables.json",
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

function valueForField(field: TemplateVariable): string {
  if (field.format === "url") {
    return "https://www.creatornivo.com/email-sequence/cta";
  }

  if (field.type === "number") {
    return field.defaultValue ?? String(field.min ?? 1);
  }

  if (field.type === "select") {
    return field.defaultValue ?? field.options?.[0] ?? "Auto";
  }

  return `${field.label} example`;
}

function requiredOnlyValues(): Record<string, string> {
  const values = buildDefaultValues(variables);

  for (const field of variables) {
    if (field.required) {
      values[field.key] = valueForField(field);
    }
  }

  return values;
}

function fullFieldValues(): Record<string, string> {
  const values = buildDefaultValues(variables);

  for (const field of variables) {
    values[field.key] = valueForField(field);
  }

  values.sequenceName = "Planner nurture sequence";
  values.offerOrTopic = "A free weekly content planner";
  values.primaryCta = "Visit page";
  values.destinationUrl = "https://www.creatornivo.com/planner";
  values.emailCount = "3";
  values.includePlainTextVersions = "Yes";

  return values;
}

function assertCleanRenderedPrompt(rendered: string): void {
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b|\[object Object\]/);
}

test("Email Sequence prompt is replaced with the approved 43-variable prompt", () => {
  assert.match(prompt, /lifecycle email strategist, conversion copywriter/);
  assert.match(prompt, /Sequence name: \{\{sequenceName\}\}/);
  assert.match(prompt, /Consent or contact context: \{\{consentStatus\}\}/);
  assert.match(prompt, /Destination URL: \{\{destinationUrl\}\}/);
  assert.match(prompt, /Output only the requested email-sequence package/);

  assert.doesNotMatch(prompt, /retention editor/);
  assert.doesNotMatch(prompt, /SEQUENCE INFORMATION/);
  assert.doesNotMatch(prompt, /\{\{sequenceGoal\}\}/);
  assert.doesNotMatch(prompt, /\{\{sequenceTrigger\}\}/);
  assert.doesNotMatch(prompt, /\{\{exitCondition\}\}/);
  assert.doesNotMatch(prompt, /\{\{productName\}\}/);
  assert.doesNotMatch(prompt, /\{\{mainOffer\}\}/);
  assert.doesNotMatch(prompt, /\{\{desiredAction\}\}/);
  assert.doesNotMatch(prompt, /\{\{sourceDetails\}\}/);
  assert.doesNotMatch(prompt, /\{\{approvedLinks\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("Email Sequence form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "email-sequence");
  assert.equal(schema.title, "Email Sequence");
  assert.equal(schema.fieldCount, 43);
  assert.equal(variables.length, 43);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "sequenceGoal",
    "sequenceTrigger",
    "exitCondition",
    "audience",
    "audienceSegment",
    "awarenessStage",
    "customerRelationship",
    "previousAction",
    "language",
    "market",
    "productName",
    "productType",
    "productDescription",
    "primaryUseCase",
    "painPoint",
    "benefits",
    "features",
    "differentiator",
    "objections",
    "limitations",
    "mainOffer",
    "desiredAction",
    "pricing",
    "trialDetails",
    "promotion",
    "deadline",
    "eligibility",
    "policyDetails",
    "sourceDetails",
    "approvedQuote",
    "verifiedResults",
    "caseStudy",
    "approvedCustomers",
    "resources",
    "approvedLinks",
    "senderRole",
    "brand",
    "signOffStyle",
    "supportDestination",
    "requiredInformation",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("Email Sequence groups and help metadata follow the Complex schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    [
      "essentials",
      "audience_journey",
      "offer_proof_conversion",
      "brand_delivery",
      "compliance_output",
    ],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 14);
  assert.equal(
    variables.filter((field) => field.group === "audience_journey").length,
    7,
  );
  assert.equal(
    variables.filter((field) => field.group === "offer_proof_conversion").length,
    8,
  );
  assert.equal(variables.filter((field) => field.group === "brand_delivery").length, 8);
  assert.equal(
    variables.filter((field) => field.group === "compliance_output").length,
    6,
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

test("Email Sequence conditions, validation, and technical adaptations match the specification", () => {
  assert.deepEqual(getField("sequenceType").options, [
    "Welcome or onboarding",
    "Lead nurture",
    "Educational drip",
    "Product launch",
    "Sales or promotion",
    "Abandoned cart",
    "Post-purchase",
    "Re-engagement",
    "Event or webinar follow-up",
    "Custom",
  ]);
  assert.deepEqual(getField("primaryGoal").options, [
    "Educate the audience",
    "Build trust",
    "Activate users",
    "Generate sales",
    "Book calls",
    "Drive registrations",
    "Recover checkout",
    "Retain or reactivate",
    "Other",
  ]);

  const emailCount = getField("emailCount");
  assert.equal(emailCount.type, "number");
  assert.equal(emailCount.defaultValue, "5");
  assert.equal(emailCount.min, 2);
  assert.equal(emailCount.max, 10);

  const destinationUrl = getField("destinationUrl");
  assert.equal(destinationUrl.type, "text");
  assert.equal(destinationUrl.format, "url");
  assert.equal(
    isTemplateFieldVisible(destinationUrl, { primaryCta: "Visit page" }),
    true,
  );
  assert.equal(isTemplateFieldVisible(destinationUrl, { primaryCta: "Reply" }), false);

  const triggerEvent = getField("triggerEvent");
  assert.equal(
    isTemplateFieldVisible(triggerEvent, { sequenceType: "Abandoned cart" }),
    true,
  );
  assert.equal(isTemplateFieldVisible(triggerEvent, { sequenceType: "Lead nurture" }), false);

  const deadline = getField("deadlineOrAvailability");
  assert.equal(
    isTemplateFieldVisible(deadline, { sequenceType: "Sales or promotion" }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(deadline, { sequenceType: "Educational drip" }),
    false,
  );

  const jurisdiction = getField("jurisdiction");
  assert.equal(isTemplateFieldVisible(jurisdiction, { regulatedTopic: "Legal" }), true);
  assert.equal(isTemplateFieldVisible(jurisdiction, { regulatedTopic: "None" }), false);

  const commonObjections = getField("commonObjections");
  assert.equal(commonObjections.type, "textarea");
  assert.deepEqual(commonObjections.options, [
    "Price or budget",
    "Time or effort",
    "Trust or credibility",
    "Need or priority",
    "Complexity",
    "Switching risk",
    "Team approval",
    "Timing",
  ]);

  const formattingPreferences = getField("formattingPreferences");
  assert.equal(formattingPreferences.type, "textarea");
  assert.equal(formattingPreferences.defaultValue, "Short paragraphs");

  const includePlainTextVersions = getField("includePlainTextVersions");
  assert.equal(includePlainTextVersions.type, "select");
  assert.deepEqual(includePlainTextVersions.options, ["Yes", "No"]);
  assert.equal(includePlainTextVersions.defaultValue, "No");
});

test("Email Sequence validation and prompt rendering use server-side form metadata", () => {
  const values = {
    ...buildDefaultValues(variables),
    sequenceName: "New customer onboarding",
    sequenceType: "Lead nurture",
    primaryGoal: "Build trust",
    businessName: "Acme Studio",
    offerOrTopic: "Client-management tool for independent designers",
    targetAudience:
      "Independent designers considering their first client-management tool.",
    keyMessage:
      "A calmer way to manage client work without losing creative focus.",
    primaryCta: "Visit page",
    destinationUrl: "https://example.com/product",
    consentStatus: "Confirmed subscribers",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, { ...values, destinationUrl: "not a url" }) ?? "",
    /valid URL/,
  );
  assert.match(
    validateVariableValues(variables, { ...values, emailCount: "11" }) ?? "",
    /at most 10/,
  );

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b|\bN\/A\b/);
  assert.match(rendered, /New customer onboarding/);
  assert.match(rendered, /https:\/\/example\.com\/product/);
});

test("Email Sequence prompt respects plain-text, count, cadence, and missing URL controls", () => {
  assert.match(prompt, /If \{\{includePlainTextVersions\}\} is enabled, this is mandatory/);
  assert.match(prompt, /Label each one "Plain-text version:"/);
  assert.match(prompt, /one matching plain-text version per email/);
  assert.match(prompt, /the number of emails matches \{\{emailCount\}\}/);
  assert.match(prompt, /Recommend timing for each email based on \{\{cadenceStyle\}\}, \{\{timingConstraints\}\}/);
  assert.match(prompt, /No destination URL was supplied\. Add the correct planner link before sending if the CTA requires one\./);
  assert.match(prompt, /do not write renderer-style explanations in the email body/);
});

test("Email Sequence prompt avoids invented unsubscribe details and unsupported hype", () => {
  assert.match(prompt, /Do not invent unsubscribe URLs, sender postal addresses, consent records/);
  assert.match(prompt, /You can unsubscribe anytime/);
  assert.match(prompt, /If the sending platform supplies the unsubscribe link, do not fabricate one/);
  assert.match(prompt, /Unleash Simplicity/);
  assert.match(prompt, /boost your creativity/);
  assert.match(prompt, /save you time/);
  assert.match(prompt, /seamless execution/);
  assert.match(prompt, /unsupported outcome language/);
});

test("Email Sequence renders required-only and full-field prompts cleanly", () => {
  const required = requiredOnlyValues();
  assert.equal(validateVariableValues(variables, required), null);
  assertCleanRenderedPrompt(fillPromptTemplate(prompt, required));

  const full = fullFieldValues();
  assert.equal(validateVariableValues(variables, full), null);
  const rendered = fillPromptTemplate(prompt, full);
  assertCleanRenderedPrompt(rendered);
  assert.match(rendered, /Planner nurture sequence/);
  assert.match(rendered, /A free weekly content planner/);
  assert.match(rendered, /https:\/\/www\.creatornivo\.com\/planner/);
  assert.match(rendered, /Plain-text versions: Yes/);
});

test("Email Sequence catalog and Help integration use the full form", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "email-sequence");
  assert.ok(item, "Catalog should include Email Sequence");
  assert.equal(item.title, "Email Sequence");
  assert.equal(item.category, "email");
  assert.equal(item.requiredPlan, "pro");
  assert.match(item.description, /coherent multi-email sequence/);
  assert.equal(item.variables.length, 43);
  assert.deepEqual(sorted(item.variables.map((variable) => variable.key)), sorted(expectedKeys));

  const helpButton = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpButton, /EMAIL_SEQUENCE_GUIDE_PATH/);
  assert.match(helpButton, /"email-sequence": EMAIL_SEQUENCE_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "email-sequence",
    "page.tsx",
  );
  assert.match(guidePage, /Email Sequence - field guide/);
  assert.match(guidePage, /templateSlug="email-sequence"/);
});
