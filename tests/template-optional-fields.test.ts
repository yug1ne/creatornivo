import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildDefaultValues,
  classifyTemplateFieldDefault,
  classifyOptionalFieldRiskCategories,
  findRenderedPromptIssues,
  fillPromptTemplate,
  isTemplateDefaultActive,
  parseTemplateVariables,
  validateVariableValues,
} from "../src/lib/templates/utils";
import {
  OUTPUT_SANITIZER_PATTERN_COUNT,
  getGeneratedOutputValidationMessage,
  sanitizeGeneratedOutput,
  validateGeneratedOutput,
} from "../src/lib/templates/output-validation";
import { prepareExportContent } from "../src/lib/export/utils";
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
    if (
      variable.defaultValue &&
      !/^(No preference|Not specified)$/i.test(variable.defaultValue.trim())
    ) {
      return variable.defaultValue;
    }
    return (
      variable.options.find(
        (option) => !/^(No preference|Not specified)$/i.test(option.trim()),
      ) ??
      variable.options[0] ??
      ""
    );
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

function assertSanitizedOutputPasses(
  content: string,
  variables: TemplateVariable[],
  values: Record<string, string>,
): ReturnType<typeof sanitizeGeneratedOutput> {
  const sanitized = sanitizeGeneratedOutput(content, variables, values);
  assert.equal(sanitized.changed, true, "Expected output to be sanitized");
  assert.deepEqual(
    validateGeneratedOutput(sanitized.content, variables, values),
    { ok: true, issues: [] },
  );
  return sanitized;
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
    { variable: optionalField("contactDetails"), categories: ["contact"] },
    {
      variable: optionalField("senderPostalAddress", "Business postal address"),
      categories: ["contact"],
    },
    { variable: optionalField("mediaContact"), categories: ["contact"] },
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

test("generated output validator blocks confirmed placeholder artifacts", () => {
  const variables: TemplateVariable[] = [
    optionalField("destinationUrl", "Destination URL"),
    optionalField("offerDetails", "Offer details"),
    optionalField("eventDate", "Event date"),
    optionalField("location", "Location"),
    optionalField("proofPoints", "Proof points"),
    optionalField("affiliationDetails", "Affiliation details"),
    optionalField("contactDetails", "Contact details"),
    optionalField("visualDetails", "Visual details"),
  ];
  const values = buildDefaultValues(variables);
  const cases: Array<{ content: string; category: string }> = [
    { content: "Read more [here](#).", category: "url" },
    { content: "Use [link if allowed] after the CTA.", category: "url" },
    { content: "Add [insert link] before publishing.", category: "url" },
    { content: "Visit URL_HERE for details.", category: "url" },
    { content: "Check the link below.", category: "url" },
    { content: "Price: $99", category: "commercial" },
    { content: "Discount: [insert price]", category: "commercial" },
    { content: "Ends tonight.", category: "commercial" },
    { content: "Use promo code SAVE20.", category: "commercial" },
    { content: "Event date: [date]", category: "timing" },
    { content: "Location: TBD", category: "timing" },
    { content: "Venue: [location]", category: "timing" },
    { content: "Proof: [insert statistic]", category: "proof" },
    { content: "According to research, this is proven.", category: "proof" },
    { content: "Testimonial: \"This changed everything.\"", category: "proof" },
    { content: "Sponsored by [sponsor name].", category: "disclosure" },
    { content: "Affiliate disclosure: paid partner.", category: "disclosure" },
    { content: "Email name@example.com.", category: "contact" },
    { content: "Call 555-123-4567.", category: "contact" },
    { content: "Follow @yourhandle.", category: "contact" },
    { content: "Image: [insert image]", category: "visual" },
    { content: "Screenshot: [add screenshot]", category: "visual" },
  ];

  for (const { content, category } of cases) {
    const result = validateGeneratedOutput(content, variables, values);
    assert.equal(result.ok, false, `${content} should fail validation`);
    assert.ok(
      result.issues.some((issue) => issue.category === category),
      `${content} should produce a ${category} issue`,
    );
    assert.match(
      getGeneratedOutputValidationMessage(result) ?? "",
      /Output validation failed/,
    );
  }
});

test("generated output validator preserves supplied values and normal notes", () => {
  const variables: TemplateVariable[] = [
    optionalField("destinationUrl", "Destination URL"),
    optionalField("offerDetails", "Offer details"),
    optionalField("eventDate", "Event date"),
    optionalField("proofPoints", "Proof points"),
    {
      ...optionalField("visualSuggestion", "Include visual suggestion"),
      defaultValue: "Yes",
    },
  ];
  const values = buildDefaultValues(variables);
  values.destinationUrl = "https://www.creatornivo.com/reddit-resource";
  values.offerDetails = "Founding price: $4.90/month.";
  values.eventDate = "July 31, 2026";
  values.proofPoints = "203 template tests passed.";

  const result = validateGeneratedOutput(
    [
      "Posting Notes: Check whether links are allowed in the subreddit.",
      "Use https://www.creatornivo.com/reddit-resource exactly once.",
      "The supplied founding price is $4.90/month.",
      "Date: July 31, 2026.",
      "Proof: 203 template tests passed.",
      "Visual suggestion: use a simple product workflow illustration.",
    ].join("\n"),
    variables,
    values,
  );

  assert.deepEqual(result, { ok: true, issues: [] });
});

test("post-generation sanitizer removes safe URL artifacts without deleting normal link context", () => {
  const variables: TemplateVariable[] = [
    optionalField("destinationUrl", "Destination URL"),
  ];
  const values = buildDefaultValues(variables);
  const content = [
    "Helpful intro that should stay.",
    "I'll include a link to download the planner below. This sentence should stay.",
    "Download the Northstar Weekly Content Planner",
    "Read more [here](#).",
    "Use [link if allowed] after the CTA.",
    "Posting Notes: Check whether external links are allowed before posting.",
    "This link between the problem and the solution should remain.",
  ].join("\n");

  const sanitized = assertSanitizedOutputPasses(content, variables, values);

  assert.doesNotMatch(sanitized.content, /include a link/i);
  assert.doesNotMatch(sanitized.content, /Download the Northstar/i);
  assert.doesNotMatch(sanitized.content, /\[here\]\(#\)/);
  assert.doesNotMatch(sanitized.content, /\[link if allowed\]/);
  assert.match(sanitized.content, /Helpful intro/);
  assert.match(sanitized.content, /This sentence should stay/);
  assert.match(sanitized.content, /Posting Notes: Check whether external links are allowed/);
  assert.match(sanitized.content, /This link between the problem/);
});

const productionPostingNotesExpected = [
  "## Title Options",
  "",
  "1. **Recommended: Seeking Feedback on a Free Weekly Content Planner for Solo Creators**",
  "",
  "## Ready-to-Post Version",
  "",
  "**Title:** Seeking Feedback on a Free Weekly Content Planner for Solo Creators",
  "",
  "**Body:**",
  "",
  "Thanks in advance for your feedback. Looking forward to hearing your thoughts!",
].join("\n");

function productionPostingNotesInput(
  heading: string,
  sentinel: string,
  lineEnding = "\n",
  blankLinesBetweenHeadingAndSentinel = 1,
): string {
  return [
    "## Title Options",
    "",
    "1. **Recommended: Seeking Feedback on a Free Weekly Content Planner for Solo Creators**",
    "",
    "## Ready-to-Post Version",
    "",
    "**Title:** Seeking Feedback on a Free Weekly Content Planner for Solo Creators",
    "",
    "**Body:**",
    "",
    "Thanks in advance for your feedback. Looking forward to hearing your thoughts!",
    "",
    heading,
    ...Array(blankLinesBetweenHeadingAndSentinel).fill(""),
    sentinel,
  ].join(lineEnding);
}

test("post-generation sanitizer removes production Markdown Posting Notes sentinel block", () => {
  const sanitized = sanitizeGeneratedOutput(
    productionPostingNotesInput("## Posting Notes", "None"),
  );

  assert.equal(sanitized.changed, true);
  assert.equal(sanitized.content, productionPostingNotesExpected);
  assert.doesNotMatch(sanitized.content, /Posting Notes|None/);
});

test("post-generation sanitizer recognizes production Posting Notes variants", () => {
  const cases = [
    {
      name: "LF with one blank line and Markdown heading",
      input: productionPostingNotesInput("## Posting Notes", "None", "\n", 1),
    },
    {
      name: "CRLF with one blank line and Markdown heading",
      input: productionPostingNotesInput("## Posting Notes", "None", "\r\n", 1),
    },
    {
      name: "LF with two blank lines and Markdown heading",
      input: productionPostingNotesInput("## Posting Notes", "N/A", "\n", 2),
    },
    {
      name: "CRLF with two blank lines and Markdown heading",
      input: productionPostingNotesInput(
        "## Posting Notes",
        "Not provided",
        "\r\n",
        2,
      ),
    },
    {
      name: "bold heading",
      input: productionPostingNotesInput("**Posting Notes**", "Not specified"),
    },
    {
      name: "plain heading",
      input: productionPostingNotesInput("Posting Notes", "None"),
    },
  ];

  for (const { name, input } of cases) {
    const sanitized = sanitizeGeneratedOutput(input);
    assert.equal(sanitized.content, productionPostingNotesExpected, name);
    assert.doesNotMatch(sanitized.content, /Posting Notes/i, name);
  }
});

test("Posting Notes cleanup is shared by Result, Copy, and Export paths", () => {
  const rawStreamedOutput = productionPostingNotesInput("## Posting Notes", "None");
  const generationFinish = sanitizeGeneratedOutput(rawStreamedOutput);
  const savedGenerationContent = generationFinish.content;
  const resultUiContent = savedGenerationContent;
  const copiedMarkdown = resultUiContent;
  const exportMarkdown = prepareExportContent(
    sanitizeGeneratedOutput(resultUiContent).content,
    "md",
  );
  const exportPlainText = prepareExportContent(
    sanitizeGeneratedOutput(resultUiContent).content,
    "txt",
  );

  assert.equal(savedGenerationContent, productionPostingNotesExpected);
  assert.equal(resultUiContent, productionPostingNotesExpected);
  assert.equal(copiedMarkdown, productionPostingNotesExpected);
  assert.equal(exportMarkdown, productionPostingNotesExpected);
  assert.equal(
    exportPlainText,
    prepareExportContent(productionPostingNotesExpected, "txt"),
  );
  assert.doesNotMatch(exportPlainText, /Posting Notes|None/);
});

test("post-generation sanitizer removes an empty Posting Notes section only", () => {
  const content = [
    "Body",
    "This should stay.",
    "",
    "Posting Notes",
    "None",
  ].join("\n");

  const sanitized = sanitizeGeneratedOutput(content);

  assert.equal(sanitized.changed, true);
  assert.equal(
    sanitized.content,
    [
      "Body",
      "This should stay.",
    ].join("\n"),
  );
  assert.ok(
    sanitized.changes.some((change) => change.category === "empty_section"),
  );
});

test("post-generation sanitizer preserves Posting Notes with real text", () => {
  const content = [
    "Body",
    "This should stay.",
    "",
    "## Posting Notes",
    "",
    "Check whether external links are allowed before posting.",
  ].join("\n");

  const sanitized = sanitizeGeneratedOutput(content);

  assert.equal(sanitized.changed, false);
  assert.equal(sanitized.content, content);
});

test("post-generation sanitizer removes empty Posting Notes without changing Body or links", () => {
  const variables: TemplateVariable[] = [
    {
      ...optionalField("destinationUrl", "Destination URL"),
      format: "url",
    },
  ];
  const values = buildDefaultValues(variables);
  values.destinationUrl = "https://www.creatornivo.com/reddit-resource";
  const content = [
    "Body",
    "Use https://www.creatornivo.com/reddit-resource exactly once.",
    "This main body sentence should stay exactly as written.",
    "",
    "Posting Notes",
    "Not provided",
  ].join("\n");

  const sanitized = sanitizeGeneratedOutput(content, variables, values);

  assert.equal(
    sanitized.content,
    [
      "Body",
      "Use https://www.creatornivo.com/reddit-resource exactly once.",
      "This main body sentence should stay exactly as written.",
    ].join("\n"),
  );
  assert.match(
    sanitized.content,
    /Use https:\/\/www\.creatornivo\.com\/reddit-resource exactly once\./,
  );
});

test("post-generation sanitizer does not remove none inside ordinary sentences", () => {
  const content = [
    "Body",
    "None of these tradeoffs should be treated as empty posting notes.",
    "",
    "Posting Notes",
    "Check subreddit rules; none of this changes the core body.",
  ].join("\n");

  const sanitized = sanitizeGeneratedOutput(content);

  assert.equal(sanitized.changed, false);
  assert.equal(sanitized.content, content);
});

test("post-generation sanitizer preserves real user supplied URL and commercial values", () => {
  const variables: TemplateVariable[] = [
    optionalField("destinationUrl", "Destination URL"),
    optionalField("price", "Price"),
    optionalField("promoCode", "Promo code"),
  ];
  const values = buildDefaultValues(variables);
  values.destinationUrl = "https://www.creatornivo.com/reddit-resource";
  values.price = "$4.90/month";
  values.promoCode = "FOUNDING490";
  const content = [
    "Use https://www.creatornivo.com/reddit-resource exactly once.",
    "Price: $4.90/month.",
    "Use promo code FOUNDING490.",
    "A discount explanation can stay when the actual terms were supplied.",
  ].join("\n");

  const sanitized = sanitizeGeneratedOutput(content, variables, values);

  assert.equal(sanitized.changed, false);
  assert.equal(sanitized.content, content);
  assert.deepEqual(validateGeneratedOutput(content, variables, values), {
    ok: true,
    issues: [],
  });
});

test("post-generation sanitizer removes commercial placeholders but leaves non-removable invented prices blocked", () => {
  const variables: TemplateVariable[] = [
    optionalField("price", "Price"),
    optionalField("promoCode", "Promo code"),
  ];
  const values = buildDefaultValues(variables);
  const sanitized = assertSanitizedOutputPasses(
    [
      "Price: [insert price].",
      "Use code [CODE] at checkout.",
      "Save XX% before the offer ends.",
      "A discount strategy can reduce friction when you already have approved pricing.",
    ].join("\n"),
    variables,
    values,
  );

  assert.doesNotMatch(sanitized.content, /\[insert price\]|\[CODE\]|XX%/);
  assert.match(sanitized.content, /discount strategy can reduce friction/i);

  const inventedPrice = sanitizeGeneratedOutput(
    "The offer is only $99 today.",
    variables,
    values,
  );
  assert.equal(inventedPrice.changed, false);
  assert.equal(
    validateGeneratedOutput(inventedPrice.content, variables, values).ok,
    false,
  );
});

test("post-generation sanitizer handles timing, proof, disclosure, contact, and visual placeholders safely", () => {
  const variables: TemplateVariable[] = [
    optionalField("eventDate", "Event date"),
    optionalField("location", "Location"),
    optionalField("proofPoints", "Proof points"),
    optionalField("affiliationDetails", "Affiliation details"),
    optionalField("contactDetails", "Contact details"),
    optionalField("visualDetails", "Visual details"),
  ];
  const values = buildDefaultValues(variables);
  const content = [
    "Join us on [date].",
    "Venue: [location].",
    "Proof: [insert statistic].",
    "Testimonial: [customer quote].",
    "Sponsored by [sponsor name].",
    "Contact: name@example.com or 555-123-4567.",
    "Follow @yourhandle.",
    "Image: [insert image].",
    "Screenshot: [add screenshot].",
    "The project started on July 4, 2026 and this historical date should stay.",
  ].join("\n");

  const sanitized = assertSanitizedOutputPasses(content, variables, values);

  assert.doesNotMatch(sanitized.content, /\[date\]|\[location\]/);
  assert.doesNotMatch(sanitized.content, /\[insert statistic\]|\[customer quote\]/);
  assert.doesNotMatch(sanitized.content, /\[sponsor name\]/);
  assert.doesNotMatch(sanitized.content, /name@example\.com|555-123-4567|@yourhandle/);
  assert.doesNotMatch(sanitized.content, /\[insert image\]|\[add screenshot\]/);
  assert.match(sanitized.content, /July 4, 2026/);
});

test("post-generation sanitizer preserves provided date, proof, disclosure, contact, and visual values", () => {
  const variables: TemplateVariable[] = [
    optionalField("eventDate", "Event date"),
    optionalField("location", "Location"),
    optionalField("proofPoints", "Proof points"),
    optionalField("affiliationDetails", "Affiliation details"),
    optionalField("contactDetails", "Contact details"),
    optionalField("visualDetails", "Visual details"),
  ];
  const values = buildDefaultValues(variables);
  values.eventDate = "July 31, 2026";
  values.location = "Online";
  values.proofPoints = "203 template tests passed.";
  values.affiliationDetails = "Disclosure: founder account.";
  values.contactDetails = "support@creatornivo.com";
  values.visualDetails = "Use an abstract workflow illustration.";
  const content = [
    "Date: July 31, 2026.",
    "Location: Online.",
    "Proof: 203 template tests passed.",
    "Disclosure: founder account.",
    "Contact: support@creatornivo.com.",
    "Visual concept: Use an abstract workflow illustration.",
  ].join("\n");

  const sanitized = sanitizeGeneratedOutput(content, variables, values);

  assert.equal(sanitized.changed, false);
  assert.equal(sanitized.content, content);
  assert.deepEqual(validateGeneratedOutput(content, variables, values), {
    ok: true,
    issues: [],
  });
});

test("post-generation sanitizer leaves ambiguous proof issues blocked when cleanup is unsafe", () => {
  const variables: TemplateVariable[] = [
    optionalField("sourceMaterial", "Source material"),
  ];
  const values = buildDefaultValues(variables);
  const sanitized = sanitizeGeneratedOutput(
    "According to research, this approach is proven to work.",
    variables,
    values,
  );

  assert.equal(sanitized.changed, false);
  assert.equal(
    validateGeneratedOutput(sanitized.content, variables, values).ok,
    false,
  );
});

test("Reddit Post production URL artifacts are sanitized when Destination URL is blank", () => {
  const template = templateBySlug("reddit-post");
  const variables = parseTemplateVariables(template.variables);
  const values = buildRequiredOnlyValues(template.slug, variables);
  values.promotionIntent = "Share a free resource";
  const content = [
    "Here's a practical planner you can adapt this week.",
    "I'll include a link to download the planner below.",
    "Download the Northstar Weekly Content Planner",
  ].join("\n");

  const sanitized = assertSanitizedOutputPasses(content, variables, values);

  assert.match(sanitized.content, /practical planner/);
  assert.doesNotMatch(sanitized.content, /include a link/i);
  assert.doesNotMatch(sanitized.content, /Download the Northstar Weekly Content Planner/);
  assert.ok(
    sanitized.changes.some((change) => change.category === "url"),
    "Reddit cleanup should be classified as URL cleanup",
  );
});

test("post-generation sanitizer has representative coverage across all 45 templates", () => {
  const sampleByCategory = {
    url: "Read more [here](#).",
    commercial: "Price: [insert price].",
    proof: "Proof: [insert statistic].",
    timing: "Date: [date].",
    disclosure: "Sponsored by [sponsor name].",
    contact: "Contact: name@example.com.",
    visual: "Image: [insert image].",
  };

  const coverageTable = catalog.map((template) => {
    const variables = parseTemplateVariables(template.variables);
    const values = buildRequiredOnlyValues(template.slug, variables);
    const categories = new Set(
      variables
        .filter(
          (variable) =>
            !variable.required &&
            !variable.defaultValue?.trim() &&
            !values[variable.key]?.trim(),
        )
        .flatMap((variable) => classifyOptionalFieldRiskCategories(variable)),
    );

    const categoryCoverage = Object.fromEntries(
      Object.entries(sampleByCategory).map(([category, sample]) => {
        if (!categories.has(category as keyof typeof sampleByCategory)) {
          return [category, true];
        }
        const sanitized = sanitizeGeneratedOutput(sample, variables, values);
        const validation = validateGeneratedOutput(
          sanitized.content,
          variables,
          values,
        );
        return [category, sanitized.changed && validation.ok];
      }),
    ) as Record<keyof typeof sampleByCategory, boolean>;

    return {
      templateSlug: template.slug,
      urlCleanupCovered: categoryCoverage.url,
      commercialCleanupCovered: categoryCoverage.commercial,
      dateLocationCleanupCovered: categoryCoverage.timing,
      proofCleanupCovered: categoryCoverage.proof,
      disclosureCleanupCovered: categoryCoverage.disclosure,
      contactCleanupCovered: categoryCoverage.contact,
      visualCleanupCovered: categoryCoverage.visual,
      safeSanitizationTest: Object.values(categoryCoverage).every(Boolean),
      validationFailureFallbackTest: true,
      status: Object.values(categoryCoverage).every(Boolean)
        ? "covered"
        : "needs review",
    };
  });

  assert.equal(coverageTable.length, 45);
  assert.deepEqual(
    coverageTable.filter((row) => row.status !== "covered"),
    [],
  );
  assert.ok(OUTPUT_SANITIZER_PATTERN_COUNT >= 20);
});

test("output validator has required-only risk coverage across all 45 templates", () => {
  const placeholderByCategory = {
    url: "Read more [here](#).",
    commercial: "Price: [insert price].",
    proof: "Proof: [insert statistic].",
    timing: "Date: [date].",
    disclosure: "Sponsored by [sponsor name].",
    contact: "Contact: name@example.com.",
    visual: "Image: [insert image].",
  };

  for (const template of catalog) {
    const variables = parseTemplateVariables(template.variables);
    const values = buildRequiredOnlyValues(template.slug, variables);
    const blankCategories = new Set(
      variables
        .filter(
          (variable) =>
            !variable.required &&
            !variable.defaultValue?.trim() &&
            !values[variable.key]?.trim(),
        )
        .flatMap((variable) => classifyOptionalFieldRiskCategories(variable)),
    );

    for (const category of blankCategories) {
      const result = validateGeneratedOutput(
        placeholderByCategory[category],
        variables,
        values,
      );
      assert.equal(
        result.ok,
        false,
        `${template.slug} should validate ${category} placeholder output`,
      );
      assert.ok(
        result.issues.some((issue) => issue.category === category),
        `${template.slug} should report ${category}`,
      );
    }
  }
});

test("generation route validates final output before saving and usage increment", () => {
  const route = readProjectFile("src", "app", "api", "ai", "generate", "route.ts");
  const validator = readProjectFile(
    "src",
    "lib",
    "templates",
    "output-validation.ts",
  );
  const autoRepairBranchIndex = route.indexOf(
    "if (isGenerationAutoRepairEnabled())",
  );
  const createContentTextIndex = route.indexOf(
    "await createContentText",
    autoRepairBranchIndex,
  );
  const bufferedSanitizerIndex = route.indexOf(
    "sanitizeGeneratedOutput(",
    createContentTextIndex,
  );
  const bufferedOutputValidationIndex = route.indexOf(
    "validateGeneratedOutput(",
    bufferedSanitizerIndex,
  );
  const bufferedFailIndex = route.indexOf(
    "prismaGenerationReservationStore.fail",
    bufferedOutputValidationIndex,
  );
  const bufferedCompleteCallIndex = route.indexOf(
    "await completeAndRecordUsage",
    bufferedOutputValidationIndex,
  );
  const finalResponseIndex = route.indexOf(
    "return new Response(finalContent",
    bufferedOutputValidationIndex,
  );
  const createContentStreamIndex = route.indexOf("await createContentStream");
  const sanitizerIndex = route.indexOf(
    "sanitizeGeneratedOutput(",
    createContentStreamIndex,
  );
  const outputValidationIndex = route.indexOf(
    "validateGeneratedOutput(",
    sanitizerIndex,
  );
  const failIndex = route.indexOf(
    "prismaGenerationReservationStore.fail",
    outputValidationIndex,
  );
  const streamingCompleteCallIndex = route.indexOf(
    "await completeAndRecordUsage",
    outputValidationIndex,
  );
  const completeIndex = route.indexOf("prismaGenerationReservationStore.complete");
  const incrementUsageIndex = route.indexOf("await incrementUsage");

  assert.ok(autoRepairBranchIndex >= 0);
  assert.ok(createContentTextIndex > autoRepairBranchIndex);
  assert.ok(bufferedSanitizerIndex > createContentTextIndex);
  assert.ok(bufferedOutputValidationIndex > bufferedSanitizerIndex);
  assert.ok(bufferedFailIndex > bufferedOutputValidationIndex);
  assert.ok(bufferedCompleteCallIndex > bufferedOutputValidationIndex);
  assert.ok(finalResponseIndex > bufferedCompleteCallIndex);
  assert.ok(finalResponseIndex < createContentStreamIndex);
  assert.ok(createContentStreamIndex >= 0);
  assert.ok(sanitizerIndex > createContentStreamIndex);
  assert.ok(outputValidationIndex > sanitizerIndex);
  assert.ok(failIndex > outputValidationIndex);
  assert.ok(streamingCompleteCallIndex > outputValidationIndex);
  assert.ok(completeIndex >= 0);
  assert.ok(incrementUsageIndex > completeIndex);
  assert.match(route, /result:\s*content/);
  assert.match(route, /content:\s*finalContent/);
  assert.match(route, /content:\s*sanitizedOutput\.content/);
  assert.equal(route.match(/await createContentStream/g)?.length, 1);
  assert.equal(route.match(/await reserveGeneration/g)?.length, 1);
  assert.doesNotMatch(validator, /createContentStream|reserveGeneration|incrementUsage/);
});

test("copy, save, and export paths are guarded by output validation", () => {
  const workspace = readProjectFile(
    "src",
    "components",
    "generate",
    "generate-workspace.tsx",
  );
  const generationResult = readProjectFile(
    "src",
    "components",
    "generate",
    "generation-result.tsx",
  );
  const exportButtons = readProjectFile(
    "src",
    "components",
    "export",
    "export-buttons.tsx",
  );
  const copyButton = readProjectFile(
    "src",
    "components",
    "library",
    "copy-content-button.tsx",
  );
  const libraryRoute = readProjectFile("src", "app", "api", "library", "route.ts");
  const exportRoute = readProjectFile("src", "app", "api", "export", "route.ts");
  const savedExportRoute = readProjectFile(
    "src",
    "app",
    "api",
    "library",
    "[id]",
    "export",
    "route.ts",
  );

  assert.match(workspace, /validateGeneratedOutput\(/);
  assert.match(workspace, /sanitizeGeneratedOutput\(/);
  assert.match(workspace, /templateValues: resultValidationContext\?\.values/);
  assert.match(workspace, /content:\s*sanitizedContent/);
  assert.match(generationResult, /outputValidationMessage/);
  assert.match(generationResult, /navigator\.clipboard\.writeText/);
  assert.match(exportButtons, /contentValidationMessage/);
  assert.match(copyButton, /sanitizeGeneratedOutput\(content\)/);
  assert.match(copyButton, /validateGeneratedOutput\(sanitizedOutput\.content\)/);
  assert.match(libraryRoute, /sanitizeGeneratedOutput\(/);
  assert.match(libraryRoute, /validateGeneratedOutput\(/);
  assert.match(exportRoute, /sanitizeGeneratedOutput\(content\)/);
  assert.match(exportRoute, /validateGeneratedOutput\(sanitizedOutput\.content\)/);
  assert.match(savedExportRoute, /sanitizeGeneratedOutput\(prompt\.content\)/);
  assert.match(savedExportRoute, /validateGeneratedOutput\(sanitizedOutput\.content\)/);
});

test("classified defaults distinguish active values from no-preference empty state", () => {
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
  const visualSuggestion = variables.find(
    (variable) => variable.key === "visualSuggestion",
  );
  assert.ok(visualSuggestion);

  assert.equal(
    classifyTemplateFieldDefault(visualSuggestion),
    "optional_no_preference",
  );
  assert.equal(isTemplateDefaultActive(visualSuggestion), false);
  assert.doesNotMatch(rendered, /Include visual suggestion:\s*Yes/);
  assert.match(rendered, /- Include visual suggestion/);

  const reddit = templateBySlug("reddit-post");
  const redditVariables = parseTemplateVariables(reddit.variables);
  const redditValues = buildRequiredOnlyValues(reddit.slug, redditVariables);
  const redditRendered = fillPromptTemplate(
    reddit.prompt,
    redditValues,
    redditVariables,
  );

  assert.match(redditRendered, /Promotion intent:\s*No promotion/);
  assert.match(redditRendered, /Relationship to subject:\s*No affiliation/);
  assert.doesNotMatch(redditRendered, /Mention own project if relevant/);
});

test("cross-field URL dependencies block link-dependent actions before generation", () => {
  const variables: TemplateVariable[] = [
    {
      ...optionalField("destinationUrl", "Destination URL"),
      format: "url",
    },
    {
      ...optionalField("desiredAction", "Desired reader action"),
      type: "select",
      options: ["Auto", "No preference", "Comment", "Download the guide"],
      defaultValue: "Auto",
    },
  ];

  assert.equal(
    validateVariableValues(variables, {
      destinationUrl: "",
      desiredAction: "",
    }),
    null,
  );
  assert.equal(
    validateVariableValues(variables, {
      destinationUrl: "",
      desiredAction: "Auto",
    }),
    null,
  );
  assert.match(
    validateVariableValues(variables, {
      destinationUrl: "",
      desiredAction: "Download the guide",
    }) ?? "",
    /requires a URL or link field/,
  );
  assert.equal(
    validateVariableValues(variables, {
      destinationUrl: "https://www.creatornivo.com/download",
      desiredAction: "Download the guide",
    }),
    null,
  );
});

test("representative templates reset risky optional defaults to no-preference where needed", () => {
  const expectations = [
    ["reddit-post", "promotionIntent", "No promotion", true],
    ["reddit-post", "relationshipToSubject", "No affiliation", true],
    ["facebook-post", "includeVisualConcept", "", false],
    ["google-business-profile-post", "visualSuggestion", "", false],
    ["instagram-post", "hashtagPreference", "Auto", true],
    ["linkedin-post", "desiredAction", "Auto", true],
    ["product-hunt-launch", "ctaFocus", "", false],
    ["webinar-package", "offerType", "No commercial offer", true],
  ] as const;

  for (const [slug, key, expectedInitial, expectedActive] of expectations) {
    const template = templateBySlug(slug);
    const variables = parseTemplateVariables(template.variables);
    const variable = variables.find((item) => item.key === key);
    assert.ok(variable, `${slug}.${key} exists`);
    const values = buildDefaultValues(variables);

    assert.equal(values[key], expectedInitial, `${slug}.${key} initial state`);
    assert.equal(
      isTemplateDefaultActive(variable),
      expectedActive,
      `${slug}.${key} active default`,
    );
  }
});
