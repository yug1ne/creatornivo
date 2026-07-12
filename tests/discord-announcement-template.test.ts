import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildDefaultValues,
  fillPromptTemplate,
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

type DiscordAnnouncementFormSchema = {
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
  "announcementSubject",
  "announcementType",
  "primaryGoal",
  "targetAudience",
  "keyDetails",
  "outputLanguage",
  "serverContext",
  "dateTimeDetails",
  "primaryLink",
  "desiredAction",
  "publishingMode",
  "tone",
  "messageLength",
  "mentionPreference",
  "channelContext",
  "brandVoice",
  "emojiLevel",
  "formattingStyle",
  "includeShortVersion",
  "verifiedClaims",
  "disclosureText",
  "restrictions",
  "additionalContext",
] as const;

const requiredKeys = [
  "announcementSubject",
  "announcementType",
  "primaryGoal",
  "targetAudience",
  "keyDetails",
  "outputLanguage",
] as const;

const prompt = readProjectFile(
  "prisma",
  "template-prompts",
  "discord-announcement.txt",
);
const schema = readJson<DiscordAnnouncementFormSchema>(
  "src",
  "config",
  "template-forms",
  "discord-announcement-variables.json",
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

test("Discord Announcement prompt is replaced with the approved 23-variable prompt", () => {
  assert.match(prompt, /senior Discord community copywriter/);
  assert.match(prompt, /Subject: \{\{announcementSubject\}\}/);
  assert.match(prompt, /Essential details: \{\{keyDetails\}\}/);
  assert.match(prompt, /Publishing mode: \{\{publishingMode\}\}/);
  assert.match(prompt, /Include short version: \{\{includeShortVersion\}\}/);
  assert.match(prompt, /## READY-TO-POST ANNOUNCEMENT/);
  assert.match(prompt, /## MENTION & PUBLISHING GUIDANCE/);
  assert.match(prompt, /## SHORT VERSION/);
  assert.match(prompt, /FINAL CHECK/);

  assert.doesNotMatch(prompt, /experienced Discord community manager/);
  assert.doesNotMatch(prompt, /SERVER INFORMATION/);
  assert.doesNotMatch(prompt, /\{\{serverName\}\}/);
  assert.doesNotMatch(prompt, /\{\{serverType\}\}/);
  assert.doesNotMatch(prompt, /\{\{serverDescription\}\}/);
  assert.doesNotMatch(prompt, /\{\{audience\}\}/);
  assert.doesNotMatch(prompt, /\{\{topic\}\}/);
  assert.doesNotMatch(prompt, /\{\{mainMessage\}\}/);
  assert.doesNotMatch(prompt, /\{\{goal\}\}/);
  assert.doesNotMatch(prompt, /\{\{language\}\}/);
  assert.doesNotMatch(prompt, /\{\{sourceDetails\}\}/);
  assert.doesNotMatch(prompt, /\{\{customEmoji\}\}/);
  assert.doesNotMatch(prompt, /\{\{threadRequested\}\}/);
  assert.doesNotMatch(prompt, /\{\{pollRequired\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("Discord Announcement form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "discord-announcement");
  assert.equal(schema.title, "Discord Announcement");
  assert.equal(schema.fieldCount, 23);
  assert.equal(variables.length, 23);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "serverName",
    "serverType",
    "serverDescription",
    "audience",
    "topic",
    "mainMessage",
    "goal",
    "language",
    "sourceDetails",
    "customEmoji",
    "threadRequested",
    "pollRequired",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("Discord Announcement groups and help metadata follow the Compact schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    [
      "essentials",
      "message_delivery",
      "brand_formatting",
      "accuracy_restrictions",
    ],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 10);
  assert.equal(
    variables.filter((field) => field.group === "message_delivery").length,
    5,
  );
  assert.equal(
    variables.filter((field) => field.group === "brand_formatting").length,
    4,
  );
  assert.equal(
    variables.filter((field) => field.group === "accuracy_restrictions").length,
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

test("Discord Announcement options and URL/toggle adaptations match the specification", () => {
  assert.deepEqual(getField("announcementType").options, [
    "General update",
    "Event",
    "Product or feature release",
    "Maintenance or outage",
    "Policy or rule change",
    "Community milestone",
    "Promotion or offer",
    "Recruitment or opportunity",
    "Correction or clarification",
    "Emergency or safety notice",
  ]);
  assert.deepEqual(getField("primaryGoal").options, [
    "Inform members",
    "Drive a specific action",
    "Increase event attendance",
    "Explain an important change",
    "Clarify or restore trust",
    "Celebrate with the community",
  ]);
  assert.deepEqual(getField("publishingMode").options, [
    "Auto",
    "Regular server message",
    "Announcement channel (crosspost)",
    "Bot or webhook embed",
  ]);
  assert.deepEqual(getField("mentionPreference").options, [
    "Auto recommendation",
    "No mention",
    "Relevant role mention",
    "Use supplied mention",
    "@here",
    "@everyone",
  ]);
  assert.deepEqual(getField("emojiLevel").options, [
    "None",
    "Minimal",
    "Moderate",
    "Expressive",
  ]);
  assert.deepEqual(getField("includeShortVersion").options, ["Yes", "No"]);
  assert.equal(getField("includeShortVersion").type, "select");

  const primaryLink = getField("primaryLink");
  assert.equal(primaryLink.type, "text");
  assert.equal(primaryLink.format, "url");
});

test("Discord Announcement validation and prompt rendering use form metadata", () => {
  const values = {
    ...buildDefaultValues(variables),
    announcementSubject: "Scheduled dashboard maintenance",
    announcementType: "Maintenance or outage",
    primaryGoal: "Inform members",
    targetAudience: "All active community members",
    keyDetails:
      "Maintenance runs July 18, 2026 from 02:00 to 04:00 UTC. Generation and library access may be unavailable.",
    outputLanguage: "English",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, {
      ...values,
      announcementType: "Launch party",
    }) ?? "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      primaryLink: "not-a-url",
    }) ?? "",
    /valid URL/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      includeShortVersion: "Maybe",
    }) ?? "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      announcementSubject: "x".repeat(161),
    }) ?? "",
    /160 characters or fewer/,
  );

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b/);
  assert.match(rendered, /Scheduled dashboard maintenance/);
  assert.match(rendered, /Maintenance or outage/);
  assert.match(rendered, /All active community members/);
});

test("Discord Announcement catalog and Help integration use the full form", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "discord-announcement");
  assert.ok(item, "Catalog should include Discord Announcement");
  assert.equal(item.title, "Discord Announcement");
  assert.equal(item.category, "community");
  assert.equal(item.requiredPlan, "pro");
  assert.match(item.description, /ready-to-post Discord announcement/);
  assert.equal(normalizeLineEndings(item.prompt), normalizeLineEndings(prompt));
  assert.equal(item.variables.length, 23);
  assert.deepEqual(sorted(item.variables.map((variable) => variable.key)), sorted(expectedKeys));

  const helpButton = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpButton, /DISCORD_ANNOUNCEMENT_GUIDE_PATH/);
  assert.match(
    helpButton,
    /"discord-announcement": DISCORD_ANNOUNCEMENT_GUIDE_PATH/,
  );

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "discord-announcement",
    "page.tsx",
  );
  assert.match(guidePage, /Discord Announcement - field guide/);
  assert.match(guidePage, /templateSlug="discord-announcement"/);
});
