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

type PodcastScriptFormSchema = {
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
  "episodeTopic",
  "primaryGoal",
  "targetAudience",
  "coreMessage",
  "keyPoints",
  "episodeFormat",
  "outputLanguage",
  "episodeLength",
  "hostName",
  "podcastName",
  "desiredListenerAction",
  "sourceMaterial",
  "scriptDepth",
  "openingStyle",
  "segmentCount",
  "mustIncludeSections",
  "requiredStoriesExamples",
  "transitionStyle",
  "audienceInteraction",
  "recurringElements",
  "tone",
  "hostVoice",
  "pacing",
  "energyLevel",
  "readingLevel",
  "humorLevel",
  "pronunciationNotes",
  "phrasesToAvoid",
  "hasGuest",
  "guestDetails",
  "guestTopicsAndBoundaries",
  "interviewQuestionCount",
  "hasSponsor",
  "sponsorBrief",
  "sponsorPlacement",
  "ctaDetails",
  "episodeContext",
  "seriesContext",
  "contentRisk",
  "jurisdiction",
  "showNotesLevel",
  "discoveryKeywords",
  "linksAndResources",
  "additionalRequirements",
] as const;

const requiredKeys = [
  "episodeTopic",
  "primaryGoal",
  "targetAudience",
  "coreMessage",
  "keyPoints",
  "episodeFormat",
  "outputLanguage",
  "episodeLength",
] as const;

const prompt = readProjectFile("prisma", "template-prompts", "podcast-script.txt");
const schema = readJson<PodcastScriptFormSchema>(
  "src",
  "config",
  "template-forms",
  "podcast-script-variables.json",
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

test("Podcast Script prompt is replaced with the approved 44-variable prompt", () => {
  assert.match(prompt, /senior podcast producer/);
  assert.match(prompt, /Episode topic:\n\{\{episodeTopic\}\}/);
  assert.match(prompt, /Primary goal:\n\{\{primaryGoal\}\}/);
  assert.match(prompt, /Include a guest:\n\{\{hasGuest\}\}/);
  assert.match(prompt, /Relevant jurisdiction:\n\{\{jurisdiction\}\}/);
  assert.match(prompt, /OUTPUT FORMAT/);
  assert.match(prompt, /Output only the finished podcast package defined below/);

  assert.doesNotMatch(prompt, /experienced podcast writer/);
  assert.doesNotMatch(prompt, /PODCAST INFORMATION/);
  assert.doesNotMatch(prompt, /\{\{podcastDescription\}\}/);
  assert.doesNotMatch(prompt, /\{\{topic\}\}/);
  assert.doesNotMatch(prompt, /\{\{duration\}\}/);
  assert.doesNotMatch(prompt, /\{\{audience\}\}/);
  assert.doesNotMatch(prompt, /\{\{language\}\}/);
  assert.doesNotMatch(prompt, /\{\{brandVoice\}\}/);
  assert.doesNotMatch(prompt, /\{\{sourceDetails\}\}/);
  assert.doesNotMatch(prompt, /\{\{personalExperience\}\}/);
  assert.doesNotMatch(prompt, /\{\{desiredAction\}\}/);
  assert.doesNotMatch(prompt, /\{\{guestName\}\}/);
  assert.doesNotMatch(prompt, /\{\{restrictions\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("Podcast Script form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "podcast-script");
  assert.equal(schema.title, "Podcast Script");
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
    "duration",
    "audience",
    "mainMessage",
    "language",
    "brandVoice",
    "sourceDetails",
    "personalExperience",
    "desiredAction",
    "guestName",
    "restrictions",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("Podcast Script groups and help metadata follow the Standard schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    [
      "essentials",
      "episode_structure",
      "voice_delivery",
      "guests_sponsors_conversion",
      "publishing_discovery_safety",
    ],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 12);
  assert.equal(
    variables.filter((field) => field.group === "episode_structure").length,
    8,
  );
  assert.equal(variables.filter((field) => field.group === "voice_delivery").length, 8);
  assert.equal(
    variables.filter((field) => field.group === "guests_sponsors_conversion").length,
    8,
  );
  assert.equal(
    variables.filter((field) => field.group === "publishing_discovery_safety").length,
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

test("Podcast Script options and conditional fields match the specification", () => {
  assert.deepEqual(getField("primaryGoal").options, [
    "Educate or explain",
    "Entertain",
    "Inspire or motivate",
    "Share a story",
    "Build authority",
    "Promote an offer",
    "Interview or explore",
    "Discuss current events",
  ]);
  assert.deepEqual(getField("episodeFormat").options, [
    "Solo monologue",
    "Interview",
    "Co-hosted discussion",
    "Educational tutorial",
    "Narrative storytelling",
    "Panel discussion",
    "News or commentary",
    "Hybrid format",
  ]);
  assert.deepEqual(getField("episodeLength").options, [
    "5–10 minutes",
    "10–20 minutes",
    "20–40 minutes",
    "40–60 minutes",
    "More than 60 minutes",
    "Let the model decide",
  ]);
  assert.equal(getField("mustIncludeSections").type, "textarea");
  assert.match(getField("mustIncludeSections").hint ?? "", /Opening hook/);
  assert.equal(getField("audienceInteraction").type, "textarea");
  assert.match(getField("audienceInteraction").hint ?? "", /Reflection question/);

  const hasGuest = getField("hasGuest");
  assert.equal(hasGuest.type, "select");
  assert.deepEqual(hasGuest.options, ["On", "Off"]);
  assert.equal(hasGuest.defaultValue, "Off");

  assert.equal(
    isTemplateFieldVisible(getField("guestDetails"), { hasGuest: "On" }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("guestDetails"), { hasGuest: "Off" }),
    false,
  );
  assert.equal(
    isTemplateFieldVisible(getField("sponsorBrief"), { hasSponsor: "On" }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("sponsorBrief"), { hasSponsor: "Off" }),
    false,
  );
  assert.equal(
    isTemplateFieldVisible(getField("seriesContext"), {
      episodeContext: "Series episode",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("seriesContext"), {
      episodeContext: "Evergreen episode",
    }),
    false,
  );
  assert.equal(
    isTemplateFieldVisible(getField("jurisdiction"), { contentRisk: "Legal" }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("jurisdiction"), {
      contentRisk: "General content",
    }),
    false,
  );
});

test("Podcast Script validation and prompt rendering use form metadata", () => {
  const values = {
    ...buildDefaultValues(variables),
    episodeTopic: "Why small creators struggle to stay consistent",
    primaryGoal: "Educate or explain",
    episodeFormat: "Solo monologue",
    episodeLength: "20–40 minutes",
    targetAudience:
      "Solo creators who understand content strategy but struggle to publish every week.",
    coreMessage:
      "A repeatable content workflow beats rebuilding every prompt from scratch.",
    keyPoints:
      "Templates reduce decision fatigue, saved prompts preserve what works, and simple systems make consistency easier.",
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
      segmentCount: "100",
    }) ?? "",
    /2 characters or fewer/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      episodeTopic: "x".repeat(201),
    }) ?? "",
    /200 characters or fewer/,
  );

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b|\bN\/A\b/);
  assert.match(rendered, /Why small creators struggle to stay consistent/);
  assert.match(rendered, /Educate or explain/);
  assert.match(rendered, /20–40 minutes/);
});

test("Podcast Script catalog and Help integration use the full form", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "podcast-script");
  assert.ok(item, "Catalog should include Podcast Script");
  assert.equal(item.title, "Podcast Script");
  assert.equal(item.category, "youtube");
  assert.equal(item.requiredPlan, "pro");
  assert.match(item.description, /recording-ready podcast episode/);
  assert.equal(item.variables.length, 44);
  assert.deepEqual(sorted(item.variables.map((variable) => variable.key)), sorted(expectedKeys));

  const helpButton = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpButton, /PODCAST_SCRIPT_GUIDE_PATH/);
  assert.match(helpButton, /"podcast-script": PODCAST_SCRIPT_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "podcast-script",
    "page.tsx",
  );
  assert.match(guidePage, /Podcast Script - field guide/);
  assert.match(guidePage, /templateSlug="podcast-script"/);
});
