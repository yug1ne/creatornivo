import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildDefaultValues,
  classifyOptionalFieldRiskCategories,
  findRenderedPromptIssues,
  fillPromptTemplate,
  parseTemplateVariables,
  validateVariableValues,
} from "../src/lib/templates/utils";
import type { TemplateVariable } from "../src/types/template";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type CatalogTemplate = {
  slug: string;
  title: string;
  prompt: string;
  variables: unknown;
};

function readProjectFile(...parts: string[]): string {
  return readFileSync(path.join(root, ...parts), "utf8");
}

function readJson<T>(...parts: string[]): T {
  return JSON.parse(readProjectFile(...parts)) as T;
}

const catalog = readJson<CatalogTemplate[]>(
  "prisma",
  "templates-catalog.json",
);

function optionalField(key: string, label = key): TemplateVariable {
  return {
    key,
    label,
    required: false,
    type: "text",
  };
}

function templateBySlug(slug: string): CatalogTemplate {
  const template = catalog.find((item) => item.slug === slug);
  assert.ok(template, `Missing template ${slug}`);
  return template;
}

function safeValue(variable: TemplateVariable, fallback: string): string {
  if (variable.maxLength !== undefined && fallback.length > variable.maxLength) {
    return fallback.slice(0, variable.maxLength);
  }
  return fallback;
}

function requiredValueFor(
  slug: string,
  variable: TemplateVariable,
): string {
  if (variable.format === "url") {
    return `https://www.creatornivo.com/${slug}/${variable.key}`;
  }

  if (variable.type === "number") {
    return variable.defaultValue ?? String(variable.min ?? 1);
  }

  if (variable.type === "select" && variable.options?.length) {
    return variable.defaultValue ?? variable.options[0] ?? "";
  }

  return safeValue(variable, `${variable.label} required value`);
}

function fullValueFor(slug: string, variable: TemplateVariable): string {
  if (variable.type === "select" && variable.options?.length) {
    return variable.defaultValue ?? variable.options[0] ?? "";
  }

  const byKey: Record<string, string> = {
    destinationUrl: `https://www.creatornivo.com/${slug}/destination?source=optional-fields`,
    landingPageUrl: `https://www.creatornivo.com/${slug}/landing`,
    productUrl: `https://www.creatornivo.com/${slug}/product`,
    sourceUrl: `https://www.creatornivo.com/${slug}/source`,
    bookingUrl: `https://www.creatornivo.com/${slug}/booking`,
    eventUrl: `https://www.creatornivo.com/${slug}/event`,
    profileLink: `https://www.creatornivo.com/${slug}/profile`,
    linkUrl: `https://www.creatornivo.com/${slug}/link`,
    ctaUrl: `https://www.creatornivo.com/${slug}/cta`,
    ctaLink: `https://www.creatornivo.com/${slug}/case-study-cta`,
    primaryLink: `https://www.creatornivo.com/${slug}/primary`,
    registrationUrl: `https://www.creatornivo.com/${slug}/register`,
    ctaDestination: `https://www.creatornivo.com/${slug}/cta-destination`,
    relevantLink: `https://www.creatornivo.com/${slug}/answer`,
    destinationLink: `https://www.creatornivo.com/${slug}/whatsapp`,
    offerDetails: "Founding offer: $4.90/month until July 31, 2026.",
    pricingDetails: "$4.90/month, billed monthly.",
    priceOfferInfo: "$4.90/month founding price.",
    discount: "No invented discount; use only supplied terms.",
    deadlineOrAvailability: "Offer ends July 31, 2026.",
    deadlineOrDate: "Deadline: July 31, 2026.",
    importantDate: "July 31, 2026.",
    eventDate: "July 31, 2026.",
    eventTime: "10:00 UTC.",
    proofPoints: "Approved proof: 203 template tests passed.",
    proofAndFacts: "Approved proof: 203 template tests passed.",
    sourceMaterial: "Source material: internal acceptance audit passed.",
    evidenceAndSources: "Evidence: acceptance audit log.",
    socialProof: "Approved proof only: 203 template tests passed.",
    disclosureText: "Disclosure: affiliate relationship.",
    affiliationDetails: "Author is the product founder.",
    mandatoryDisclosures: "Disclosure: sponsored placement.",
    visualDirection: "Use the supplied dashboard screenshot.",
    visualDetails: "Supplied visual: dashboard screenshot.",
    visualAssets: "Supplied asset: product screenshot.",
    altTextMode: "Concise per slide",
  };

  if (byKey[variable.key]) return safeValue(variable, byKey[variable.key]);
  if (variable.format === "url") {
    return `https://www.creatornivo.com/${slug}/${variable.key}`;
  }
  if (variable.type === "number") {
    return variable.defaultValue ?? String(variable.min ?? 1);
  }
  return safeValue(
    variable,
    `${variable.label} optional test value for ${slug}`,
  );
}

function buildRequiredOnlyValues(
  slug: string,
  variables: TemplateVariable[],
): Record<string, string> {
  const values = buildDefaultValues(variables);
  for (const variable of variables) {
    if (variable.required) {
      values[variable.key] = requiredValueFor(slug, variable);
    }
  }
  return values;
}

function buildFullValues(
  slug: string,
  variables: TemplateVariable[],
): Record<string, string> {
  const values = buildDefaultValues(variables);
  for (const variable of variables) {
    values[variable.key] = fullValueFor(slug, variable);
  }
  return values;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertSafeRenderedPrompt(
  rendered: string,
  variables: TemplateVariable[],
): void {
  assert.deepEqual(findRenderedPromptIssues(rendered, variables), {
    unresolvedVariables: [],
    unsafeTokens: [],
  });
  assert.doesNotMatch(rendered, /\]\(#\)/);
  assert.doesNotMatch(rendered, /\{\{[a-zA-Z0-9_]+\}\}/);
  assert.doesNotMatch(rendered, /\bundefined\b|\bnull\b|\bN\/A\b/i);
  assert.doesNotMatch(rendered, /\[object Object\]/i);
}

function assertBlankInputLabelsRemoved(
  rendered: string,
  variables: TemplateVariable[],
  values: Record<string, string>,
): void {
  for (const variable of variables) {
    if (variable.required || variable.defaultValue?.trim() || values[variable.key]?.trim()) {
      continue;
    }

    const labelLine = new RegExp(
      `(^|\\n)\\s*(?:[-*]\\s*)?${escapeRegExp(variable.label)}:\\s*(?:\\r?\\n){2,}`,
    );
    assert.doesNotMatch(
      rendered,
      labelLine,
      `${variable.key} should not leave an empty input label`,
    );
  }
}

test("optional field inventory is audited across all 45 templates", () => {
  const optionalFields = catalog.flatMap((template) =>
    parseTemplateVariables(template.variables).filter((variable) => !variable.required),
  );
  const withDefaults = optionalFields.filter((variable) =>
    variable.defaultValue?.trim(),
  );

  assert.equal(catalog.length, 45);
  assert.equal(optionalFields.length, 1106);
  assert.equal(withDefaults.length, 461);
  assert.equal(optionalFields.length - withDefaults.length, 645);
});

test("optional risk classifier avoids substring false positives", () => {
  const falsePositiveCases = [
    optionalField("linkedinPost", "LinkedIn post"),
    optionalField("linkedinContext", "LinkedIn context"),
    optionalField("sensitiveSubjectArea", "Sensitive subject area"),
    optionalField("sensitiveClaimArea", "Sensitive claim area"),
    optionalField("status", "Status"),
    optionalField("statement", "Statement"),
    optionalField("state", "State"),
    optionalField("alternative", "Alternative"),
    optionalField("alternativesOrCompetitors", "Alternatives to address"),
    optionalField("centralTakeaway", "Main takeaway"),
    optionalField("objectionAreas", "Objections to address"),
  ];

  for (const variable of falsePositiveCases) {
    assert.deepEqual(
      classifyOptionalFieldRiskCategories(variable),
      [],
      `${variable.key} should not be classified from a substring match`,
    );
  }
});

test("optional risk classifier keeps exact-token positive matches", () => {
  const positiveCases: Array<{
    variable: TemplateVariable;
    categories: string[];
  }> = [
    { variable: optionalField("destinationUrl"), categories: ["url"] },
    { variable: optionalField("profileLink"), categories: ["url"] },
    { variable: optionalField("bookingUrl"), categories: ["url"] },
    { variable: optionalField("offerDetails"), categories: ["commercial"] },
    { variable: optionalField("price"), categories: ["commercial"] },
    { variable: optionalField("discountCode"), categories: ["commercial"] },
    { variable: optionalField("promoCode"), categories: ["commercial"] },
    { variable: optionalField("proofPoints"), categories: ["proof"] },
    { variable: optionalField("statistics"), categories: ["proof"] },
    { variable: optionalField("testimonials"), categories: ["proof"] },
    { variable: optionalField("sourceMaterial"), categories: ["proof"] },
    { variable: optionalField("citations"), categories: ["proof"] },
    { variable: optionalField("eventDate"), categories: ["timing"] },
    { variable: optionalField("deadline"), categories: ["timing"] },
    { variable: optionalField("eventTime"), categories: ["timing"] },
    { variable: optionalField("location"), categories: ["timing"] },
    { variable: optionalField("serviceArea"), categories: ["timing"] },
    {
      variable: optionalField("affiliationDetails"),
      categories: ["disclosure"],
    },
    { variable: optionalField("sponsorship"), categories: ["disclosure"] },
    { variable: optionalField("disclosure"), categories: ["disclosure"] },
    {
      variable: optionalField("commercialRelationship"),
      categories: ["disclosure"],
    },
    { variable: optionalField("visualDetails"), categories: ["visual"] },
    { variable: optionalField("altText"), categories: ["visual"] },
    { variable: optionalField("imageAsset"), categories: ["visual"] },
    { variable: optionalField("screenshot"), categories: ["visual"] },
  ];

  for (const { variable, categories } of positiveCases) {
    assert.deepEqual(
      classifyOptionalFieldRiskCategories(variable),
      categories,
      `${variable.key} should be classified by exact tokens`,
    );
  }
});

test("required-only rendered prompts are safe for every template", () => {
  for (const template of catalog) {
    const variables = parseTemplateVariables(template.variables);
    const values = buildRequiredOnlyValues(template.slug, variables);
    assert.equal(
      validateVariableValues(variables, values),
      null,
      `${template.slug} required-only values should validate`,
    );

    const rendered = fillPromptTemplate(template.prompt, values, variables);
    assertSafeRenderedPrompt(rendered, variables);
    assertBlankInputLabelsRemoved(rendered, variables, values);

    const blankOptionalFields = variables.filter(
      (variable) =>
        !variable.required &&
        !variable.defaultValue?.trim() &&
        !values[variable.key]?.trim(),
    );
    if (blankOptionalFields.length > 0) {
      assert.match(rendered, /BLANK OPTIONAL FIELD RULES/);
      assert.match(rendered, /Do not invent, infer, or output details/);
    }
  }
});

test("full-field rendered prompts preserve supplied optional values exactly", () => {
  for (const template of catalog) {
    const variables = parseTemplateVariables(template.variables);
    const values = buildFullValues(template.slug, variables);
    assert.equal(
      validateVariableValues(variables, values),
      null,
      `${template.slug} full values should validate`,
    );

    const rendered = fillPromptTemplate(template.prompt, values, variables);
    assertSafeRenderedPrompt(rendered, variables);

    for (const variable of variables) {
      const value = values[variable.key]?.trim();
      if (!value) continue;
      assert.ok(
        rendered.includes(value),
        `${template.slug}.${variable.key} should render supplied value`,
      );
    }
  }
});

test("Reddit Post omits link behavior when Destination URL is blank", () => {
  const template = templateBySlug("reddit-post");
  const variables = parseTemplateVariables(template.variables);
  const values = buildRequiredOnlyValues(template.slug, variables);
  values.promotionIntent = "Share a free resource";

  const rendered = fillPromptTemplate(template.prompt, values, variables);

  assert.match(rendered, /- Destination URL/);
  assert.match(rendered, /For blank URL or link fields/);
  assert.match(rendered, /Use a link only when a real user-supplied Destination URL is present/);
  assert.doesNotMatch(rendered, /\]\(#\)/);
  assert.doesNotMatch(rendered, /Destination URL:\s*$/m);
});

test("Reddit Post preserves a supplied Destination URL exactly", () => {
  const template = templateBySlug("reddit-post");
  const variables = parseTemplateVariables(template.variables);
  const values = buildRequiredOnlyValues(template.slug, variables);
  values.promotionIntent = "Share a free resource";
  values.destinationUrl =
    "https://www.creatornivo.com/reddit-resource?utm_source=manual-test";

  const rendered = fillPromptTemplate(template.prompt, values, variables);

  assert.match(rendered, new RegExp(escapeRegExp(values.destinationUrl)));
  assert.doesNotMatch(rendered, /- Destination URL/);
});

test("Facebook Post offerDetails is omitted when blank and preserved when supplied", () => {
  const template = templateBySlug("facebook-post");
  const variables = parseTemplateVariables(template.variables);
  const requiredOnly = buildRequiredOnlyValues(template.slug, variables);
  const blankRendered = fillPromptTemplate(template.prompt, requiredOnly, variables);

  assert.match(blankRendered, /- Offer details/);
  assert.match(blankRendered, /For blank offer or commercial fields/);
  assert.doesNotMatch(blankRendered, /Offer details:\s*$/m);

  const full = { ...requiredOnly, offerDetails: "Founding price: $4.90/month." };
  const fullRendered = fillPromptTemplate(template.prompt, full, variables);
  assert.match(fullRendered, /Founding price: \$4\.90\/month\./);
  assert.doesNotMatch(fullRendered, /- Offer details/);
});

test("risky optional categories have template-specific coverage", () => {
  const email = templateBySlug("email-sequence");
  const emailVariables = parseTemplateVariables(email.variables);
  const emailValues = buildRequiredOnlyValues(email.slug, emailVariables);
  emailValues.destinationUrl = "https://www.creatornivo.com/email-sequence/cta";
  emailValues.pricingDetails = "$4.90/month";
  emailValues.deadlineOrAvailability = "Offer ends July 31, 2026.";
  emailValues.proofPoints = "Approved proof: 203 template tests passed.";
  const emailRendered = fillPromptTemplate(
    email.prompt,
    emailValues,
    emailVariables,
  );
  assert.match(emailRendered, /https:\/\/www\.creatornivo\.com\/email-sequence\/cta/);
  assert.match(emailRendered, /\$4\.90\/month/);
  assert.match(emailRendered, /Offer ends July 31, 2026/);
  assert.match(emailRendered, /203 template tests passed/);

  const carousel = templateBySlug("instagram-carousel");
  const carouselVariables = parseTemplateVariables(carousel.variables);
  const carouselValues = buildRequiredOnlyValues(
    carousel.slug,
    carouselVariables,
  );
  carouselValues.disclosureText = "Disclosure: affiliate relationship.";
  carouselValues.visualDirection = "Use the supplied dashboard screenshot.";
  const carouselRendered = fillPromptTemplate(
    carousel.prompt,
    carouselValues,
    carouselVariables,
  );
  assert.match(carouselRendered, /Disclosure: affiliate relationship/);
  assert.match(carouselRendered, /supplied dashboard screenshot/);
});

test("blank optional rules are a single deduplicated block", () => {
  const variables: TemplateVariable[] = [
    {
      ...optionalField("requiredTopic", "Topic"),
      required: true,
    },
    optionalField("destinationUrl", "Destination URL"),
    optionalField("profileLink", "Profile link"),
    optionalField("offerDetails", "Offer details"),
    optionalField("price", "Price"),
    {
      ...optionalField("tone", "Tone"),
      defaultValue: "Auto",
    },
    {
      ...optionalField("buttonStyle", "Button style"),
      defaultValue: "No button",
    },
  ];
  const values = buildDefaultValues(variables);
  values.requiredTopic = "Launch announcement";

  const rendered = fillPromptTemplate(
    [
      "Topic: {{requiredTopic}}",
      "Destination: {{destinationUrl}}",
      "Profile: {{profileLink}}",
      "Offer: {{offerDetails}}",
      "Price: {{price}}",
      "Tone: {{tone}}",
      "Button style: {{buttonStyle}}",
    ].join("\n"),
    values,
    variables,
  );
  const rulesBlock = rendered.split("\n\n")[0] ?? "";

  assert.equal(rendered.match(/BLANK OPTIONAL FIELD RULES/g)?.length, 1);
  assert.equal(
    rendered.match(/For blank URL or link fields/g)?.length,
    1,
  );
  assert.equal(
    rendered.match(/For blank offer or commercial fields/g)?.length,
    1,
  );
  assert.doesNotMatch(rulesBlock, /Launch announcement|Auto|No button/);
  assert.doesNotMatch(rulesBlock, /- Tone|- Button style/);
  assert.match(rendered, /Topic: Launch announcement/);
  assert.match(rendered, /Tone: Auto/);
  assert.match(rendered, /Button style: No button/);

  const defaultOnlyVariable = {
    ...optionalField("emojiUse", "Emoji use"),
    defaultValue: "Minimal",
  };
  const defaultOnlyRendered = fillPromptTemplate(
    "Emoji use: {{emojiUse}}",
    buildDefaultValues([defaultOnlyVariable]),
    [defaultOnlyVariable],
  );
  assert.doesNotMatch(defaultOnlyRendered, /BLANK OPTIONAL FIELD RULES/);
});

test("meaningful defaults are treated as values, not blank optional fields", () => {
  const optionalFields = catalog.flatMap((template) =>
    parseTemplateVariables(template.variables).filter((variable) => !variable.required),
  );
  const defaults = optionalFields.map((variable) => variable.defaultValue).filter(Boolean);

  assert.ok(defaults.includes("Auto"));
  assert.ok(defaults.includes("Yes"));
  assert.ok(defaults.includes("Minimal"));
  assert.ok(defaults.includes("1"));
  if (defaults.includes("No button")) {
    assert.ok(defaults.includes("No button"));
  }

  const googleBusiness = templateBySlug("google-business-profile-post");
  const variables = parseTemplateVariables(googleBusiness.variables);
  const values = buildRequiredOnlyValues(googleBusiness.slug, variables);
  const rendered = fillPromptTemplate(googleBusiness.prompt, values, variables);

  assert.match(rendered, /Include visual suggestion:\s*Yes/);
  assert.doesNotMatch(rendered, /- Include visual suggestion/);
});
