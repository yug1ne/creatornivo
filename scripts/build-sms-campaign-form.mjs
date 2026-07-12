/**
 * Builds the SMS Campaign form schema from the approved 24-field
 * specification. It verifies that every prompt variable has exactly one form
 * field before writing the form JSON.
 *
 * Usage: node scripts/build-sms-campaign-form.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const promptPath = path.join(root, "prisma", "template-prompts", "sms-campaign.txt");
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "sms-campaign-variables.json",
);

const groups = [
  {
    id: "essentials",
    title: "Essentials",
    description:
      "Campaign subject, sender, objective, audience, confirmed details, recipient relationship, CTA destination, language, tone, and variant count.",
    defaultOpen: true,
  },
  {
    id: "campaign_setup",
    title: "Campaign Setup",
    description:
      "Campaign format, offer terms, important dates, timing context, personalization fields, and sequence spacing.",
    defaultOpen: false,
  },
  {
    id: "brand_message",
    title: "Brand & Message",
    description:
      "Brand voice, required wording, restrictions, and emoji preferences for concise SMS copy.",
    defaultOpen: false,
  },
  {
    id: "compliance_delivery",
    title: "Compliance & Delivery",
    description:
      "Recipient region, opt-out handling, custom opt-out wording, and message-length target.",
    defaultOpen: false,
  },
];

const groupIdsByTitle = Object.fromEntries(
  groups.map((group) => [group.title, group.id]),
);

const showWhen = {
  sequenceGap: {
    key: "campaignFormat",
    equals: ["Two-message sequence", "Three-message sequence"],
  },
  customOptOutText: { key: "optOutMode", equals: "Custom wording" },
};

const defaults = {
  campaignObjective: "Promote an offer",
  recipientPermission: "Explicit opt-in",
  outputLanguage: "English",
  tone: "Clear and natural",
  variantCount: "3",
  campaignFormat: "Single message",
  sequenceGap: "Auto",
  emojiUse: "Minimal",
  optOutMode: "Auto",
  characterTarget: "Auto based on language",
};

const examples = {
  campaignSubject: "Appointment reminder for confirmed patients",
  senderName: "Creatornivo",
  campaignObjective: "Send a reminder",
  targetAudience:
    "Existing customers who booked a consultation and agreed to receive SMS reminders.",
  essentialDetails:
    "The appointment is tomorrow at 10:00 AM. Recipients can reschedule from the supplied link.",
  recipientPermission: "Explicit opt-in",
  destinationUrl: "https://www.creatornivo.com/offer",
  outputLanguage: "English",
  tone: "Clear and natural",
  variantCount: "3",
  campaignFormat: "Single message",
  offerDetails:
    "20% discount applies to annual plans through the confirmed campaign date.",
  importantDate: "2026-08-20",
  timingContext: "Send one day before the appointment during local business hours.",
  personalizationData: "First name, appointment time, and store location.",
  sequenceGap: "24 hours",
  brandVoiceNotes: "Helpful, direct, and low-pressure.",
  requiredWording: "Reply STOP to opt out",
  restrictions: "Do not mention price unless it is supplied.",
  emojiUse: "Minimal",
  recipientRegion: "United States",
  optOutMode: "Include standard wording",
  customOptOutText: "Reply STOP to opt out",
  characterTarget: "Single-SMS safe target",
};

const fieldRows = `
campaignSubject|Campaign subject|Essentials|text|yes|160|Blank|Summer sale, appointment reminder, event invitation, service update|Describe what the SMS campaign is about.|It establishes the central subject that every message must communicate.|
senderName|Sender name|Essentials|text|yes|80|Blank|Northside Dental, Acme Store, BrightPath|Enter the business, organization, product, or service recipients should recognize.|SMS recipients need clear sender context, especially when the sender ID may be unfamiliar.|
campaignObjective|Campaign objective|Essentials|select|yes|32|Promote an offer|Select the main objective|Choose the single most important result this campaign should achieve.|The objective determines the message structure, CTA, urgency level, and sequence logic.|Promote an offer~Announce an update~Invite to an event~Send a reminder~Re-engage customers~Share a service alert~Request an action~Other
targetAudience|Target audience|Essentials|textarea|yes|700|Blank|Existing customers who purchased in the past six months|Describe the recipients and their relevant relationship with the sender.|Audience context materially changes relevance, vocabulary, assumptions, and CTA framing.|
essentialDetails|Essential message details|Essentials|textarea|yes|1500|Blank|What happened, what is available, what recipients need to know, and what action matters|Include only confirmed facts that must appear in the messages.|The generator cannot safely infer campaign facts, terms, instructions, or product details.|
recipientPermission|Recipient relationship|Essentials|select|yes|32|Explicit opt-in|Select how recipients are eligible|Choose the closest description of why these recipients may receive the message.|The recipient relationship affects promotional wording, identification, opt-out handling, and compliance warnings.|Explicit opt-in~Existing customer relationship~Transactional or service basis~Internal audience~Unsure — use caution
destinationUrl|Destination URL|Essentials|URL|no|500|Blank|https://www.creatornivo.com/offer|Add the final destination for the primary action. Leave blank when no link is needed.|A supplied URL enables a specific, actionable CTA without inventing a destination.|
outputLanguage|Output language|Essentials|text|no|60|English|English, Ukrainian, German, Spanish|Enter the language for the generated campaign.|Language affects tone, encoding, character capacity, punctuation, and message length.|
tone|Tone|Essentials|select|no|32|Clear and natural|Select a tone|Choose the overall voice without changing the confirmed facts.|Tone is a genuine brand preference that materially changes the message.|Clear and natural~Friendly~Professional~Warm~Playful~Minimal~Urgent but honest
variantCount|Number of variants|Essentials|number|no|1|3|3|Generate between one and five distinct versions for each campaign message.|It lets users choose between one finished message and several testable alternatives.|min:1~max:5
campaignFormat|Campaign format|Campaign Setup|select|no|32|Single message|Select campaign format|Choose one SMS or a short sequence with a clear progression.|A sequence requires different pacing, repetition control, and timing recommendations.|Single message~Two-message sequence~Three-message sequence
offerDetails|Offer or incentive details|Campaign Setup|textarea|no|1000|Blank|Discount, eligibility, exclusions, redemption method, price, or availability|Provide confirmed offer terms. Leave blank for non-promotional campaigns.|Offers cannot be accurately described without supplied terms, restrictions, and eligibility details.|
importantDate|Important date|Campaign Setup|date|no|10|Blank|2026-08-20|Add a confirmed event, appointment, launch, or expiration date.|Dates materially affect clarity and urgency and must never be invented.|
timingContext|Timing context|Campaign Setup|textarea|no|500|Blank|Send one day before the appointment or during local business hours|Describe when the message is relevant or when it should be sent.|SMS effectiveness and appropriateness often depend on when the recipient receives it.|
personalizationData|Available personalization|Campaign Setup|textarea|no|500|Blank|First name, appointment time, store location, order number|List only data fields the sending platform can reliably insert.|The prompt must not invent names, purchase history, locations, or other personal information.|
sequenceGap|Sequence spacing|Campaign Setup|text|no|100|Auto|24 hours, three days, morning of the event|Describe the preferred delay between messages or leave as Auto.|Multi-message campaigns need an explicit or safely inferred cadence.|
brandVoiceNotes|Brand voice notes|Brand & Message|textarea|no|700|Blank|Direct and practical, calm healthcare tone, casual local-business voice|Add distinctive voice guidance that is not already covered by the tone setting.|It preserves meaningful brand characteristics without creating several overlapping style fields.|
requiredWording|Required wording|Brand & Message|textarea|no|700|Blank|Required disclaimer, legal phrase, product name, booking instruction|Enter exact wording that must appear when space and context allow.|Some campaigns require exact names, instructions, disclosures, or approved phrases.|
restrictions|Restrictions and claims to avoid|Brand & Message|textarea|no|1000|Blank|Do not mention price, avoid medical promises, do not use the word free|List campaign-specific restrictions, prohibited claims, or sensitive wording.|The sender may have legal, brand, contractual, or factual restrictions the model cannot infer.|
emojiUse|Emoji use|Brand & Message|select|no|16|Minimal|Select emoji preference|Remember that some symbols may affect SMS encoding and message length.|Emoji preferences affect tone, encoding, character capacity, and deliverability.|None~Minimal~Auto
recipientRegion|Recipient region|Compliance & Delivery|text|no|120|Blank|United States, United Kingdom, EU, Ukraine, Canada|Add the main recipient country or jurisdiction when compliance requirements may differ.|Consent, sender identification, opt-out, and marketing-message rules can vary by jurisdiction.|
optOutMode|Opt-out handling|Compliance & Delivery|select|no|32|Auto|Select opt-out handling|Choose how unsubscribe wording should be handled in promotional messages.|Opt-out wording depends on campaign type, region, recipient basis, and the sender’s existing process.|Auto~Include standard wording~Custom wording~Review as transactional
customOptOutText|Custom opt-out wording|Compliance & Delivery|text|no|160|Blank|Reply STOP to opt out|Enter the exact supported instruction used by your messaging provider.|The generator must not invent an unsupported unsubscribe command.|
characterTarget|Message length target|Compliance & Delivery|select|no|32|Auto based on language|Select a length target|Choose a conservative single-message target or allow concise multipart delivery.|The preferred delivery format affects message compression, CTA wording, and sequence design.|Auto based on language~Single-SMS safe target~Concise multipart allowed
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
  if (sourceType === "date") return { type: "text" };
  return { type: sourceType };
}

function helpAvoidFor(field) {
  if (field.key === "destinationUrl") {
    return "Avoid invented, shortened, unapproved, or misleading links.";
  }
  if (field.key === "personalizationData") {
    return "Avoid personal data that the sending platform cannot reliably insert or that recipients did not expect to be used.";
  }
  if (field.key === "customOptOutText") {
    return "Avoid unsubscribe wording that your SMS provider does not actually support.";
  }
  if (field.key === "offerDetails" || field.key === "essentialDetails") {
    return "Avoid invented prices, discounts, deadlines, product claims, availability, results, or eligibility rules.";
  }
  if (field.key === "restrictions" || field.key === "requiredWording") {
    return "Avoid vague legal instructions; add exact wording or exact restrictions when they matter.";
  }
  if (field.required) {
    return "Avoid vague placeholders, unsupported urgency, fake scarcity, fake personalization, or changing the campaign into a different subject.";
  }
  return "Avoid guessed facts, fake urgency, fake scarcity, manipulative pressure, unsupported claims, or private recipient data.";
}

function parseOptions(rawOptions) {
  if (!rawOptions) return {};

  if (rawOptions.startsWith("min:")) {
    const entries = Object.fromEntries(
      rawOptions.split("~").map((item) => {
        const [key, value] = item.split(":");
        return [key, Number(value)];
      }),
    );
    return { min: entries.min, max: entries.max };
  }

  return { options: rawOptions.split("~") };
}

function buildField(row) {
  const [
    key,
    label,
    groupTitle,
    sourceType,
    requiredRaw,
    maxLengthRaw,
    defaultRaw,
    placeholder,
    hint,
    why,
    rawOptions = "",
  ] = row.split("|");

  const required = requiredRaw === "yes";
  const adapted = adaptType(sourceType);
  const optionData = parseOptions(rawOptions);
  const maxLength = Number(maxLengthRaw);
  const defaultValue =
    defaultRaw !== "Blank" && defaults[key] ? defaults[key] : undefined;

  const field = {
    key,
    label,
    group: groupIdsByTitle[groupTitle],
    groupTitle,
    type: adapted.type,
    required,
    placeholder,
    hint,
    help: {
      what: required
        ? `Provide the ${label.toLowerCase()} before generating the SMS campaign.`
        : `Optional context for the ${label.toLowerCase()} field.`,
      why,
      example: `Good example: ${examples[key] ?? placeholder}`,
      avoid: helpAvoidFor({ key, required }),
    },
  };

  if (adapted.format) field.format = adapted.format;
  if (defaultValue) field.defaultValue = defaultValue;
  if (optionData.options) field.options = optionData.options;
  if (Number.isFinite(optionData.min)) field.min = optionData.min;
  if (Number.isFinite(optionData.max)) field.max = optionData.max;
  if (Number.isFinite(maxLength)) field.maxLength = maxLength;
  if (showWhen[key]) field.showWhen = showWhen[key];
  if (sourceType === "textarea" || maxLength > 500) field.fullWidth = true;

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
  slug: "sms-campaign",
  title: "SMS Campaign",
  fieldCount: variables.length,
  requiredKeys: variables
    .filter((variable) => variable.required)
    .map((variable) => variable.key),
  groups,
  variables,
};

if (schema.fieldCount !== 24) {
  throw new Error(`Expected 24 fields, got ${schema.fieldCount}`);
}

if (schema.requiredKeys.length !== 6) {
  throw new Error(`Expected 6 required fields, got ${schema.requiredKeys.length}`);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(schema, null, 2)}\n`);

console.log(
  `Wrote ${path.relative(root, outPath)} with ${variables.length} fields.`,
);
