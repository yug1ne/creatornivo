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

type WebinarPackageFormSchema = {
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
  "webinarTopic",
  "primaryGoal",
  "targetAudience",
  "audienceProblem",
  "corePromise",
  "keyTakeaways",
  "webinarFormat",
  "webinarDuration",
  "primaryCta",
  "outputLanguage",
  "brandName",
  "presenterName",
  "eventDate",
  "eventTime",
  "timeZone",
  "registrationUrl",
  "webinarPlatform",
  "presenterRole",
  "presenterBio",
  "coPresenters",
  "sourceMaterial",
  "agendaInputs",
  "audienceKnowledge",
  "interactionMethods",
  "audienceQuestions",
  "evidenceAndExamples",
  "topicSensitivity",
  "complianceNotes",
  "tone",
  "brandVoice",
  "registrationCopyLength",
  "offerType",
  "offerDetails",
  "socialProof",
  "objectionsToAddress",
  "visualDirection",
  "ctaDestination",
  "followUpGoal",
  "followUpTiming",
  "replayAvailability",
  "postWebinarResource",
  "emailSenderName",
  "outputDetail",
  "additionalContext",
] as const;

const requiredKeys = [
  "webinarTopic",
  "primaryGoal",
  "targetAudience",
  "audienceProblem",
  "corePromise",
  "keyTakeaways",
  "webinarFormat",
  "outputLanguage",
] as const;

const prompt = readProjectFile(
  "prisma",
  "template-prompts",
  "webinar-package.txt",
);
const schema = readJson<WebinarPackageFormSchema>(
  "src",
  "config",
  "template-forms",
  "webinar-package-variables.json",
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

test("Webinar Package prompt is replaced with the approved 44-variable prompt", () => {
  assert.match(prompt, /senior webinar strategist/);
  assert.match(prompt, /Webinar topic:\n\{\{webinarTopic\}\}/);
  assert.match(prompt, /Primary goal:\n\{\{primaryGoal\}\}/);
  assert.match(prompt, /Topic sensitivity:\n\{\{topicSensitivity\}\}/);
  assert.match(prompt, /CTA destination:\n\{\{ctaDestination\}\}/);
  assert.match(prompt, /## 1\. Strategy Snapshot/);
  assert.match(prompt, /## 10\. Post-Webinar Follow-Up Email/);
  assert.match(prompt, /Output only the requested webinar package/);
  assert.match(prompt, /FINAL QUALITY CHECK/);

  assert.doesNotMatch(prompt, /experienced webinar strategist/);
  assert.doesNotMatch(prompt, /WEBINAR INFORMATION/);
  assert.doesNotMatch(prompt, /\{\{topic\}\}/);
  assert.doesNotMatch(prompt, /\{\{goal\}\}/);
  assert.doesNotMatch(prompt, /\{\{mainMessage\}\}/);
  assert.doesNotMatch(prompt, /\{\{mainPromise\}\}/);
  assert.doesNotMatch(prompt, /\{\{duration\}\}/);
  assert.doesNotMatch(prompt, /\{\{language\}\}/);
  assert.doesNotMatch(prompt, /\{\{audience\}\}/);
  assert.doesNotMatch(prompt, /\{\{painPoint\}\}/);
  assert.doesNotMatch(prompt, /\{\{sourceDetails\}\}/);
  assert.doesNotMatch(prompt, /\{\{mainOffer\}\}/);
  assert.doesNotMatch(prompt, /\{\{productName\}\}/);
  assert.doesNotMatch(prompt, /\{\{ctaLink\}\}/);
  assert.doesNotMatch(prompt, /\{\{restrictions\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("Webinar Package form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "webinar-package");
  assert.equal(schema.title, "Webinar Package");
  assert.equal(schema.fieldCount, 44);
  assert.equal(variables.length, 44);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "topic",
    "audience",
    "desiredOutcome",
    "goal",
    "mainPromise",
    "mainMessage",
    "desiredAction",
    "duration",
    "language",
    "mainOffer",
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

test("Webinar Package groups and help metadata follow the Standard schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    [
      "essentials",
      "event_setup",
      "content_engagement",
      "brand_offer_promotion",
      "follow_up_output_settings",
    ],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 12);
  assert.equal(variables.filter((field) => field.group === "event_setup").length, 8);
  assert.equal(
    variables.filter((field) => field.group === "content_engagement").length,
    8,
  );
  assert.equal(
    variables.filter((field) => field.group === "brand_offer_promotion").length,
    8,
  );
  assert.equal(
    variables.filter((field) => field.group === "follow_up_output_settings").length,
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

test("Webinar Package options, conditional fields, and type adaptations match the specification", () => {
  assert.deepEqual(getField("primaryGoal").options, [
    "Educate the audience",
    "Generate qualified leads",
    "Demonstrate a product",
    "Sell an offer",
    "Onboard customers",
    "Build authority",
    "Grow a community",
    "Deliver internal training",
    "Other",
  ]);
  assert.deepEqual(getField("webinarFormat").options, [
    "Live webinar",
    "Recorded evergreen webinar",
    "Recorded premiere",
  ]);
  assert.deepEqual(getField("topicSensitivity").options, [
    "General topic",
    "Health or medical",
    "Legal",
    "Financial or investment",
    "Safety or technical",
    "Employment or HR",
    "Political or public policy",
    "Child-related",
    "Other regulated topic",
  ]);

  assert.equal(getField("registrationUrl").type, "text");
  assert.equal(getField("registrationUrl").format, "url");
  assert.equal(
    getField("registrationUrl").placeholder,
    "https://www.creatornivo.com/webinar",
  );
  assert.equal(getField("ctaDestination").type, "text");
  assert.equal(getField("ctaDestination").format, "url");
  assert.equal(
    getField("ctaDestination").placeholder,
    "https://www.creatornivo.com/next-step",
  );
  assert.equal(getField("eventDate").type, "text");
  assert.equal(getField("interactionMethods").type, "textarea");
  assert.match(getField("interactionMethods").hint ?? "", /Live chat/);

  assert.equal(
    isTemplateFieldVisible(getField("eventDate"), {
      webinarFormat: "Live webinar",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("eventDate"), {
      webinarFormat: "Recorded premiere",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("eventDate"), {
      webinarFormat: "Recorded evergreen webinar",
    }),
    false,
  );
  assert.equal(
    isTemplateFieldVisible(getField("complianceNotes"), {
      topicSensitivity: "Legal",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("complianceNotes"), {
      topicSensitivity: "General topic",
    }),
    false,
  );
  assert.equal(
    isTemplateFieldVisible(getField("offerDetails"), {
      offerType: "Consultation",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("offerDetails"), {
      offerType: "No commercial offer",
    }),
    false,
  );
});

test("Webinar Package validation and prompt rendering use server form metadata", () => {
  const values = {
    ...buildDefaultValues(variables),
    webinarTopic: "How small agencies can automate client reporting",
    targetAudience:
      "Small agency owners and account managers who manually prepare recurring client updates.",
    audienceProblem:
      "They spend hours assembling reports and struggle to make results clear to clients.",
    corePromise:
      "Attendees will understand a practical workflow for clearer, faster client reporting.",
    keyTakeaways:
      "Map recurring reporting questions, choose the right metrics, build a repeatable agenda, and prepare a follow-up plan.",
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
      registrationUrl: "not-a-url",
    }) ?? "",
    /valid URL/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      webinarDuration: "1000",
    }) ?? "",
    /3 characters or fewer/,
  );

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b/);
  assert.match(rendered, /How small agencies can automate client reporting/);
  assert.match(rendered, /Educate the audience/);
  assert.match(rendered, /Live webinar/);
});

test("Webinar Package catalog and Help integration use the full form", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "webinar-package");
  assert.ok(item, "Catalog should include Webinar Package");
  assert.equal(item.title, "Webinar Package");
  assert.equal(item.category, "marketing");
  assert.equal(item.requiredPlan, "pro");
  assert.match(item.description, /complete webinar package/);
  assert.equal(item.variables.length, 44);
  assert.deepEqual(sorted(item.variables.map((variable) => variable.key)), sorted(expectedKeys));

  const helpButton = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpButton, /WEBINAR_PACKAGE_GUIDE_PATH/);
  assert.match(helpButton, /"webinar-package": WEBINAR_PACKAGE_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "webinar-package",
    "page.tsx",
  );
  assert.match(guidePage, /Webinar Package - field guide/);
  assert.match(guidePage, /templateSlug="webinar-package"/);
});
