import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildDefaultValues,
  findRenderedPromptIssues,
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

type FacebookFormSchema = {
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
  variables: unknown[];
};

const expectedKeys = [
  "subjectOrOffer",
  "postType",
  "primaryGoal",
  "targetAudience",
  "keyMessage",
  "essentialFacts",
  "outputLanguage",
  "publishingContext",
  "tone",
  "desiredAction",
  "destinationUrl",
  "linkContext",
  "offerDetails",
  "proofPoints",
  "timingDetails",
  "brandVoice",
  "postLength",
  "emojiUse",
  "hashtagUse",
  "variantCount",
  "includeVisualConcept",
  "relationshipType",
  "sensitiveTopic",
  "additionalRequirements",
] as const;

const requiredKeys = [
  "subjectOrOffer",
  "primaryGoal",
  "targetAudience",
  "keyMessage",
  "essentialFacts",
  "outputLanguage",
] as const;

const prompt = readProjectFile("prisma", "template-prompts", "facebook-post.txt");
const schema = readJson<FacebookFormSchema>(
  "src",
  "config",
  "template-forms",
  "facebook-post-variables.json",
);
const variables = parseTemplateVariables(schema.variables);

function getField(key: string): TemplateVariable {
  const field = variables.find((variable) => variable.key === key);
  assert.ok(field, `Missing field ${key}`);
  return field;
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

test("Facebook Post prompt is replaced with the approved 24-variable prompt", () => {
  assert.match(prompt, /senior Facebook copywriter/);
  assert.match(prompt, /Subject or offer:\n\{\{subjectOrOffer\}\}/);
  assert.match(prompt, /Commercial relationship:\n\{\{relationshipType\}\}/);
  assert.match(prompt, /SENSITIVE AND HIGH-STAKES SUBJECTS/);
  assert.match(prompt, /OUTPUT FORMAT/);

  assert.doesNotMatch(prompt, /experienced Facebook content strategist/);
  assert.doesNotMatch(prompt, /Internal post name:\s*\{\{postName\}\}/);
  assert.doesNotMatch(prompt, /POST INFORMATION/);
  assert.doesNotMatch(prompt, /\{\{topic\}\}/);
  assert.doesNotMatch(prompt, /\{\{sourceDetails\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("Facebook Post form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "facebook-post");
  assert.equal(schema.title, "Facebook Post");
  assert.equal(schema.fieldCount, 24);
  assert.equal(variables.length, 24);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "topic",
    "primaryObjective",
    "postName",
    "publishingDestination",
    "preferredLength",
    "sourceDetails",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("Facebook Post field groups and metadata follow the new compact schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    ["essentials", "message_conversion", "brand_delivery", "trust_restrictions"],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 10);
  assert.equal(
    variables.filter((field) => field.group === "message_conversion").length,
    5,
  );
  assert.equal(
    variables.filter((field) => field.group === "brand_delivery").length,
    6,
  );
  assert.equal(
    variables.filter((field) => field.group === "trust_restrictions").length,
    3,
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

test("Facebook Post special field behavior matches the specification", () => {
  assert.deepEqual(getField("postType").options, [
    "Auto",
    "Story or update",
    "Educational tip",
    "Announcement",
    "Question or discussion",
    "Promotion or offer",
    "Link share",
    "Event update",
  ]);
  assert.deepEqual(getField("primaryGoal").options, [
    "Awareness",
    "Engagement",
    "Website traffic",
    "Leads or messages",
    "Sales or bookings",
    "Community update",
    "Education",
    "Event response",
  ]);

  const destinationUrl = getField("destinationUrl");
  assert.equal(destinationUrl.type, "text");
  assert.equal(destinationUrl.format, "url");
  assert.equal(destinationUrl.maxLength, 500);

  const linkContext = getField("linkContext");
  assert.deepEqual(linkContext.showWhen, {
    key: "destinationUrl",
    isValidUrl: true,
  });

  const includeVisualConcept = getField("includeVisualConcept");
  assert.equal(includeVisualConcept.type, "select");
  assert.deepEqual(includeVisualConcept.options, ["On", "Off"]);
  assert.equal(includeVisualConcept.defaultValue, "On");

  const variantCount = getField("variantCount");
  assert.equal(variantCount.type, "number");
  assert.equal(variantCount.min, 1);
  assert.equal(variantCount.max, 3);
  assert.equal(variantCount.defaultValue, "1");
});

test("Facebook Post validation enforces required, URL, select, length, and number rules", () => {
  const values = {
    ...buildDefaultValues(variables),
    subjectOrOffer: "New scheduling feature",
    primaryGoal: "Engagement",
    targetAudience: "Small business owners who publish Facebook updates weekly",
    keyMessage: "Scheduling helps them plan posts without rushing.",
    essentialFacts: "The feature is available in beta and supports Facebook Page posts.",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, { ...values, subjectOrOffer: "" }) ?? "",
    /What is the post about\?/,
  );
  assert.match(
    validateVariableValues(variables, { ...values, postType: "Viral bait" }) ?? "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      subjectOrOffer: "x".repeat(201),
    }) ?? "",
    /200 characters or fewer/,
  );
  assert.match(
    validateVariableValues(variables, { ...values, variantCount: "4" }) ?? "",
    /at most 3/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      destinationUrl: "not-a-url",
    }) ?? "",
    /valid URL/,
  );
});

test("Facebook Post conditional fields render only when relevant", () => {
  const values = buildDefaultValues(variables);
  const linkContext = getField("linkContext");
  const offerDetails = getField("offerDetails");

  assert.equal(isTemplateFieldVisible(linkContext, values), false);
  assert.equal(
    isTemplateFieldVisible(linkContext, {
      ...values,
      destinationUrl: "not-a-url",
    }),
    false,
  );
  assert.equal(
    isTemplateFieldVisible(linkContext, {
      ...values,
      destinationUrl: "https://www.creatornivo.com/pricing",
    }),
    true,
  );

  assert.equal(isTemplateFieldVisible(offerDetails, values), false);
  assert.equal(
    isTemplateFieldVisible(offerDetails, {
      ...values,
      postType: "Promotion or offer",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(offerDetails, {
      ...values,
      primaryGoal: "Sales or bookings",
    }),
    true,
  );
});

test("Facebook Post prompt filling does not invent optional placeholders", () => {
  const values = {
    ...buildDefaultValues(variables),
    subjectOrOffer: "A beta product update",
    targetAudience: "Solo founders who use Facebook Pages",
    keyMessage: "The update helps them write more consistent posts.",
    essentialFacts: "Creatornivo is in Early Access Beta.",
    destinationUrl: "",
    linkContext: "",
    offerDetails: "",
    proofPoints: "",
    timingDetails: "",
  };
  const filled = fillPromptTemplate(prompt, values);

  assert.doesNotMatch(filled, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(filled, /\[[a-zA-Z0-9_]+\]/);
  assert.doesNotMatch(filled, /\bundefined\b/i);
  assert.doesNotMatch(filled, /\bnull\b/i);
  assert.doesNotMatch(filled, /\bN\/A\b/i);
});

test("Facebook Post rendering removes an empty optional offerDetails input block", () => {
  const values = {
    ...buildDefaultValues(variables),
    subjectOrOffer: "A beta product update",
    targetAudience: "Solo founders who use Facebook Pages",
    keyMessage: "The update helps them write more consistent posts.",
    essentialFacts: "Creatornivo is in Early Access Beta.",
    primaryGoal: "Sales or bookings",
    offerDetails: "",
  };

  assert.equal(validateVariableValues(variables, values), null);

  const filled = fillPromptTemplate(prompt, values);
  const issues = findRenderedPromptIssues(filled, variables);

  assert.equal(issues.unresolvedVariables.includes("offerDetails"), false);
  assert.deepEqual(issues.unsafeTokens, []);
  assert.doesNotMatch(filled, /Offer details:\s*(?:\r?\n){1,2}Approved proof points:/);
});

test("Facebook Post rendering includes a filled offerDetails value", () => {
  const values = {
    ...buildDefaultValues(variables),
    subjectOrOffer: "A beta product update",
    targetAudience: "Solo founders who use Facebook Pages",
    keyMessage: "The update helps them write more consistent posts.",
    essentialFacts: "Creatornivo is in Early Access Beta.",
    primaryGoal: "Sales or bookings",
    offerDetails:
      "Early Access founding price is available for a limited time.",
  };

  assert.equal(validateVariableValues(variables, values), null);

  const filled = fillPromptTemplate(prompt, values);
  const issues = findRenderedPromptIssues(filled, variables);

  assert.deepEqual(issues.unresolvedVariables, []);
  assert.deepEqual(issues.unsafeTokens, []);
  assert.match(filled, /Offer details:\nEarly Access founding price is available/);
});

test("Facebook Post catalog, summary, builder, and Help integration are in sync", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const template = catalog.find((item) => item.slug === "facebook-post");
  assert.ok(template);
  assert.equal(template.title, "Facebook Post");
  assert.equal(
    template.description,
    "Generate conversational Facebook posts with goal-driven messaging, optional link guidance, disclosure handling, variants, and a visual concept.",
  );
  assert.equal(template.category, "facebook_post");
  assert.equal(template.requiredPlan, "free");
  assert.equal(template.prompt.trim(), prompt.trim());
  assert.equal(template.variables.length, 24);
  assert.deepEqual(
    sorted(template.variables.map((field) => (field as { key: string }).key)),
    sorted(expectedKeys),
  );

  const summary = readJson<Array<{ slug: string; vars: number }>>(
    "prisma",
    "templates-summary.json",
  );
  assert.equal(summary.find((item) => item.slug === "facebook-post")?.vars, 24);

  const helpConfig = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpConfig, /"facebook-post": FACEBOOK_POST_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "facebook-post",
    "page.tsx",
  );
  assert.match(guidePage, /templateSlug="facebook-post"/);
  assert.match(guidePage, /facebookPostFormVariables/);
  assert.match(guidePage, /facebookPostFormGroups/);

  const builder = readProjectFile("scripts", "build-facebook-post-form.mjs");
  assert.match(builder, /approved 24-field specification/);
  assert.doesNotMatch(builder, /POST INFORMATION/);
});
