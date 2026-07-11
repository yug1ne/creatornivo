/**
 * Builds the Email Sequence form schema from the approved 43-field specification.
 * Does NOT modify the prompt text. It verifies that every prompt variable has
 * exactly one form field before writing the form JSON.
 *
 * Usage: node scripts/build-email-sequence-form.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const promptPath = path.join(
  root,
  "prisma",
  "template-prompts",
  "email-sequence.txt",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "email-sequence-variables.json",
);

const groups = [
  {
    id: "essentials",
    title: "Essentials",
    description:
      "Minimum information needed to understand the sequence, audience, goal, sender, CTA, language, and permission context.",
    defaultOpen: true,
  },
  {
    id: "audience_journey",
    title: "Audience & Journey",
    description:
      "Audience awareness, relationship stage, objections, trigger context, and legitimate personalization.",
    defaultOpen: false,
  },
  {
    id: "offer_proof_conversion",
    title: "Offer, Proof & Conversion",
    description:
      "Benefits, details, terms, pricing, evidence, quotes, deadlines, and relevant alternatives.",
    defaultOpen: false,
  },
  {
    id: "brand_delivery",
    title: "Brand & Delivery",
    description:
      "Tone, sender perspective, email length, formatting, cadence, timing constraints, and emoji use.",
    defaultOpen: false,
  },
  {
    id: "compliance_output",
    title: "Compliance & Output",
    description:
      "Regulated topics, jurisdiction, restrictions, output depth, plain-text versions, and final requirements.",
    defaultOpen: false,
  },
];

const defaultValues = {
  sequenceType: "Lead nurture",
  primaryGoal: "Build trust",
  outputLanguage: "English",
  emailCount: "5",
  sequenceDepth: "Balanced",
  primaryCta: "Auto",
  consentStatus: "Confirmed subscribers",
  awarenessLevel: "Auto",
  relationshipStage: "New contact",
  tone: "Clear and natural",
  senderPerspective: "Auto",
  emailLength: "Auto",
  cadenceStyle: "Auto",
  emojiUse: "Minimal",
  formattingPreferences: "Short paragraphs",
  regulatedTopic: "None",
  outputMode: "Complete package",
  includePlainTextVersions: "No",
};

const options = {
  sequenceType: [
    "Welcome or onboarding",
    "Lead nurture",
    "Educational drip",
    "Product launch",
    "Sales or promotion",
    "Abandoned cart",
    "Post-purchase",
    "Re-engagement",
    "Event or webinar follow-up",
    "Custom",
  ],
  primaryGoal: [
    "Educate the audience",
    "Build trust",
    "Activate users",
    "Generate sales",
    "Book calls",
    "Drive registrations",
    "Recover checkout",
    "Retain or reactivate",
    "Other",
  ],
  sequenceDepth: ["Auto", "Concise", "Balanced", "Detailed"],
  primaryCta: [
    "Auto",
    "Visit page",
    "Buy now",
    "Book a call",
    "Start free trial",
    "Register",
    "Download",
    "Reply",
    "No direct CTA",
  ],
  consentStatus: [
    "Confirmed subscribers",
    "Existing customers",
    "Registered attendees",
    "Opted-in leads",
    "Cold prospects",
    "Transactional recipients",
    "Consent uncertain",
  ],
  awarenessLevel: [
    "Auto",
    "Unaware",
    "Problem aware",
    "Solution aware",
    "Product aware",
    "Most aware",
  ],
  relationshipStage: [
    "New contact",
    "Warm lead",
    "Existing customer",
    "Active user",
    "Lapsed contact",
    "Cold prospect",
  ],
  commonObjections: [
    "Price or budget",
    "Time or effort",
    "Trust or credibility",
    "Need or priority",
    "Complexity",
    "Switching risk",
    "Team approval",
    "Timing",
  ],
  tone: [
    "Clear and natural",
    "Friendly",
    "Professional",
    "Conversational",
    "Warm",
    "Direct",
    "Educational",
    "Persuasive",
    "Premium",
    "Playful",
  ],
  senderPerspective: ["Auto", "Individual", "Founder", "Team", "Company"],
  emailLength: ["Auto", "Short", "Medium", "Long", "Mixed by email"],
  cadenceStyle: ["Auto", "Fast", "Balanced", "Gentle", "Event-based", "Custom"],
  emojiUse: ["None", "Minimal", "Moderate", "Auto"],
  formattingPreferences: [
    "Plain-text style",
    "Short paragraphs",
    "Bullets allowed",
    "Bold key lines",
    "P.S. allowed",
    "Button CTA",
    "Text-link CTA",
    "No special formatting",
  ],
  regulatedTopic: [
    "None",
    "Health or medical",
    "Legal",
    "Finance or investing",
    "Tax or insurance",
    "Employment",
    "Safety",
    "Political",
    "Child-related",
    "Other regulated",
  ],
  outputMode: [
    "Complete package",
    "Copy only",
    "Strategy and outline",
    "A/B subject lines",
  ],
  includePlainTextVersions: ["Yes", "No"],
};

const showWhen = {
  destinationUrl: {
    key: "primaryCta",
    equals: [
      "Visit page",
      "Buy now",
      "Book a call",
      "Start free trial",
      "Register",
      "Download",
    ],
  },
  triggerEvent: {
    key: "sequenceType",
    equals: [
      "Welcome or onboarding",
      "Abandoned cart",
      "Post-purchase",
      "Re-engagement",
      "Event or webinar follow-up",
    ],
  },
  deadlineOrAvailability: {
    key: "sequenceType",
    equals: [
      "Product launch",
      "Sales or promotion",
      "Abandoned cart",
      "Event or webinar follow-up",
    ],
  },
  jurisdiction: { key: "regulatedTopic", notEquals: "None" },
};

const examples = {
  sequenceType: "Lead nurture",
  primaryGoal: "Build trust",
  primaryCta: "Visit page",
  consentStatus: "Confirmed subscribers",
  awarenessLevel: "Problem aware",
  relationshipStage: "Warm lead",
  commonObjections: "Price or budget, Trust or credibility",
  tone: "Clear and natural",
  senderPerspective: "Founder",
  emailLength: "Medium",
  cadenceStyle: "Balanced",
  emojiUse: "Minimal",
  formattingPreferences: "Short paragraphs, P.S. allowed",
  regulatedTopic: "None",
  outputMode: "Complete package",
  includePlainTextVersions: "Yes",
};

const fieldRows = `
sequenceName|Sequence name|essentials|text|yes|120|New customer onboarding|Give the sequence a clear internal name.|It identifies the sequence and provides a useful heading for the generated package.
sequenceType|Sequence type|essentials|select|yes|40|Select a sequence type|Choose the journey that most closely matches your goal.|Different sequence types require different progression, timing, and promotional intensity.
primaryGoal|Primary goal|essentials|select|yes|40|Select the main goal|Choose the single most important result the sequence should support.|The goal determines the sequence progression and primary CTA.
businessName|Business or brand|essentials|text|yes|160|Acme Studio|Enter the sender’s business, product, organization, or brand name.|The model must know who is communicating and how to identify the sender.
offerOrTopic|Offer or topic|essentials|textarea|yes|1500|Describe the product, service, event, resource, or topic.|Explain what the sequence is about and what the reader is being introduced to.|The central offer or topic cannot be safely inferred.
targetAudience|Target audience|essentials|textarea|yes|1200|Independent designers considering their first client-management tool.|Describe the intended recipients and any important shared characteristics.|Audience context materially changes the language, assumptions, objections, and CTA.
keyMessage|Key message|essentials|textarea|yes|1000|The main idea readers should understand after completing the sequence.|State the central takeaway in plain language.|It prevents the sequence from becoming unfocused or internally inconsistent.
outputLanguage|Output language|essentials|text|yes|80|English|Enter any language or regional language variant.|The language cannot always be inferred from the surrounding interface.
emailCount|Number of emails|essentials|number|no||5|Choose between 2 and 10 emails.|The required sequence length materially changes its structure and pacing.
sequenceDepth|Sequence depth|essentials|select|no|24|Select depth|Controls how much strategic and educational detail is distributed across the sequence.|It allows the user to control complexity without specifying specialist copywriting rules.
senderName|Sender name|essentials|text|no|120|Alex from Acme|Add the person or team name that should appear in the sign-off.|A supplied sender identity makes the emails more natural and implementation-ready.
primaryCta|Primary CTA|essentials|select|no|32|Select the main action|Choose the main action or let the model select a suitable low-friction step.|The main conversion action determines how the sequence progresses.
destinationUrl|CTA destination URL|essentials|URL|no|500|https://example.com/product|Provide the real destination for click-based CTAs.|The system must not invent links or send readers to an unspecified destination.
consentStatus|Contact permission|essentials|select|yes|40|Select the relationship|Describe why these recipients may lawfully and reasonably receive the sequence.|Permission and relationship context materially affect tone, frequency, promotion, and opt-out handling.
awarenessLevel|Audience awareness|audience_journey|select|no|32|Select awareness level|Choose how familiar recipients are with the problem and offer.|Awareness level changes how much explanation is needed before presenting the offer.
audiencePain|Audience problem|audience_journey|textarea|no|1000|What problem, frustration, or unmet need brings readers to this topic?|Focus on the most relevant problem rather than every possible pain point.|A specific problem creates relevance and helps avoid generic copy.
desiredOutcome|Desired reader outcome|audience_journey|textarea|no|1000|What useful change or result does the reader want?|Describe the realistic outcome the audience hopes to achieve.|It helps connect benefits and CTAs to a meaningful reader goal.
relationshipStage|Relationship stage|audience_journey|select|no|32|Select relationship stage|Choose the audience’s current relationship with the sender.|The model should not assume trust or familiarity that does not exist.
triggerEvent|Sequence trigger|audience_journey|textarea|no|600|Signed up, left checkout, attended an event, or stopped using the product.|Describe the real action or event that starts the sequence.|Triggered sequences must accurately acknowledge the real event without fabricating behavior.
commonObjections|Common objections|audience_journey|multi-select|no|256|Select relevant objections|Choose only the barriers that genuinely affect this audience.|Relevant objections help give later emails distinct roles.
personalizationData|Personalization data|audience_journey|textarea|no|1000|Approved fields such as first name, plan, industry, or signup source.|Include only legitimate data that may safely be used in the emails.|The system must distinguish real personalization from fabricated familiarity.
keyBenefits|Key benefits|offer_proof_conversion|textarea|no|1200|List the most important practical benefits for this audience.|Describe useful outcomes rather than unsupported hype.|Supplied benefits make the sequence more specific and commercially relevant.
importantDetails|Important details|offer_proof_conversion|textarea|no|1500|Features, process, eligibility, delivery method, dates, or requirements.|Add factual information readers need before taking action.|Important operational facts cannot be safely invented.
offerTerms|Offer terms|offer_proof_conversion|textarea|no|1200|Trial conditions, included services, refund terms, or purchase conditions.|Include exact terms that must be communicated accurately.|Terms affect conversion copy and must not be inferred.
pricingDetails|Pricing details|offer_proof_conversion|textarea|no|1000|Price, billing period, plan differences, or approved discount.|Leave blank when pricing should not appear.|Prices and discounts must only be used when supplied.
proofPoints|Approved proof points|offer_proof_conversion|textarea|no|2000|Verified metrics, certifications, research, customer numbers, or results.|Include only evidence that may be used publicly.|It allows credible support while preventing fabricated evidence.
testimonialsOrQuotes|Approved quotes|offer_proof_conversion|textarea|no|2000|Paste exact approved testimonials or quotations with attribution.|Do not summarize unapproved feedback as a testimonial.|Exact source wording is required to use testimonials truthfully.
deadlineOrAvailability|Deadline or availability|offer_proof_conversion|textarea|no|600|Registration closes 18 September at 17:00 CET.|Add only real deadlines, availability limits, or launch dates.|It prevents the model from inventing urgency or scarcity.
alternativesOrCompetitors|Alternatives to address|offer_proof_conversion|textarea|no|1000|Describe relevant alternatives and factual differences.|Use this for fair positioning, not unsupported superiority claims.|Supplied comparison context can improve positioning without encouraging disparagement.
tone|Tone|brand_delivery|select|no|32|Select a tone|Choose the overall communication style.|Tone is a legitimate brand preference that cannot always be inferred.
brandVoice|Brand voice notes|brand_delivery|textarea|no|1200|Calm, practical, slightly informal, and never overly enthusiastic.|Describe distinctive voice traits or paste a short approved example.|It helps the sequence sound consistent with the existing brand.
senderPerspective|Sender perspective|brand_delivery|select|no|24|Select sender perspective|Choose whether the emails speak as a person, founder, team, or company.|Pronouns, sign-offs, and relationship language depend on the sender perspective.
emailLength|Email length|brand_delivery|select|no|24|Select email length|Controls the approximate body length while preserving mobile readability.|Some sequences require brief operational emails while others need deeper education.
cadenceStyle|Cadence style|brand_delivery|select|no|24|Select cadence|Choose the general pacing or let the model recommend one.|The desired frequency affects timing recommendations and pressure level.
timingConstraints|Timing constraints|brand_delivery|textarea|no|1000|Do not send on weekends; final email must arrive before 12 October.|Add real scheduling restrictions, dates, or automation requirements.|The model cannot infer business-specific scheduling limitations.
emojiUse|Emoji use|brand_delivery|select|no|16|Select emoji use|Controls whether emojis may appear in subjects or bodies.|Emoji use is a visible brand and audience preference.
formattingPreferences|Formatting preferences|brand_delivery|multi-select|no|256|Select formatting preferences|Choose useful presentation preferences without specifying technical HTML.|Formatting affects readability and implementation in the user’s email platform.
regulatedTopic|Regulated topic|compliance_output|select|no|32|Select when relevant|Choose a category only when the sequence touches a regulated or high-stakes subject.|High-stakes topics require more cautious language and verification.
jurisdiction|Relevant jurisdiction|compliance_output|text|no|160|European Union, California, United Kingdom, or Ukraine.|Enter the country, region, or legal market relevant to the sequence.|Regulated wording and required verification may depend on location.
restrictions|Restrictions|compliance_output|textarea|no|1500|Claims to avoid, prohibited terms, required wording, or sensitive topics.|Combine all brand, legal, and editorial restrictions here.|User-specific restrictions cannot be reliably inferred from general best practices.
outputMode|Output mode|compliance_output|select|no|32|Select output mode|Choose whether you need full copy, strategy, or additional subject-line testing.|It controls the amount and type of content generated without adding several separate toggles.
includePlainTextVersions|Include plain-text versions|compliance_output|toggle|no|5|No|Add simplified plain-text copies for systems that do not use formatted email.|Some email platforms and accessibility workflows require a separate plain-text version.
additionalContext|Additional context|compliance_output|textarea|no|2000|Add any final context that does not fit the fields above.|Use this only for genuinely useful extra requirements.|It handles uncommon but relevant information without creating multiple low-value fields.
`;

function parsePromptVariables(prompt) {
  return [
    ...new Set(
      [...prompt.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)].map(
        (match) => match[1],
      ),
    ),
  ];
}

function adaptType(sourceType) {
  if (sourceType === "URL") return { type: "text", format: "url" };
  if (sourceType === "multi-select") return { type: "textarea" };
  if (sourceType === "toggle") return { type: "select" };
  return { type: sourceType };
}

function helpAvoidFor(field) {
  if (field.required) {
    return "Avoid vague placeholders, invented facts, or values that conflict with the actual sequence context.";
  }
  if (field.key === "destinationUrl") {
    return "Avoid fake links, tracking links you cannot verify, or unrelated destinations.";
  }
  if (field.key === "proofPoints" || field.key === "testimonialsOrQuotes") {
    return "Avoid invented metrics, paraphrased testimonials, or evidence that has not been approved for public use.";
  }
  if (field.key === "deadlineOrAvailability") {
    return "Avoid fake urgency, artificial scarcity, or deadlines that are not real.";
  }
  if (field.key === "pricingDetails" || field.key === "offerTerms") {
    return "Avoid approximate commercial terms when exact wording, eligibility, or pricing matters.";
  }
  if (field.key === "personalizationData") {
    return "Avoid private, sensitive, or inferred data that the email system cannot legitimately use.";
  }
  return "Avoid guessed details, unsupported claims, or extra requirements that do not apply to this sequence.";
}

function buildField(row) {
  const [
    key,
    label,
    group,
    sourceType,
    requiredRaw,
    maxLengthRaw,
    placeholder,
    baseHint,
    why,
  ] = row.split("|");

  const required = requiredRaw === "yes";
  const adapted = adaptType(sourceType);
  const field = {
    key,
    label,
    group,
    groupTitle: groups.find((g) => g.id === group)?.title,
    type: adapted.type,
    required,
    placeholder,
    hint: baseHint,
    help: {
      what: required
        ? `Provide the ${label.toLowerCase()} for this email sequence.`
        : `Optional context for the ${label.toLowerCase()} field.`,
      why,
      example: `Good example: ${examples[key] ?? placeholder}`,
      avoid: helpAvoidFor({ key, required }),
    },
  };

  if (adapted.format) field.format = adapted.format;
  if (defaultValues[key]) field.defaultValue = defaultValues[key];
  if (maxLengthRaw) field.maxLength = Number(maxLengthRaw);
  if (options[key]) field.options = options[key];
  if (showWhen[key]) field.showWhen = showWhen[key];
  if (sourceType === "textarea" || sourceType === "URL" || field.maxLength > 500) {
    field.fullWidth = true;
  }

  if (sourceType === "multi-select") {
    field.hint = `${baseHint} Current form controls do not support checkboxes for this template yet, so list the relevant options separated by commas.`;
    field.help.what =
      "List one or more relevant options separated by commas. This preserves the prompt variable while using the current textarea control.";
  }

  if (sourceType === "toggle") {
    field.hint = `${baseHint} Choose Yes or No.`;
    field.help.what =
      "Choose whether the generated package should include separate plain-text email versions.";
  }

  if (key === "emailCount") {
    field.min = 2;
    field.max = 10;
  }

  return field;
}

const variables = fieldRows
  .trim()
  .split("\n")
  .map((line) => buildField(line.trim()));

const prompt = fs.readFileSync(promptPath, "utf8");
const promptVariables = parsePromptVariables(prompt);
const formKeys = variables.map((variable) => variable.key);
const missingFromForm = promptVariables.filter((key) => !formKeys.includes(key));
const extraInForm = formKeys.filter((key) => !promptVariables.includes(key));

if (missingFromForm.length || extraInForm.length) {
  throw new Error(
    [
      missingFromForm.length
        ? `Missing form fields: ${missingFromForm.join(", ")}`
        : "",
      extraInForm.length ? `Extra form fields: ${extraInForm.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

const schema = {
  slug: "email-sequence",
  title: "Email Sequence",
  fieldCount: variables.length,
  requiredKeys: variables
    .filter((variable) => variable.required)
    .map((variable) => variable.key),
  groups,
  variables,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(schema, null, 2)}\n`);

console.log(
  `Wrote ${path.relative(root, outPath)} with ${variables.length} fields.`,
);
