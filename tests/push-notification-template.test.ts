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

type PushNotificationFormSchema = {
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
  "campaignSubject",
  "primaryGoal",
  "targetAudience",
  "keyMessage",
  "tapDestination",
  "notificationContext",
  "outputLanguage",
  "urgencyLevel",
  "variantCount",
  "timingContext",
  "expirationContext",
  "titleMode",
  "tone",
  "emojiUse",
  "senderName",
  "brandVoice",
  "personalizationTokens",
  "callToActionPreference",
  "sensitiveCategory",
  "jurisdiction",
  "requiredDisclosure",
  "claimsAndRestrictions",
  "additionalRequirements",
] as const;

const requiredKeys = [
  "campaignSubject",
  "primaryGoal",
  "targetAudience",
  "keyMessage",
  "tapDestination",
] as const;

const prompt = readProjectFile(
  "prisma",
  "template-prompts",
  "push-notification.txt",
);
const schema = readJson<PushNotificationFormSchema>(
  "src",
  "config",
  "template-forms",
  "push-notification-variables.json",
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

test("Push Notification prompt is replaced with the approved 23-variable prompt", () => {
  assert.match(prompt, /senior mobile lifecycle copywriter/);
  assert.match(prompt, /Notification subject:\n\{\{campaignSubject\}\}/);
  assert.match(prompt, /Primary goal:\n\{\{primaryGoal\}\}/);
  assert.match(prompt, /Tap destination:\n\{\{tapDestination\}\}/);
  assert.match(prompt, /Sensitive or regulated topic:\n\{\{sensitiveCategory\}\}/);
  assert.match(prompt, /## Campaign inputs/);
  assert.match(prompt, /## Push-notification writing rules/);
  assert.match(prompt, /## Required output format/);
  assert.match(prompt, /## Final quality check/);
  assert.match(prompt, /Output only the completed notification package/);

  assert.doesNotMatch(prompt, /experienced push-notification strategist/);
  assert.doesNotMatch(prompt, /CAMPAIGN INFORMATION/);
  assert.doesNotMatch(prompt, /\{\{mainMessage\}\}/);
  assert.doesNotMatch(prompt, /\{\{audience\}\}/);
  assert.doesNotMatch(prompt, /\{\{desiredAction\}\}/);
  assert.doesNotMatch(prompt, /\{\{appName\}\}/);
  assert.doesNotMatch(prompt, /\{\{campaignType\}\}/);
  assert.doesNotMatch(prompt, /\{\{campaignGoal\}\}/);
  assert.doesNotMatch(prompt, /\{\{language\}\}/);
  assert.doesNotMatch(prompt, /\{\{sourceDetails\}\}/);
  assert.doesNotMatch(prompt, /\{\{restrictions\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("Push Notification form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "push-notification");
  assert.equal(schema.title, "Push Notification");
  assert.equal(schema.fieldCount, 23);
  assert.equal(variables.length, 23);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "mainMessage",
    "audience",
    "desiredAction",
    "appName",
    "campaignType",
    "campaignGoal",
    "language",
    "sourceDetails",
    "restrictions",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("Push Notification groups and help metadata follow the Compact schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    [
      "essentials",
      "message_delivery",
      "brand_personalization",
      "compliance_restrictions",
    ],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 9);
  assert.equal(
    variables.filter((field) => field.group === "message_delivery").length,
    5,
  );
  assert.equal(
    variables.filter((field) => field.group === "brand_personalization").length,
    4,
  );
  assert.equal(
    variables.filter((field) => field.group === "compliance_restrictions").length,
    5,
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

test("Push Notification options, conditional fields, and type adaptations match the specification", () => {
  assert.deepEqual(getField("primaryGoal").options, [
    "Inform",
    "Remind",
    "Drive action",
    "Promote an offer",
    "Re-engage users",
    "Confirm a status",
    "Warn about an issue",
    "Announce an update",
  ]);
  assert.deepEqual(getField("notificationContext").options, [
    "Auto",
    "Transactional",
    "Reminder",
    "Promotional",
    "Product update",
    "Content alert",
    "Service alert",
    "Re-engagement",
  ]);
  assert.deepEqual(getField("urgencyLevel").options, [
    "Low",
    "Normal",
    "High",
    "Critical",
  ]);
  assert.deepEqual(getField("titleMode").options, [
    "Auto",
    "Title and body",
    "Body only",
  ]);
  assert.deepEqual(getField("tone").options, [
    "Clear and natural",
    "Friendly",
    "Professional",
    "Warm",
    "Energetic",
    "Reassuring",
    "Urgent but calm",
    "Playful",
  ]);
  assert.deepEqual(getField("emojiUse").options, [
    "None",
    "Minimal",
    "Moderate",
  ]);
  assert.deepEqual(getField("sensitiveCategory").options, [
    "None",
    "Health or medical",
    "Financial",
    "Legal",
    "Employment",
    "Insurance",
    "Political",
    "Children",
    "Gambling",
    "Other regulated topic",
  ]);

  const variantCount = getField("variantCount");
  assert.equal(variantCount.type, "number");
  assert.equal(variantCount.min, 1);
  assert.equal(variantCount.max, 5);

  assert.equal(
    getField("tapDestination").placeholder,
    "Checkout screen, order details, article page, https://www.creatornivo.com/offers/summer",
  );

  assert.equal(
    isTemplateFieldVisible(getField("jurisdiction"), {
      sensitiveCategory: "Legal",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("jurisdiction"), {
      sensitiveCategory: "None",
    }),
    false,
  );
  assert.equal(
    isTemplateFieldVisible(getField("requiredDisclosure"), {
      sensitiveCategory: "Financial",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("requiredDisclosure"), {
      sensitiveCategory: "None",
    }),
    false,
  );
});

test("Push Notification validation and prompt rendering use form metadata", () => {
  const values = {
    ...buildDefaultValues(variables),
    campaignSubject: "Order update for a confirmed purchase",
    targetAudience:
      "Existing customers waiting for an order update inside the mobile app.",
    keyMessage:
      "The order has shipped and tracking is available from the order details screen.",
    tapDestination: "Order details screen",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, { ...values, primaryGoal: "Unknown" }) ?? "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, { ...values, variantCount: "6" }) ?? "",
    /at most 5/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      campaignSubject: "x".repeat(161),
    }) ?? "",
    /160 characters or fewer/,
  );

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b/);
  assert.match(rendered, /Order update for a confirmed purchase/);
  assert.match(rendered, /Order details screen/);
  assert.match(rendered, /Inform/);
});

test("Push Notification catalog and Help integration use the full form", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "push-notification");
  assert.ok(item, "Catalog should include Push Notification");
  assert.equal(item.title, "Push Notification");
  assert.equal(item.category, "marketing");
  assert.equal(item.requiredPlan, "pro");
  assert.match(item.description, /action-focused mobile or web push notifications/);
  assert.equal(item.variables.length, 23);
  assert.deepEqual(sorted(item.variables.map((variable) => variable.key)), sorted(expectedKeys));

  const helpButton = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpButton, /PUSH_NOTIFICATION_GUIDE_PATH/);
  assert.match(helpButton, /"push-notification": PUSH_NOTIFICATION_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "push-notification",
    "page.tsx",
  );
  assert.match(guidePage, /Push Notification - field guide/);
  assert.match(guidePage, /templateSlug="push-notification"/);
});
