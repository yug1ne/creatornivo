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

type PressReleaseFormSchema = {
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
  "announcementType",
  "companyName",
  "announcementSummary",
  "primaryAudience",
  "keyFacts",
  "releaseDate",
  "datelineLocation",
  "releaseGoal",
  "desiredLength",
  "outputLanguage",
  "geographicScope",
  "keyBenefits",
  "supportingEvidence",
  "sourceReferences",
  "timingContext",
  "readerAction",
  "sensitiveClaims",
  "relatedContext",
  "includeQuotes",
  "quoteSpeakers",
  "approvedQuotes",
  "companyBoilerplate",
  "companyWebsite",
  "mediaContact",
  "brandVoice",
  "publicationDestination",
  "releaseStatus",
  "headlineStyle",
  "includeSubheadline",
  "includeNotesToEditors",
  "notesToEditors",
  "embargoStatus",
  "embargoDate",
  "additionalRequirements",
] as const;

const requiredKeys = [
  "announcementType",
  "companyName",
  "announcementSummary",
  "primaryAudience",
  "keyFacts",
  "releaseDate",
  "datelineLocation",
] as const;

const prompt = readProjectFile(
  "prisma",
  "template-prompts",
  "press-release.txt",
);
const schema = readJson<PressReleaseFormSchema>(
  "src",
  "config",
  "template-forms",
  "press-release-variables.json",
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

test("Press Release prompt is replaced with the approved 34-variable prompt", () => {
  assert.match(
    prompt,
    /senior public-relations writer, newsroom editor, corporate communications specialist/,
  );
  assert.match(prompt, /Announcement type: \{\{announcementType\}\}/);
  assert.match(prompt, /Company or organization: \{\{companyName\}\}/);
  assert.match(prompt, /Essential facts: \{\{keyFacts\}\}/);
  assert.match(prompt, /Company website: \{\{companyWebsite\}\}/);
  assert.match(prompt, /Embargo date: \{\{embargoDate\}\}/);
  assert.match(prompt, /### 1\. Headline Options/);
  assert.match(prompt, /### 2\. Publication-Ready Press Release/);
  assert.match(prompt, /### 3\. Claim and Publication Review/);
  assert.match(prompt, /FINAL QUALITY CHECK/);

  assert.doesNotMatch(prompt, /experienced press-release writer/);
  assert.doesNotMatch(prompt, /Create a complete, publication-ready press release package using the information below/);
  assert.doesNotMatch(prompt, /\{\{releaseName\}\}/);
  assert.doesNotMatch(prompt, /\{\{releaseType\}\}/);
  assert.doesNotMatch(prompt, /\{\{announcement\}\}/);
  assert.doesNotMatch(prompt, /\{\{organizationName\}\}/);
  assert.doesNotMatch(prompt, /\{\{primaryQuote\}\}/);
  assert.doesNotMatch(prompt, /\{\{language\}\}/);
  assert.doesNotMatch(prompt, /\{\{sourceDetails\}\}/);
  assert.doesNotMatch(prompt, /\{\{productDescription\}\}/);

  assert.deepEqual(sorted(extractVariables(prompt)), sorted(expectedKeys));
});

test("Press Release form fields match prompt variables and required fields", () => {
  assert.equal(schema.slug, "press-release");
  assert.equal(schema.title, "Press Release");
  assert.equal(schema.fieldCount, 34);
  assert.equal(variables.length, 34);
  assert.deepEqual(sorted(variables.map((field) => field.key)), sorted(expectedKeys));
  assert.deepEqual(
    sorted(variables.filter((field) => field.required).map((field) => field.key)),
    sorted(requiredKeys),
  );
  assert.deepEqual(sorted(schema.requiredKeys), sorted(requiredKeys));

  for (const oldKey of [
    "releaseName",
    "releaseType",
    "announcement",
    "organizationName",
    "primaryQuote",
    "language",
    "sourceDetails",
    "productDescription",
  ]) {
    assert.equal(
      variables.some((field) => field.key === oldKey),
      false,
      `Old field should not remain: ${oldKey}`,
    );
  }
});

test("Press Release groups and Help metadata follow the Standard schema", () => {
  assert.deepEqual(
    schema.groups.map((group) => group.id),
    [
      "essentials",
      "message_evidence",
      "quotes_company",
      "distribution_settings",
      "compliance_final_details",
    ],
  );
  assert.equal(schema.groups[0]?.defaultOpen, true);
  assert.equal(variables.filter((field) => field.group === "essentials").length, 11);
  assert.equal(
    variables.filter((field) => field.group === "message_evidence").length,
    7,
  );
  assert.equal(
    variables.filter((field) => field.group === "quotes_company").length,
    7,
  );
  assert.equal(
    variables.filter((field) => field.group === "distribution_settings").length,
    6,
  );
  assert.equal(
    variables.filter((field) => field.group === "compliance_final_details")
      .length,
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

test("Press Release options, conditional fields, and type adaptations match the specification", () => {
  assert.deepEqual(getField("announcementType").options, [
    "Product or service launch",
    "Company news",
    "Partnership",
    "Event",
    "Funding or investment",
    "Research or report",
    "Leadership appointment",
    "Milestone or award",
    "Other announcement",
  ]);
  assert.deepEqual(getField("desiredLength").options, [
    "Auto",
    "Brief",
    "Standard",
    "Detailed",
  ]);
  assert.deepEqual(getField("outputLanguage").options, [
    "English",
    "Spanish",
    "French",
    "German",
    "Italian",
    "Portuguese",
    "Polish",
    "Ukrainian",
    "Russian",
    "Other or specified below",
  ]);
  assert.deepEqual(getField("embargoStatus").options, [
    "For immediate release",
    "Embargoed",
    "Publication date only",
    "Do not display a status line",
  ]);

  assert.equal(getField("releaseDate").type, "text");
  assert.equal(getField("releaseDate").maxLength, 10);
  assert.equal(getField("embargoDate").type, "text");
  assert.equal(getField("embargoDate").maxLength, 10);

  const companyWebsite = getField("companyWebsite");
  assert.equal(companyWebsite.type, "text");
  assert.equal(companyWebsite.format, "url");

  const publicationDestination = getField("publicationDestination");
  assert.equal(publicationDestination.type, "textarea");
  assert.deepEqual(publicationDestination.options, [
    "Company newsroom",
    "Newswire service",
    "Direct media outreach",
    "Trade publications",
    "Local media",
    "Investors or stakeholders",
  ]);

  for (const key of [
    "includeQuotes",
    "includeSubheadline",
    "includeNotesToEditors",
  ]) {
    const field = getField(key);
    assert.equal(field.type, "select");
    assert.deepEqual(field.options, ["On", "Off"]);
  }

  assert.equal(
    isTemplateFieldVisible(getField("quoteSpeakers"), {
      includeQuotes: "On",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("approvedQuotes"), {
      includeQuotes: "Off",
    }),
    false,
  );
  assert.equal(
    isTemplateFieldVisible(getField("notesToEditors"), {
      includeNotesToEditors: "On",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("notesToEditors"), {
      includeNotesToEditors: "Off",
    }),
    false,
  );
  assert.equal(
    isTemplateFieldVisible(getField("embargoDate"), {
      embargoStatus: "Embargoed",
    }),
    true,
  );
  assert.equal(
    isTemplateFieldVisible(getField("embargoDate"), {
      embargoStatus: "For immediate release",
    }),
    false,
  );
});

test("Press Release validation and prompt rendering use form metadata", () => {
  const values = {
    ...buildDefaultValues(variables),
    announcementType: "Product or service launch",
    companyName: "Northstar Analytics",
    announcementSummary:
      "Northstar Analytics is launching a workflow dashboard for regional logistics teams.",
    primaryAudience:
      "Technology journalists, logistics operators, and regional business publications",
    keyFacts:
      "Launch date: September 12, 2026. Available in the UK and EU.",
    releaseDate: "2026-09-12",
    datelineLocation: "Berlin, Germany",
    companyWebsite: "https://example.com",
    includeQuotes: "On",
    quoteSpeakers:
      "Ava Brooks, CEO of Northstar Analytics, authorized to comment on product strategy.",
    approvedQuotes:
      "This launch gives regional teams a clearer way to understand where delivery workflows slow down.",
    includeNotesToEditors: "On",
    notesToEditors:
      "Product screenshots and executive interviews are available by request.",
    embargoStatus: "Embargoed",
    embargoDate: "2026-09-10",
  };

  assert.equal(validateVariableValues(variables, values), null);
  assert.match(
    validateVariableValues(variables, {
      ...values,
      announcementType: "Unknown",
    }) ?? "",
    /available options/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      companyWebsite: "not-a-url",
    }) ?? "",
    /valid URL/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      releaseDate: "September 12, 2026",
    }) ?? "",
    /10 characters or fewer/,
  );
  assert.match(
    validateVariableValues(variables, {
      ...values,
      mediaContact: "x".repeat(501),
    }) ?? "",
    /500 characters or fewer/,
  );

  const rendered = fillPromptTemplate(prompt, values);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b/);
  assert.match(rendered, /Northstar Analytics/);
  assert.match(rendered, /Release date: 2026-09-12/);
  assert.match(rendered, /Company website: https:\/\/example\.com/);
  assert.match(rendered, /Embargo date: 2026-09-10/);
});

test("Press Release catalog and Help integration use the full form", () => {
  const catalog = readJson<CatalogTemplate[]>("prisma", "templates-catalog.json");
  const item = catalog.find((template) => template.slug === "press-release");
  assert.ok(item, "Catalog should include Press Release");
  assert.equal(item.title, "Press Release");
  assert.equal(item.category, "sales");
  assert.equal(item.requiredPlan, "pro");
  assert.match(item.description, /Publication-ready press release/);
  assert.equal(normalizeLineEndings(item.prompt), normalizeLineEndings(prompt));
  assert.equal(item.variables.length, 34);
  assert.deepEqual(sorted(item.variables.map((variable) => variable.key)), sorted(expectedKeys));

  const helpButton = readProjectFile(
    "src",
    "components",
    "generate",
    "template-help-button.tsx",
  );
  assert.match(helpButton, /PRESS_RELEASE_GUIDE_PATH/);
  assert.match(helpButton, /"press-release": PRESS_RELEASE_GUIDE_PATH/);

  const guidePage = readProjectFile(
    "src",
    "app",
    "(protected)",
    "generate",
    "guides",
    "press-release",
    "page.tsx",
  );
  assert.match(guidePage, /Press Release - field guide/);
  assert.match(guidePage, /templateSlug="press-release"/);
});
