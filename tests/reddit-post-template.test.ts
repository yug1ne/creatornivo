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

type RedditPostFormSchema = {
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
  variables: Array<{
    key: string;
    format?: string;
    maxLength?: number;
    defaultValue?: string;
  }>;
};

const expectedKeys = [
  "topicOrSituation",
  "primaryGoal",
  "targetSubreddit",
  "intendedReaders",
  "keyFactsAndContext",
  "authorPerspective",
  "desiredResponse",
  "tone",
  "outputLanguage",
  "subredditRules",
  "titleConstraints",
  "flairOrTag",
  "lengthPreference",
  "formattingPreference",
  "promotionIntent",
  "relationshipToSubject",
  "affiliationDetails",
  "destinationUrl",
  "sourceMaterial",
  "sensitiveDetailsToExclude",
  "highStakesArea",
  "jurisdictionOrScope",
  "additionalContext",
] as const;

const requiredKeys = [
  "topicOrSituation",
  "primaryGoal",
  "targetSubreddit",
  "intendedReaders",
  "keyFactsAndContext",
] as const;

const prompt = readProjectFile("prisma", "template-prompts", "reddit-post.txt");
const schema = readJson<RedditPostFormSchema>(
  "src",
  "config",
  "template-forms",
  "reddit-post-variables.json",
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

function promptSegment(startMarker: string, endMarker: string): string {
  const start = prompt.indexOf(startMarker);
  const end = prompt.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `Missing prompt marker: ${startMarker}`);
  assert.notEqual(end, -1, `Missing prompt marker: ${endMarker}`);
  return prompt.slice(start, end);
}

function assertRenderedPromptIsSafe(rendered: string): void {
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(
    rendered,
    new RegExp(`\\[(${expectedKeys.join("|")})\\]`),
  );
  assert.doesNotMatch(rendered, /\bundefined\b/i);
  assert.doesNotMatch(rendered, /\bnull\b/i);
  assert.doesNotMatch(rendered, /\bN\/A\b/i);
  assert.doesNotMatch(rendered, /\[object Object\]/i);
}

test("Reddit Post prompt is replaced with the approved 23-variable prompt", () => {
  assert.match(prompt, /senior Reddit community copywriter/);
  assert.match(prompt, /Topic or situation: \{\{topicOrSituation\}\}/);
  assert.match(prompt, /Destination URL: \{\{destinationUrl\}\}/);
  assert.match(prompt, /## Title Options/);
  assert.match(prompt, /## Ready-to-Post Version/);
  assert.match(prompt, /CONDITIONAL SECTION: Posting Notes/);

  assert.doesNotMatch(prompt, /experienced Reddit community writer/);
  assert.doesNotMatch(prompt, /COMMUNITY DETAILS/);
  assert.doesNotMatch(prompt, /Approved link: \{\{link\}\}/);
  assert.doesNotMatch(prompt, /Author role: \{\{authorRole\}\}/);
  assert.doesNotMatch(prompt, /Approved personal experience: \{\{personalExperience\}\}/);
  assert.doesNotMatch(prompt, /\n---\s*$/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("Reddit Post keeps Posting Notes outside the always-output skeleton", () => {
  const alwaysOutputSkeleton = promptSegment(
    "OUTPUT ONLY",
    "CONDITIONAL SECTION: Posting Notes",
  );
  const conditionalPostingNotes = promptSegment(
    "CONDITIONAL SECTION: Posting Notes",
    "FINAL CHECK",
  );

  assert.match(alwaysOutputSkeleton, /## Title Options/);
  assert.match(
    alwaysOutputSkeleton,
    /Provide exactly three titles and label one .Recommended./,
  );
  assert.match(alwaysOutputSkeleton, /## Ready-to-Post Version/);
  assert.match(alwaysOutputSkeleton, /\*\*Title:\*\* recommended title/);
  assert.match(
    alwaysOutputSkeleton,
    /\*\*Flair:\*\* include only when \{\{flairOrTag\}\} is nonblank/,
  );
  assert.match(
    alwaysOutputSkeleton,
    /\*\*Body:\*\* complete final body, including any necessary disclosure and any permitted user-supplied link/,
  );
  assert.doesNotMatch(alwaysOutputSkeleton, /^## Posting Notes$/m);

  assert.match(
    conditionalPostingNotes,
    /only when a concrete pre-publication action remains/,
  );
  assert.match(conditionalPostingNotes, /When such an action remains, output:/);
  assert.match(conditionalPostingNotes, /^## Posting Notes$/m);
  assert.match(conditionalPostingNotes, /\[brief actionable notes\]/);
  assert.match(conditionalPostingNotes, /When no concrete action remains:/);
  assert.match(
    conditionalPostingNotes,
    /end the response after the Ready-to-Post Version/,
  );
  assert.match(conditionalPostingNotes, /omit the Posting Notes heading/);
  assert.match(conditionalPostingNotes, /omit the entire section/);
  assert.match(
    conditionalPostingNotes,
    /never output None, N\/A, Not applicable, Not provided, Not specified, or No notes/,
  );
});

test("Reddit Post form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "reddit-post");
  assert.equal(schema.title, "Reddit Post");
  assert.equal(schema.fieldCount, 23);
  assert.equal(variables.length, 23);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "subreddit",
    "communityTopic",
    "titleFormat",
    "postFlair",
    "linksAllowed",
    "selfPromotionPolicy",
    "accountRequirements",
    "topic",
    "postType",
    "goal",
    "audience",
    "mainMessage",
    "discussionQuestion",
    "language",
    "authorRole",
    "authorRelationship",
    "disclosure",
    "personalExperience",
    "sourceDetails",
    "productOrResource",
    "link",
    "feedbackRequest",
    "limitations",
    "restrictions",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("Reddit Post field groups and metadata follow the Compact schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    [
      "essentials",
      "subreddit_fit_post_settings",
      "promotion_disclosure",
      "accuracy_boundaries",
    ],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 9);
  assert.equal(
    variables.filter((field) => field.group === "subreddit_fit_post_settings")
      .length,
    5,
  );
  assert.equal(
    variables.filter((field) => field.group === "promotion_disclosure").length,
    4,
  );
  assert.equal(
    variables.filter((field) => field.group === "accuracy_boundaries").length,
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

test("Reddit Post options and technical field adaptations match the specification", () => {
  assert.deepEqual(getField("primaryGoal").options, [
    "Ask for advice",
    "Start a discussion",
    "Share an experience",
    "Explain or teach",
    "Request feedback",
    "Share a resource",
    "Post a project update",
  ]);
  assert.deepEqual(getField("promotionIntent").options, [
    "No promotion",
    "Mention own project if relevant",
    "Request feedback on own work",
    "Share a free resource",
    "Share an external article or link",
    "Present a commercial offer",
  ]);
  assert.deepEqual(getField("highStakesArea").options, [
    "None",
    "Health or medical",
    "Legal",
    "Finance or tax",
    "Employment or insurance",
    "Politics or public policy",
    "Child or personal safety",
    "Other regulated topic",
  ]);

  const destinationUrl = getField("destinationUrl");
  assert.equal(destinationUrl.type, "text");
  assert.equal(destinationUrl.format, "url");
  assert.equal(destinationUrl.maxLength, 2048);

  const authorPerspective = getField("authorPerspective");
  assert.equal(authorPerspective.defaultValue, undefined);
  assert.equal(
    authorPerspective.options?.includes("Personal or general contributor"),
    false,
  );
});

test("Reddit Post validation enforces required, URL, select, and length rules", () => {
  const values = {
    ...buildDefaultValues(variables),
    topicOrSituation: "I am testing a structured content workflow and want feedback.",
    primaryGoal: "Request feedback",
    targetSubreddit: "r/Entrepreneur",
    intendedReaders: "solo founders building content systems",
    keyFactsAndContext:
      "The workflow uses reusable templates and avoids fake metrics or testimonials.",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, { ...values, topicOrSituation: "" }) ?? "",
    /Topic or situation/,
  );
  assert.match(
    validateVariableValues(variables, { ...values, primaryGoal: "Go viral" }) ?? "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      keyFactsAndContext: "x".repeat(1501),
    }) ?? "",
    /1,500 characters|1500 characters/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      promotionIntent: "Share a free resource",
      destinationUrl: "not-a-url",
    }) ?? "",
    /valid URL/,
  );
});

test("Reddit Post conditional fields render only when relevant", () => {
  const values = buildDefaultValues(variables);
  const affiliationDetails = getField("affiliationDetails");
  const destinationUrl = getField("destinationUrl");
  const jurisdictionOrScope = getField("jurisdictionOrScope");

  assert.equal(isTemplateFieldVisible(affiliationDetails, values), false);
  assert.equal(
    isTemplateFieldVisible(affiliationDetails, {
      ...values,
      relationshipToSubject: "Creator or owner",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(affiliationDetails, {
      ...values,
      promotionIntent: "Request feedback on own work",
    }),
    true,
  );

  assert.equal(isTemplateFieldVisible(destinationUrl, values), false);
  assert.equal(
    isTemplateFieldVisible(destinationUrl, {
      ...values,
      promotionIntent: "Share a free resource",
    }),
    true,
  );

  assert.equal(isTemplateFieldVisible(jurisdictionOrScope, values), false);
  assert.equal(
    isTemplateFieldVisible(jurisdictionOrScope, {
      ...values,
      highStakesArea: "Legal",
    }),
    true,
  );
});

test("Reddit Post prompt filling does not invent optional field placeholders", () => {
  const values = {
    ...buildDefaultValues(variables),
    topicOrSituation: "I want feedback on a content workflow for small teams.",
    primaryGoal: "Request feedback",
    targetSubreddit: "r/Entrepreneur",
    intendedReaders: "founders who publish weekly",
    keyFactsAndContext: "The workflow has templates, manual review, and no fake social proof.",
    affiliationDetails: "",
    destinationUrl: "",
    sourceMaterial: "",
    jurisdictionOrScope: "",
  };
  const filled = fillPromptTemplate(prompt, values, variables);

  assertRenderedPromptIsSafe(filled);
});

test("Reddit Post required-only and full-field rendering stay safe", () => {
  const requiredOnlyValues = {
    ...buildDefaultValues(variables),
    topicOrSituation: "I want feedback on a weekly content planning workflow.",
    primaryGoal: "Request feedback",
    targetSubreddit: "r/Entrepreneur",
    intendedReaders: "solo creators and founders",
    keyFactsAndContext:
      "The workflow uses reusable templates and a personal prompt library.",
  };
  assertRenderedPromptIsSafe(
    fillPromptTemplate(prompt, requiredOnlyValues, variables),
  );

  const fullFieldValues = {
    ...requiredOnlyValues,
    authorPerspective: "Founder or creator",
    desiredResponse: "Constructive critique",
    tone: "Natural and candid",
    outputLanguage: "English",
    subredditRules: "Feedback posts are allowed; direct sales are not.",
    titleConstraints: "Avoid clickbait and include the word feedback.",
    flairOrTag: "Feedback",
    lengthPreference: "Standard",
    formattingPreference: "Plain paragraphs",
    promotionIntent: "Request feedback on own work",
    relationshipToSubject: "Creator or owner",
    affiliationDetails: "I built the workflow and want feedback on clarity.",
    destinationUrl: "https://creatornivo.com",
    sourceMaterial: "Internal notes from five manual workflow tests.",
    sensitiveDetailsToExclude: "Do not mention private user names.",
    highStakesArea: "None",
    jurisdictionOrScope: "General information only",
    additionalContext: "Keep the ask community-first and low pressure.",
  };
  assert.equal(validateVariableValues(variables, fullFieldValues), null);
  assertRenderedPromptIsSafe(
    fillPromptTemplate(prompt, fullFieldValues, variables),
  );
});

test("Reddit Post catalog, summary, builder, and Help integration are in sync", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const matches = catalog.filter((item) => item.slug === "reddit-post");
  assert.equal(matches.length, 1);
  const template = matches[0];
  assert.equal(template.title, "Reddit Post");
  assert.equal(
    template.description,
    "Create an honest, subreddit-appropriate post that provides genuine di community rules responsibly.",
  );
  assert.equal(template.category, "reddit");
  assert.equal(template.requiredPlan, "free");
  assert.equal(template.prompt.trim(), prompt.trim());
  assert.equal(template.variables.length, 23);
  assert.deepEqual(
    sorted(template.variables.map((field) => field.key)),
    sorted(expectedKeys),
  );
  assert.equal(
    template.variables.find((field) => field.key === "destinationUrl")?.format,
    "url",
  );
  assert.equal(
    template.variables.find((field) => field.key === "destinationUrl")
      ?.maxLength,
    2048,
  );
  assert.equal(
    template.variables.find((field) => field.key === "authorPerspective")
      ?.defaultValue,
    undefined,
  );

  const summary = readJson<Array<{ slug: string; vars: number }>>(
    "prisma",
    "templates-summary.json",
  );
  assert.equal(summary.find((item) => item.slug === "reddit-post")?.vars, 23);

  const helpConfig = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpConfig, /"reddit-post": REDDIT_POST_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "reddit-post",
    "page.tsx",
  );
  assert.match(guidePage, /templateSlug="reddit-post"/);
  assert.match(guidePage, /redditPostFormVariables/);
  assert.match(guidePage, /redditPostFormGroups/);

  const builder = readProjectFile("scripts", "build-reddit-post-form.mjs");
  assert.match(builder, /approved 23-field specification/);
  assert.doesNotMatch(builder, /Pinterest Pin/);
});
