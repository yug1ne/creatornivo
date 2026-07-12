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

type WhatsAppBroadcastFormSchema = {
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
  "senderName",
  "broadcastType",
  "subjectOffer",
  "primaryGoal",
  "targetAudience",
  "keyMessage",
  "primaryCTA",
  "destinationLink",
  "outputLanguage",
  "consentConfirmed",
  "audienceRelationship",
  "personalizationMode",
  "personalizationToken",
  "supportingDetails",
  "tone",
  "length",
  "emojiUse",
  "deadlineOrDate",
  "offerTerms",
  "optOutMode",
  "customOptOutText",
  "sensitiveCategory",
  "variantCount",
  "additionalRequirements",
] as const;

const requiredKeys = [
  "senderName",
  "subjectOffer",
  "primaryGoal",
  "targetAudience",
  "keyMessage",
  "consentConfirmed",
] as const;

const prompt = readProjectFile(
  "prisma",
  "template-prompts",
  "whatsapp-broadcast.txt",
);
const schema = readJson<WhatsAppBroadcastFormSchema>(
  "src",
  "config",
  "template-forms",
  "whatsapp-broadcast-variables.json",
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

test("WhatsApp Broadcast prompt is replaced with the approved 24-variable prompt", () => {
  assert.match(prompt, /senior WhatsApp copywriter/);
  assert.match(prompt, /Sender or business name: \{\{senderName\}\}/);
  assert.match(prompt, /Recipient consent confirmed: \{\{consentConfirmed\}\}/);
  assert.match(prompt, /First-name token: \{\{personalizationToken\}\}/);
  assert.match(prompt, /Custom opt-out text: \{\{customOptOutText\}\}/);
  assert.match(prompt, /## Send-ready broadcasts/);
  assert.match(prompt, /## Verification notes/);
  assert.match(prompt, /FINAL QUALITY CHECK/);

  assert.doesNotMatch(prompt, /experienced WhatsApp lifecycle strategist/);
  assert.doesNotMatch(prompt, /CAMPAIGN INFORMATION/);
  assert.doesNotMatch(prompt, /\{\{campaignName\}\}/);
  assert.doesNotMatch(prompt, /\{\{campaignType\}\}/);
  assert.doesNotMatch(prompt, /\{\{campaignGoal\}\}/);
  assert.doesNotMatch(prompt, /\{\{mainMessage\}\}/);
  assert.doesNotMatch(prompt, /\{\{desiredAction\}\}/);
  assert.doesNotMatch(prompt, /\{\{audience\}\}/);
  assert.doesNotMatch(prompt, /\{\{language\}\}/);
  assert.doesNotMatch(prompt, /\{\{sourceDetails\}\}/);
  assert.doesNotMatch(prompt, /\{\{startDate\}\}/);
  assert.doesNotMatch(prompt, /\{\{messageCount\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("WhatsApp Broadcast form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "whatsapp-broadcast");
  assert.equal(schema.title, "WhatsApp Broadcast");
  assert.equal(schema.fieldCount, 24);
  assert.equal(variables.length, 24);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "campaignName",
    "campaignType",
    "campaignGoal",
    "mainMessage",
    "desiredAction",
    "audience",
    "language",
    "sourceDetails",
    "startDate",
    "messageCount",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("WhatsApp Broadcast groups and help metadata follow the Compact schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    [
      "essentials",
      "audience_personalization",
      "message_style_timing",
      "compliance_output",
    ],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 10);
  assert.equal(
    variables.filter((field) => field.group === "audience_personalization").length,
    3,
  );
  assert.equal(
    variables.filter((field) => field.group === "message_style_timing").length,
    5,
  );
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

test("WhatsApp Broadcast options, conditional fields, and type adaptations match the specification", () => {
  assert.deepEqual(getField("broadcastType").options, [
    "Announcement",
    "Promotion or offer",
    "Event or reminder",
    "Product or service update",
    "Useful content or tip",
    "Operational notice",
  ]);
  assert.deepEqual(getField("primaryGoal").options, [
    "Inform recipients",
    "Drive clicks",
    "Get replies",
    "Drive purchase or booking",
    "Confirm an action",
    "Re-engage the audience",
  ]);
  assert.deepEqual(getField("consentConfirmed").options, ["On", "Off"]);
  assert.equal(getField("consentConfirmed").type, "select");
  assert.deepEqual(getField("personalizationMode").options, [
    "None",
    "First-name token",
    "Segment-level wording",
  ]);
  assert.deepEqual(getField("optOutMode").options, [
    "Auto",
    "Always include",
    "Custom wording",
    "Omit only when appropriate",
  ]);
  assert.deepEqual(getField("variantCount").options, ["1", "2", "3"]);

  const destinationLink = getField("destinationLink");
  assert.equal(destinationLink.type, "text");
  assert.equal(destinationLink.format, "url");

  assert.equal(
    isTemplateFieldVisible(getField("personalizationToken"), {
      personalizationMode: "First-name token",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("personalizationToken"), {
      personalizationMode: "None",
    }),
    false,
  );
  assert.equal(
    isTemplateFieldVisible(getField("deadlineOrDate"), {
      broadcastType: "Promotion or offer",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("deadlineOrDate"), {
      broadcastType: "Announcement",
    }),
    false,
  );
  assert.equal(
    isTemplateFieldVisible(getField("offerTerms"), {
      broadcastType: "Promotion or offer",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("customOptOutText"), {
      optOutMode: "Custom wording",
    }),
    true,
  );
});

test("WhatsApp Broadcast validation and prompt rendering use form metadata", () => {
  const values = {
    ...buildDefaultValues(variables),
    senderName: "Northside Studio",
    subjectOffer: "New booking slots for August",
    primaryGoal: "Drive purchase or booking",
    targetAudience:
      "Existing customers who booked a service in the past six months.",
    keyMessage:
      "August booking slots are now open. Weekend appointments are limited and can be reserved through the booking page.",
    consentConfirmed: "On",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, { ...values, primaryGoal: "Unknown" }) ??
      "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      destinationLink: "not-a-url",
    }) ?? "",
    /valid URL/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      optOutMode: "Custom wording",
      customOptOutText: "x".repeat(201),
    }) ?? "",
    /200 characters or fewer/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      consentConfirmed: "Maybe",
    }) ?? "",
    /available options/,
  );

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b/);
  assert.match(rendered, /Northside Studio/);
  assert.match(rendered, /New booking slots for August/);
  assert.match(rendered, /Recipient consent confirmed: On/);
});

test("WhatsApp Broadcast catalog and Help integration use the full form", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "whatsapp-broadcast");
  assert.ok(item, "Catalog should include WhatsApp Broadcast");
  assert.equal(item.title, "WhatsApp Broadcast");
  assert.equal(item.category, "community");
  assert.equal(item.requiredPlan, "pro");
  assert.match(item.description, /consent-aware WhatsApp broadcasts/);
  assert.equal(normalizeLineEndings(item.prompt), normalizeLineEndings(prompt));
  assert.equal(item.variables.length, 24);
  assert.deepEqual(sorted(item.variables.map((variable) => variable.key)), sorted(expectedKeys));

  const helpButton = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpButton, /WHATSAPP_BROADCAST_GUIDE_PATH/);
  assert.match(helpButton, /"whatsapp-broadcast": WHATSAPP_BROADCAST_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "whatsapp-broadcast",
    "page.tsx",
  );
  assert.match(guidePage, /WhatsApp Broadcast - field guide/);
  assert.match(guidePage, /templateSlug="whatsapp-broadcast"/);
});
