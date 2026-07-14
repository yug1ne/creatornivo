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
import { assertGeneratedOutputQuality } from "../src/lib/templates/generation-qa";
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

type SmsCampaignFormSchema = {
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
  "senderName",
  "campaignObjective",
  "targetAudience",
  "essentialDetails",
  "recipientPermission",
  "destinationUrl",
  "outputLanguage",
  "tone",
  "variantCount",
  "campaignFormat",
  "offerDetails",
  "importantDate",
  "timingContext",
  "personalizationData",
  "sequenceGap",
  "brandVoiceNotes",
  "requiredWording",
  "restrictions",
  "emojiUse",
  "recipientRegion",
  "optOutMode",
  "customOptOutText",
  "characterTarget",
] as const;

const requiredKeys = [
  "campaignSubject",
  "senderName",
  "campaignObjective",
  "targetAudience",
  "essentialDetails",
  "recipientPermission",
] as const;

const prompt = readProjectFile("prisma", "template-prompts", "sms-campaign.txt");
const schema = readJson<SmsCampaignFormSchema>(
  "src",
  "config",
  "template-forms",
  "sms-campaign-variables.json",
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

test("SMS Campaign prompt is replaced with the approved 24-variable prompt", () => {
  assert.match(prompt, /senior SMS campaign copywriter/);
  assert.match(prompt, /Campaign subject:\n\{\{campaignSubject\}\}/);
  assert.match(prompt, /Recognizable sender name:\n\{\{senderName\}\}/);
  assert.match(
    prompt,
    /Recipient relationship or permission basis:\n\{\{recipientPermission\}\}/,
  );
  assert.match(prompt, /Message length target:\n\{\{characterTarget\}\}/);
  assert.match(prompt, /## Campaign Overview/);
  assert.match(prompt, /## SMS Variants/);
  assert.match(prompt, /## Implementation Checks/);

  assert.doesNotMatch(prompt, /experienced SMS lifecycle strategist/);
  assert.doesNotMatch(prompt, /CAMPAIGN INFORMATION/);
  assert.doesNotMatch(prompt, /\{\{mainMessage\}\}/);
  assert.doesNotMatch(prompt, /\{\{brandName\}\}/);
  assert.doesNotMatch(prompt, /\{\{desiredAction\}\}/);
  assert.doesNotMatch(prompt, /\{\{audience\}\}/);
  assert.doesNotMatch(prompt, /\{\{campaignType\}\}/);
  assert.doesNotMatch(prompt, /\{\{campaignGoal\}\}/);
  assert.doesNotMatch(prompt, /\{\{brandVoice\}\}/);
  assert.doesNotMatch(prompt, /\{\{language\}\}/);
  assert.doesNotMatch(prompt, /\{\{sourceDetails\}\}/);
  assert.doesNotMatch(prompt, /\{\{deadline\}\}/);
  assert.doesNotMatch(prompt, /\{\{restrictedTerms\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("SMS Campaign form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "sms-campaign");
  assert.equal(schema.title, "SMS Campaign");
  assert.equal(schema.fieldCount, 24);
  assert.equal(variables.length, 24);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "mainMessage",
    "brandName",
    "desiredAction",
    "audience",
    "campaignType",
    "campaignGoal",
    "brandVoice",
    "language",
    "sourceDetails",
    "deadline",
    "restrictedTerms",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("SMS Campaign groups and help metadata follow the Compact schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    ["essentials", "campaign_setup", "brand_message", "compliance_delivery"],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 10);
  assert.equal(
    variables.filter((field) => field.group === "campaign_setup").length,
    6,
  );
  assert.equal(variables.filter((field) => field.group === "brand_message").length, 4);
  assert.equal(
    variables.filter((field) => field.group === "compliance_delivery").length,
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

test("SMS Campaign options, conditional fields, and type adaptations match the specification", () => {
  assert.deepEqual(getField("campaignObjective").options, [
    "Promote an offer",
    "Announce an update",
    "Invite to an event",
    "Send a reminder",
    "Re-engage customers",
    "Share a service alert",
    "Request an action",
    "Other",
  ]);
  assert.deepEqual(getField("recipientPermission").options, [
    "Explicit opt-in",
    "Existing customer relationship",
    "Transactional or service basis",
    "Internal audience",
    "Unsure — use caution",
  ]);
  assert.deepEqual(getField("campaignFormat").options, [
    "Single message",
    "Two-message sequence",
    "Three-message sequence",
  ]);
  assert.deepEqual(getField("optOutMode").options, [
    "Auto",
    "Include standard wording",
    "Custom wording",
    "Review as transactional",
  ]);
  assert.deepEqual(getField("characterTarget").options, [
    "Auto based on language",
    "Single-SMS safe target",
    "Concise multipart allowed",
  ]);

  assert.equal(getField("destinationUrl").type, "text");
  assert.equal(getField("destinationUrl").format, "url");
  assert.equal(
    getField("destinationUrl").placeholder,
    "https://www.creatornivo.com/offer",
  );
  assert.equal(getField("importantDate").type, "text");
  assert.equal(getField("variantCount").type, "number");
  assert.equal(getField("variantCount").min, 1);
  assert.equal(getField("variantCount").max, 5);

  assert.equal(
    isTemplateFieldVisible(getField("sequenceGap"), {
      campaignFormat: "Two-message sequence",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("sequenceGap"), {
      campaignFormat: "Three-message sequence",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("sequenceGap"), {
      campaignFormat: "Single message",
    }),
    false,
  );
  assert.equal(
    isTemplateFieldVisible(getField("customOptOutText"), {
      optOutMode: "Custom wording",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("customOptOutText"), { optOutMode: "Auto" }),
    false,
  );
});

test("SMS Campaign validation and prompt rendering use form metadata", () => {
  const values = {
    ...buildDefaultValues(variables),
    campaignSubject: "Appointment reminder for confirmed customers",
    senderName: "Creatornivo",
    campaignObjective: "Promote an offer",
    recipientPermission: "Explicit opt-in",
    targetAudience:
      "Existing customers who booked a consultation and opted in to SMS reminders.",
    essentialDetails:
      "The consultation is tomorrow at 10:00 AM. Recipients can reschedule from the supplied link.",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, {
      ...values,
      campaignObjective: "Unknown",
    }) ?? "",
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
      variantCount: "6",
    }) ?? "",
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
  assert.match(rendered, /Appointment reminder for confirmed customers/);
  assert.match(rendered, /Creatornivo/);
  assert.match(rendered, /Promote an offer/);
});

test("SMS Campaign catalog and Help integration use the full form", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "sms-campaign");
  assert.ok(item, "Catalog should include SMS Campaign");
  assert.equal(item.title, "SMS Campaign");
  assert.equal(item.category, "marketing");
  assert.equal(item.requiredPlan, "pro");
  assert.match(item.description, /consent-aware SMS campaigns/);
  assert.equal(item.variables.length, 24);
  assert.deepEqual(sorted(item.variables.map((variable) => variable.key)), sorted(expectedKeys));

  const helpButton = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpButton, /SMS_CAMPAIGN_GUIDE_PATH/);
  assert.match(helpButton, /"sms-campaign": SMS_CAMPAIGN_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "sms-campaign",
    "page.tsx",
  );
  assert.match(guidePage, /SMS Campaign - field guide/);
  assert.match(guidePage, /templateSlug="sms-campaign"/);
});

test("SMS Campaign marketing guardrails preserve opt-out handling and restrictions", () => {
  assert.match(prompt, /Apply every instruction in \{\{restrictions\}\} as a hard exclusion/);
  assert.match(prompt, /use \{\{customOptOutText\}\} exactly and keep it in every promotional or re-engagement message/);
  assert.match(prompt, /no unsupported discount, price, deadline, countdown, or regulatory claim appears/);
  assert.match(prompt, /custom opt-out text and required wording are retained/);

  const values = {
    restrictions: 'Avoid "flash sale ends tonight".',
    customOptOutText: "Reply END to stop.",
  };

  const prohibited = assertGeneratedOutputQuality(
    "Creatornivo: Flash sale ends tonight. Reply END to stop.",
    { variables, values },
  );
  assert.equal(prohibited.ok, false);
  assert.ok(
    prohibited.hardFailures.some(
      (issue) => issue.code === "user_prohibited_phrase",
    ),
  );

  const missingOptOut = assertGeneratedOutputQuality(
    "Creatornivo: Your planning worksheet is ready.",
    {
      variables,
      values,
      requiredDisclosurePhrases: ["Reply END to stop."],
    },
  );
  assert.equal(missingOptOut.ok, false);
  assert.ok(
    missingOptOut.hardFailures.some(
      (issue) => issue.code === "required_disclosure_missing",
    ),
  );

  const safeLengthExample =
    "Creatornivo: Your planning worksheet is ready. Reply END to stop.";
  assert.ok(safeLengthExample.length <= 160);
});
