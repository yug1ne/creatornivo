/**
 * Builds the WhatsApp Broadcast form schema from the approved 24-field
 * specification. It verifies that every prompt variable has exactly one form
 * field before writing the form JSON.
 *
 * Usage: node scripts/build-whatsapp-broadcast-form.mjs
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
  "whatsapp-broadcast.txt",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "whatsapp-broadcast-variables.json",
);

const groups = [
  {
    id: "essentials",
    title: "Essentials",
    description:
      "Sender identity, audience, objective, message facts, CTA destination, language, and recipient-consent confirmation.",
    defaultOpen: true,
  },
  {
    id: "audience_personalization",
    title: "Audience & Personalization",
    description:
      "Recipient relationship and safe personalization controls for WhatsApp broadcast wording.",
    defaultOpen: false,
  },
  {
    id: "message_style_timing",
    title: "Message Style & Timing",
    description:
      "Supporting facts, tone, length, emoji use, and time-sensitive details.",
    defaultOpen: false,
  },
  {
    id: "compliance_output",
    title: "Compliance & Output",
    description:
      "Offer terms, opt-out wording, sensitive category, output quantity, and final requirements.",
    defaultOpen: false,
  },
];

const defaultValues = {
  broadcastType: "Announcement",
  primaryCTA: "Auto",
  outputLanguage: "English",
  consentConfirmed: "Off",
  audienceRelationship: "Existing customers or subscribers",
  personalizationMode: "None",
  personalizationToken: "[First name]",
  tone: "Clear and natural",
  length: "Platform appropriate",
  emojiUse: "Minimal",
  optOutMode: "Auto",
  sensitiveCategory: "None",
  variantCount: "2",
};

const options = {
  broadcastType: [
    "Announcement",
    "Promotion or offer",
    "Event or reminder",
    "Product or service update",
    "Useful content or tip",
    "Operational notice",
  ],
  primaryGoal: [
    "Inform recipients",
    "Drive clicks",
    "Get replies",
    "Drive purchase or booking",
    "Confirm an action",
    "Re-engage the audience",
  ],
  consentConfirmed: ["On", "Off"],
  audienceRelationship: [
    "Existing customers or subscribers",
    "Members or community",
    "Event registrants or attendees",
    "Qualified leads with consent",
    "Employees or internal audience",
    "Other opted-in audience",
  ],
  personalizationMode: ["None", "First-name token", "Segment-level wording"],
  tone: [
    "Clear and natural",
    "Warm and friendly",
    "Professional",
    "Casual",
    "Urgent but calm",
    "Premium",
    "Playful",
  ],
  length: ["Very short", "Platform appropriate", "Detailed"],
  emojiUse: ["None", "Minimal", "Moderate"],
  optOutMode: [
    "Auto",
    "Always include",
    "Custom wording",
    "Omit only when appropriate",
  ],
  sensitiveCategory: [
    "None",
    "Health or medical",
    "Financial or investment",
    "Legal or tax",
    "Employment or recruitment",
    "Political or civic",
    "Age-restricted or regulated",
  ],
  variantCount: ["1", "2", "3"],
};

const showWhen = {
  personalizationToken: {
    key: "personalizationMode",
    equals: "First-name token",
  },
  deadlineOrDate: {
    key: "broadcastType",
    equals: ["Promotion or offer", "Event or reminder", "Operational notice"],
  },
  offerTerms: {
    key: "broadcastType",
    equals: "Promotion or offer",
  },
  customOptOutText: {
    key: "optOutMode",
    equals: "Custom wording",
  },
};

const examples = {
  senderName: "Northside Studio",
  broadcastType: "Event or reminder",
  subjectOffer: "New booking slots for August",
  primaryGoal: "Drive purchase or booking",
  targetAudience: "Existing customers who booked a service in the past six months.",
  keyMessage:
    "August booking slots are now open. Weekend appointments are limited and can be reserved through the booking page.",
  primaryCTA: "Reserve your place",
  destinationLink: "https://example.com/booking",
  outputLanguage: "English",
  consentConfirmed: "On",
  audienceRelationship: "Existing customers or subscribers",
  personalizationMode: "First-name token",
  personalizationToken: "[First name]",
  supportingDetails:
    "Appointments are available from August 5. Deposits are refundable until 48 hours before the booking.",
  tone: "Warm and friendly",
  length: "Platform appropriate",
  emojiUse: "Minimal",
  deadlineOrDate: "15 August at 18:00, Europe/Kyiv",
  offerTerms: "Valid for opted-in customers only; subject to available appointment times.",
  optOutMode: "Custom wording",
  customOptOutText: "Reply STOP to stop receiving these updates.",
  sensitiveCategory: "None",
  variantCount: "2",
  additionalRequirements:
    "Avoid fake scarcity and do not mention discounts unless supplied.",
};

const fieldRows = `
senderName|Sender or business name|essentials|text|yes|120|Northside Studio|Name recipients should immediately recognize as the sender.|WhatsApp broadcasts should clearly identify the person, organization, or business contacting the recipient.
broadcastType|Broadcast type|essentials|select|no|40|Select a message type|Choose the situation that best matches this broadcast.|Different WhatsApp broadcasts require different structures, levels of urgency, and information.
subjectOffer|What is this about?|essentials|text|yes|180|New booking slots for August|Name the announcement, offer, event, update, or topic.|It establishes the central subject around which the entire message is written.
primaryGoal|Primary goal|essentials|select|yes|40|Select the desired result|Choose the single most important action or outcome.|The goal determines the message emphasis and primary CTA.
targetAudience|Target audience|essentials|textarea|yes|500|Existing customers who booked a service in the past six months|Describe who will receive the broadcast and what matters to them.|Audience context materially affects vocabulary, relevance, assumed knowledge, and positioning.
keyMessage|Key message and facts|essentials|textarea|yes|1200|Explain the main news, value, action, and confirmed details recipients need.|Include only information that is accurate and approved for use.|The model must receive the factual substance of the broadcast rather than inventing it.
primaryCTA|Call to action|essentials|text|no|180|Reply BOOK, reserve your place, or view the details|Leave as Auto to generate one action that matches the goal.|It lets the user specify an exact action while retaining a low-effort automatic option.
destinationLink|Destination link|essentials|url|no|500|https://example.com/booking|Add the exact page recipients should open, when relevant.|The model must never fabricate a booking, product, event, or information link.
outputLanguage|Output language|essentials|text|no|60|English|Enter any language or regional language variant.|It supports any required language without an oversized language selector.
consentConfirmed|Recipient consent confirmed|essentials|toggle|yes|5|Select consent status|Confirm this audience has valid permission to receive the WhatsApp communication.|The template should not generate unsolicited broadcast marketing without a positive consent confirmation.
audienceRelationship|Audience relationship|audience_personalization|select|no|40|Select the audience relationship|Clarifies what relationship may be referenced without inventing familiarity.|The wording should reflect the actual recipient relationship without pretending a closer connection exists.
personalizationMode|Personalization|audience_personalization|select|no|32|Select personalization level|Use only supplied tokens or broad segment context.|It controls useful personalization while preventing fabricated individual details.
personalizationToken|First-name token|audience_personalization|text|no|60|[First name]|Enter the exact merge token supported by your sending system.|Different WhatsApp tools use different merge-token formats that cannot be safely inferred.
supportingDetails|Supporting details|message_style_timing|textarea|no|1200|Add confirmed prices, locations, instructions, availability, or practical details.|Include useful secondary information that does not belong in the main message field.|It accommodates important facts without expanding the required Essentials form.
tone|Tone|message_style_timing|select|no|32|Select a tone|Choose how the sender should sound.|Tone materially affects direct-message trust and brand consistency.
length|Message length|message_style_timing|select|no|24|Select a length|Controls detail while keeping the broadcast mobile-friendly.|Different announcements require different amounts of explanation.
emojiUse|Emoji use|message_style_timing|select|no|16|Select emoji use|Controls whether emojis are omitted or used sparingly.|Emoji expectations vary significantly between brands and audience types.
deadlineOrDate|Date or deadline|message_style_timing|text|no|120|15 August at 18:00, Europe/Kyiv|Include the date, time, timezone, deadline, or affected period.|Time-sensitive information must come from the user and must not be inferred or fabricated.
offerTerms|Offer terms|compliance_output|textarea|no|1000|Eligibility, exclusions, valid dates, stock limits, minimum spend, or other terms|Provide the conditions needed to describe the offer accurately.|Promotional wording can become misleading when important limitations are omitted.
optOutMode|Opt-out wording|compliance_output|select|no|32|Select opt-out behavior|Auto includes opt-out wording when the message context calls for it.|Promotional and recurring broadcasts may need a clear, practical way to stop future messages.
customOptOutText|Custom opt-out text|compliance_output|text|no|200|Reply STOP to stop receiving these updates.|Enter approved wording supported by your unsubscribe process.|The opt-out instruction must match the sender's actual process.
sensitiveCategory|Sensitive category|compliance_output|select|no|40|Select only when relevant|Applies additional caution to regulated or high-stakes claims.|Certain subject areas require more cautious wording and stronger claim controls.
variantCount|Number of variants|compliance_output|select|no|1|Select output quantity|Generate one focused message or a small set of distinct options.|It provides useful choice without producing an excessive number of near-duplicate messages.
additionalRequirements|Additional requirements|compliance_output|textarea|no|2000|Add required wording, restrictions, brand preferences, or details to avoid.|Use this for important instructions not covered elsewhere.|It provides one controlled place for exceptional requirements without duplicating miscellaneous fields.
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
  if (sourceType === "url") return { type: "text", format: "url" };
  if (sourceType === "toggle") return { type: "select" };
  return { type: sourceType };
}

function helpAvoidFor(field) {
  if (field.key === "consentConfirmed") {
    return "Avoid generating messages for audiences without explicit WhatsApp permission or unclear consent status.";
  }
  if (field.key === "destinationLink") {
    return "Avoid invented, shortened, rewritten, tracking-modified, or unsupported links.";
  }
  if (field.key === "personalizationToken") {
    return "Avoid fake merge fields, unsupported tokens, or personalization based on private behavior that was not supplied.";
  }
  if (field.key === "deadlineOrDate") {
    return "Avoid invented deadlines, vague relative timing, missing time zones, or fake urgency.";
  }
  if (field.key === "offerTerms") {
    return "Avoid invented discounts, stock limits, eligibility, expiry dates, bonuses, prices, or scarcity.";
  }
  if (field.key === "customOptOutText") {
    return "Avoid unsubscribe instructions that the sender's real process cannot honor.";
  }
  if (field.key === "sensitiveCategory") {
    return "Avoid unsupported medical, financial, legal, employment, political, or regulated-product claims.";
  }
  if (field.key === "keyMessage") {
    return "Avoid assumptions, fake urgency, invented prices, fabricated results, unsupported links, or vague filler.";
  }
  if (field.required) {
    return "Avoid vague placeholders, unsupported claims, multiple competing topics, or changing the broadcast into a different campaign.";
  }
  return "Avoid guessed facts, fake urgency, fake scarcity, hidden promotion, fabricated personalization, extra CTAs, or sensitive private data.";
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
        ? `Provide the ${label.toLowerCase()} for this WhatsApp broadcast.`
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
  if (sourceType === "textarea" || field.maxLength > 500) {
    field.fullWidth = true;
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
  slug: "whatsapp-broadcast",
  title: "WhatsApp Broadcast",
  fieldCount: variables.length,
  requiredKeys: variables
    .filter((variable) => variable.required)
    .map((variable) => variable.key),
  groups,
  variables,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(schema, null, 2)}\n`);
console.log(`Wrote ${path.relative(root, outPath)} with ${variables.length} fields.`);
