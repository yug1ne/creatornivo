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

type TelegramPostFormSchema = {
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
  "topicOrOffer",
  "primaryGoal",
  "targetAudience",
  "keyMessage",
  "factsAndDetails",
  "postFormat",
  "outputLanguage",
  "channelContext",
  "lengthPreference",
  "ctaGoal",
  "tone",
  "brandVoice",
  "emojiUse",
  "formattingMode",
  "destinationUrl",
  "buttonText",
  "timingDetails",
  "hashtagPreference",
  "evidenceAndSources",
  "disclosuresAndRestrictions",
  "numberOfVariants",
  "additionalContext",
] as const;

const requiredKeys = [
  "topicOrOffer",
  "primaryGoal",
  "targetAudience",
  "keyMessage",
  "factsAndDetails",
] as const;

const prompt = readProjectFile("prisma", "template-prompts", "telegram-post.txt");
const schema = readJson<TelegramPostFormSchema>(
  "src",
  "config",
  "template-forms",
  "telegram-post-variables.json",
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

test("Telegram Post prompt is replaced with the approved 22-variable prompt", () => {
  assert.match(prompt, /senior Telegram channel editor/);
  assert.match(prompt, /Topic or offer: \{\{topicOrOffer\}\}/);
  assert.match(prompt, /Primary goal: \{\{primaryGoal\}\}/);
  assert.match(prompt, /Destination URL: \{\{destinationUrl\}\}/);
  assert.match(prompt, /Number of variants: \{\{numberOfVariants\}\}/);
  assert.match(prompt, /## Publishing Check/);
  assert.match(prompt, /FINAL CHECK/);

  assert.doesNotMatch(prompt, /experienced Telegram channel editor/);
  assert.doesNotMatch(prompt, /CHANNEL INFORMATION/);
  assert.doesNotMatch(prompt, /\{\{topic\}\}/);
  assert.doesNotMatch(prompt, /\{\{audience\}\}/);
  assert.doesNotMatch(prompt, /\{\{goal\}\}/);
  assert.doesNotMatch(prompt, /\{\{postType\}\}/);
  assert.doesNotMatch(prompt, /\{\{mainMessage\}\}/);
  assert.doesNotMatch(prompt, /\{\{desiredAction\}\}/);
  assert.doesNotMatch(prompt, /\{\{language\}\}/);
  assert.doesNotMatch(prompt, /\{\{sourceDetails\}\}/);
  assert.doesNotMatch(prompt, /\{\{link\}\}/);
  assert.doesNotMatch(prompt, /\{\{buttonLabel\}\}/);
  assert.doesNotMatch(prompt, /\{\{pollRequired\}\}/);
  assert.doesNotMatch(prompt, /\{\{emojiPreference\}\}/);
  assert.doesNotMatch(prompt, /\{\{disclosure\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("Telegram Post form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "telegram-post");
  assert.equal(schema.title, "Telegram Post");
  assert.equal(schema.fieldCount, 22);
  assert.equal(variables.length, 22);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "topic",
    "audience",
    "goal",
    "postType",
    "mainMessage",
    "desiredAction",
    "channelName",
    "language",
    "sourceDetails",
    "link",
    "buttonLabel",
    "pollRequired",
    "emojiPreference",
    "disclosure",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("Telegram Post groups and help metadata follow the Compact schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    ["essentials", "message_voice", "links_publishing", "accuracy_output"],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 10);
  assert.equal(variables.filter((field) => field.group === "message_voice").length, 4);
  assert.equal(
    variables.filter((field) => field.group === "links_publishing").length,
    4,
  );
  assert.equal(
    variables.filter((field) => field.group === "accuracy_output").length,
    4,
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

test("Telegram Post options, URL field, and conditional button match the specification", () => {
  assert.deepEqual(getField("primaryGoal").options, [
    "Inform or update",
    "Announce news",
    "Educate or explain",
    "Promote an offer",
    "Drive traffic",
    "Build engagement",
    "Invite or organize",
    "Share opinion or story",
    "Recruit or hire",
  ]);
  assert.deepEqual(getField("postFormat").options, [
    "Auto",
    "Text post",
    "Media caption",
  ]);
  assert.deepEqual(getField("lengthPreference").options, [
    "Auto",
    "Brief",
    "Standard",
    "Detailed",
    "Maximum safe",
  ]);
  assert.deepEqual(getField("ctaGoal").options, [
    "Auto",
    "No CTA",
    "Open link",
    "Reply or comment",
    "Join channel or group",
    "Register or sign up",
    "Download",
    "Buy or order",
    "Vote or react",
    "Save or share",
  ]);
  assert.deepEqual(getField("emojiUse").options, [
    "Auto",
    "None",
    "Minimal",
    "Moderate",
  ]);
  assert.deepEqual(getField("formattingMode").options, [
    "Auto",
    "Plain text",
    "Telegram HTML",
    "MarkdownV2",
    "Manual editor",
  ]);
  assert.deepEqual(getField("hashtagPreference").options, [
    "Auto",
    "None",
    "1–3 relevant",
    "Use tags from facts",
  ]);
  assert.deepEqual(getField("numberOfVariants").options, ["1", "2", "3"]);

  const destinationUrl = getField("destinationUrl");
  assert.equal(destinationUrl.type, "text");
  assert.equal(destinationUrl.format, "url");
  assert.equal(destinationUrl.placeholder, "https://www.creatornivo.com/updates");

  const buttonText = getField("buttonText");
  assert.equal(
    isTemplateFieldVisible(buttonText, {
      destinationUrl: "https://www.creatornivo.com/updates",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(buttonText, { destinationUrl: "" }),
    false,
  );
  assert.equal(
    isTemplateFieldVisible(buttonText, { destinationUrl: "not-a-url" }),
    false,
  );
});

test("Telegram Post validation and prompt rendering use form metadata", () => {
  const values = {
    ...buildDefaultValues(variables),
    topicOrOffer: "Creatornivo Early Access update",
    primaryGoal: "Inform or update",
    targetAudience:
      "Existing Creatornivo users and creators following product updates.",
    keyMessage:
      "Password reset and sign-out polish are live, and generation limits are clearer.",
    factsAndDetails:
      "Free plan has 5 generations per UTC day. Pro has 100 generations per UTC month.",
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
      destinationUrl: "not-a-url",
    }) ?? "",
    /valid URL/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      topicOrOffer: "x".repeat(201),
    }) ?? "",
    /200 characters or fewer/,
  );

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b|\bN\/A\b/);
  assert.match(rendered, /Creatornivo Early Access update/);
  assert.match(rendered, /Inform or update/);
  assert.match(rendered, /Clear and natural/);
});

test("Telegram Post catalog and Help integration use the full form", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "telegram-post");
  assert.ok(item, "Catalog should include Telegram Post");
  assert.equal(item.title, "Telegram Post");
  assert.equal(item.category, "community");
  assert.equal(item.requiredPlan, "pro");
  assert.match(item.description, /native spacing, restrained formatting/);
  assert.equal(item.variables.length, 22);
  assert.deepEqual(sorted(item.variables.map((variable) => variable.key)), sorted(expectedKeys));

  const helpButton = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpButton, /TELEGRAM_POST_GUIDE_PATH/);
  assert.match(helpButton, /"telegram-post": TELEGRAM_POST_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "telegram-post",
    "page.tsx",
  );
  assert.match(guidePage, /Telegram Post - field guide/);
  assert.match(guidePage, /templateSlug="telegram-post"/);
});
