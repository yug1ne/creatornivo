/**
 * Builds the Push Notification form schema from the approved 23-field
 * specification. It verifies that every prompt variable has exactly one form
 * field before writing the form JSON.
 *
 * Usage: node scripts/build-push-notification-form.mjs
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
  "push-notification.txt",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "push-notification-variables.json",
);

const groups = [
  {
    id: "essentials",
    title: "Essentials",
    description:
      "Campaign subject, goal, audience, key message, tap destination, notification type, language, urgency, and variant count.",
    defaultOpen: true,
  },
  {
    id: "message_delivery",
    title: "Message & Delivery",
    description:
      "Timing context, expiration, title/body structure, tone, and emoji preference.",
    defaultOpen: false,
  },
  {
    id: "brand_personalization",
    title: "Brand & Personalization",
    description:
      "Sender identity, brand voice, supported personalization tokens, and CTA wording preferences.",
    defaultOpen: false,
  },
  {
    id: "compliance_restrictions",
    title: "Compliance & Restrictions",
    description:
      "Sensitive categories, jurisdiction, required disclosures, claim restrictions, and final requirements.",
    defaultOpen: false,
  },
];

const groupIdsByTitle = Object.fromEntries(
  groups.map((group) => [group.title, group.id]),
);

const showWhen = {
  jurisdiction: { key: "sensitiveCategory", notEquals: "None" },
  requiredDisclosure: { key: "sensitiveCategory", notEquals: "None" },
};

const defaults = {
  primaryGoal: "Inform",
  notificationContext: "Auto",
  outputLanguage: "English",
  urgencyLevel: "Normal",
  variantCount: "3",
  titleMode: "Auto",
  tone: "Clear and natural",
  emojiUse: "Minimal",
  callToActionPreference: "Auto",
  sensitiveCategory: "None",
};

const examples = {
  campaignSubject: "Order update for a confirmed purchase",
  primaryGoal: "Confirm a status",
  targetAudience:
    "Existing customers waiting for an order update inside the mobile app.",
  keyMessage:
    "The order has shipped and tracking is available from the order details screen.",
  tapDestination: "Order details screen",
  notificationContext: "Transactional",
  outputLanguage: "English",
  urgencyLevel: "Normal",
  variantCount: "3",
  timingContext: "Send after shipment is confirmed.",
  expirationContext: "Remove after the order is delivered.",
  titleMode: "Title and body",
  tone: "Clear and natural",
  emojiUse: "Minimal",
  senderName: "Creatornivo",
  brandVoice: "Helpful, concise, and calm.",
  personalizationTokens: "{{first_name}}, {{order_number}}",
  callToActionPreference: "View order",
  sensitiveCategory: "None",
  jurisdiction: "United States",
  requiredDisclosure: "Use the approved eligibility disclosure supplied here.",
  claimsAndRestrictions:
    "Do not mention price, discounts, or guaranteed delivery time.",
  additionalRequirements:
    "Avoid fake urgency and keep each variant understandable when truncated.",
};

const fieldRows = `
campaignSubject|What is the notification about?|Essentials|text|yes|160|Blank|Order update, new feature, expiring offer, appointment reminder|Name the event, update, product, offer, or action behind the notification.|It establishes the central subject the notification must communicate.|
primaryGoal|Primary goal|Essentials|select|yes|32|Inform|Select the main goal|Choose the single most important outcome for this notification.|The goal determines the message angle, urgency, and strength of the call to action.|Inform~Remind~Drive action~Promote an offer~Re-engage users~Confirm a status~Warn about an issue~Announce an update
targetAudience|Target audience|Essentials|textarea|yes|500|Blank|Existing customers who added an item to their cart but did not complete checkout|Describe who will receive the notification and any relevant context.|Audience context affects relevance, wording, assumed knowledge, and privacy risk.|
keyMessage|Key message and facts|Essentials|textarea|yes|1000|Blank|State what happened, what matters, and any verified dates, prices, or conditions|Include only facts that may appear in the notification.|It provides the verified information the notification must communicate without fabrication.|
tapDestination|Tap destination|Essentials|text|yes|300|Blank|Checkout screen, order details, article page, https://www.creatornivo.com/offers/summer|Enter the app screen, deep link, page, or action opened after the user taps.|A push notification should set an accurate expectation for what happens after the tap.|
notificationContext|Notification type|Essentials|select|no|32|Auto|Let Creatornivo decide|Select a type when it materially affects tone or compliance.|Different notification types require different levels of urgency, persuasion, and sender context.|Auto~Transactional~Reminder~Promotional~Product update~Content alert~Service alert~Re-engagement
outputLanguage|Output language|Essentials|text|no|60|English|English, Spanish, German, Ukrainian|Specify the language or locale used in the final notification.|Language affects brevity, tone, grammar, and visual character density.|
urgencyLevel|Urgency level|Essentials|select|no|24|Normal|Select urgency|High or critical urgency will be used only when supported by the supplied facts.|It controls pacing and emphasis while preventing unjustified urgency.|Low~Normal~High~Critical
variantCount|Number of variants|Essentials|number|no|1|3|3|Generate between one and five distinct notification options.|It lets users choose between a single result and a small set of genuinely different angles.|min:1~max:5
timingContext|Timing context|Message & Delivery|text|no|250|Blank|Send 30 minutes before the appointment or after a failed payment|Describe when or after which event the notification should be sent.|Timing can change the relevance, tense, and urgency of the message.|
expirationContext|Expiration or deadline|Message & Delivery|text|no|250|Blank|Valid until 6 PM on July 15, or remove after the event begins|Add a verified deadline or the point when the notification becomes irrelevant.|It prevents outdated notifications and supports accurate deadline wording.|
titleMode|Notification structure|Message & Delivery|select|no|24|Auto|Let Creatornivo decide|Choose whether the output should use a title and body or body-only format.|Some notification environments support a separate title, while others use one compact message.|Auto~Title and body~Body only
tone|Tone|Message & Delivery|select|no|32|Clear and natural|Select a tone|Choose the overall voice without changing the underlying facts.|Tone materially affects how the same short message is perceived.|Clear and natural~Friendly~Professional~Warm~Energetic~Reassuring~Urgent but calm~Playful
emojiUse|Emoji use|Message & Delivery|select|no|16|Minimal|Select emoji use|Emoji should support meaning rather than consume limited notification space.|Emoji use is a recognizable brand and platform preference that cannot always be inferred.|None~Minimal~Moderate
senderName|Sender or brand name|Brand & Personalization|text|no|80|Blank|Northstar, Acme App, River Dental|Add the sender only when users may not recognize the app or message context.|Sender identification can improve clarity, especially for browser or multi-brand notifications.|
brandVoice|Brand voice|Brand & Personalization|textarea|no|700|Blank|Calm, concise, helpful, never overly promotional or playful|Describe distinctive voice preferences not covered by the tone selector.|It preserves meaningful brand distinctions without creating several overlapping style fields.|
personalizationTokens|Personalization tokens|Brand & Personalization|text|no|300|Blank|{{first_name}}, {{order_number}}, {{appointment_time}}|List only tokens supported by your notification system.|The model must preserve valid token syntax and avoid inventing unsupported personalization.|
callToActionPreference|Call-to-action preference|Brand & Personalization|text|no|120|Auto|View order, Continue checkout, Read update, or Auto|Suggest a preferred action phrase or leave Auto for context-based wording.|A specific action preference can materially change the final wording and tap expectation.|
sensitiveCategory|Sensitive or regulated topic|Compliance & Restrictions|select|no|32|None|Select only when relevant|This enables more cautious wording and relevant verification notes.|Sensitive categories may require stricter privacy, claim, disclosure, and jurisdiction handling.|None~Health or medical~Financial~Legal~Employment~Insurance~Political~Children~Gambling~Other regulated topic
jurisdiction|Relevant jurisdiction|Compliance & Restrictions|text|no|120|Blank|United States, California, European Union, United Kingdom|Enter the country or region whose rules may apply.|Regulatory wording can depend on the location in which the notification is used.|
requiredDisclosure|Required disclosure|Compliance & Restrictions|textarea|no|1200|Blank|Provide approved legal, eligibility, risk, or promotional disclosure text|Use only supplied or approved wording; long disclosures may require another channel.|It allows mandatory wording to be considered without asking the model to invent legal language.|
claimsAndRestrictions|Claims and restrictions|Compliance & Restrictions|textarea|no|1200|Blank|Avoid guaranteed results; do not mention price; use the exact approved offer terms|List prohibited claims, required facts, or wording that must not appear.|It prevents unsupported, legally risky, inaccurate, or brand-inconsistent statements.|
additionalRequirements|Additional requirements|Compliance & Restrictions|textarea|no|2000|Blank|Add any important instruction not covered by the fields above|Use this for final requirements only, not general writing best practices.|It provides one controlled place for legitimate requirements that do not fit another field.|
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

function helpAvoidFor(field) {
  if (field.key === "tapDestination") {
    return "Avoid invented screens, broken links, misleading destinations, or tap expectations that the product cannot support.";
  }
  if (field.key === "personalizationTokens") {
    return "Avoid personal data or token names that the notification system cannot reliably insert.";
  }
  if (field.key === "sensitiveCategory" || field.key === "requiredDisclosure") {
    return "Avoid unsupported medical, financial, legal, employment, insurance, political, child-related, gambling, or regulated claims.";
  }
  if (field.key === "claimsAndRestrictions" || field.key === "keyMessage") {
    return "Avoid invented prices, dates, features, availability, results, urgency, user behavior, or claims.";
  }
  if (field.required) {
    return "Avoid vague placeholders, fake urgency, fake personalization, clickbait, or changing the notification into a different subject.";
  }
  return "Avoid guessed facts, private user data, manipulative pressure, unsupported urgency, excessive emojis, or generic marketing filler.";
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
    type,
    requiredRaw,
    maxLengthRaw,
    defaultRaw,
    placeholder,
    hint,
    why,
    rawOptions = "",
  ] = row.split("|");

  const required = requiredRaw === "yes";
  const optionData = parseOptions(rawOptions);
  const maxLength = Number(maxLengthRaw);
  const defaultValue =
    defaultRaw !== "Blank" && defaults[key] ? defaults[key] : undefined;

  const field = {
    key,
    label,
    group: groupIdsByTitle[groupTitle],
    groupTitle,
    type,
    required,
    placeholder,
    hint,
    help: {
      what: required
        ? `Provide the ${label.toLowerCase()} before generating push notification copy.`
        : `Optional context for the ${label.toLowerCase()} field.`,
      why,
      example: `Good example: ${examples[key] ?? placeholder}`,
      avoid: helpAvoidFor({ key, required }),
    },
  };

  if (defaultValue) field.defaultValue = defaultValue;
  if (optionData.options) field.options = optionData.options;
  if (Number.isFinite(optionData.min)) field.min = optionData.min;
  if (Number.isFinite(optionData.max)) field.max = optionData.max;
  if (Number.isFinite(maxLength)) field.maxLength = maxLength;
  if (showWhen[key]) field.showWhen = showWhen[key];
  if (type === "textarea" || maxLength > 500) field.fullWidth = true;

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
  slug: "push-notification",
  title: "Push Notification",
  fieldCount: variables.length,
  requiredKeys: variables
    .filter((variable) => variable.required)
    .map((variable) => variable.key),
  groups,
  variables,
};

if (schema.fieldCount !== 23) {
  throw new Error(`Expected 23 fields, got ${schema.fieldCount}`);
}

if (schema.requiredKeys.length !== 5) {
  throw new Error(`Expected 5 required fields, got ${schema.requiredKeys.length}`);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(schema, null, 2)}\n`);

console.log(
  `Wrote ${path.relative(root, outPath)} with ${variables.length} fields.`,
);
