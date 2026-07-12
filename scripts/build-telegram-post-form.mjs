/**
 * Builds the Telegram Post form schema from the approved 22-field specification.
 * Does NOT modify the prompt text. It verifies that every prompt variable has
 * exactly one form field before writing the form JSON.
 *
 * Usage: node scripts/build-telegram-post-form.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const promptPath = path.join(root, "prisma", "template-prompts", "telegram-post.txt");
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "telegram-post-variables.json",
);

const groups = [
  {
    id: "essentials",
    title: "Essentials",
    description:
      "Minimum topic, goal, audience, message, factual detail, format, language, length, and CTA context for an accurate Telegram post.",
    defaultOpen: true,
  },
  {
    id: "message_voice",
    title: "Message & Voice",
    description:
      "Tone, channel voice, emoji level, and Telegram-compatible formatting preferences.",
    defaultOpen: false,
  },
  {
    id: "links_publishing",
    title: "Links & Publishing",
    description:
      "Destination URL, button label, timing, and hashtag preferences for Telegram publishing workflows.",
    defaultOpen: false,
  },
  {
    id: "accuracy_output",
    title: "Accuracy & Output",
    description:
      "Evidence, disclosures, restrictions, variant count, and additional constraints.",
    defaultOpen: false,
  },
];

const defaultValues = {
  primaryGoal: "Inform or update",
  postFormat: "Auto",
  outputLanguage: "English",
  lengthPreference: "Auto",
  ctaGoal: "Auto",
  tone: "Clear and natural",
  emojiUse: "Minimal",
  formattingMode: "Auto",
  hashtagPreference: "Auto",
  numberOfVariants: "1",
};

const options = {
  primaryGoal: [
    "Inform or update",
    "Announce news",
    "Educate or explain",
    "Promote an offer",
    "Drive traffic",
    "Build engagement",
    "Invite or organize",
    "Share opinion or story",
    "Recruit or hire",
  ],
  postFormat: ["Auto", "Text post", "Media caption"],
  lengthPreference: ["Auto", "Brief", "Standard", "Detailed", "Maximum safe"],
  ctaGoal: [
    "Auto",
    "No CTA",
    "Open link",
    "Reply or comment",
    "Join channel or group",
    "Register or sign up",
    "Download",
    "Buy or order",
    "Vote or react",
    "Save or share",
  ],
  tone: [
    "Clear and natural",
    "Conversational",
    "Professional",
    "Friendly",
    "Authoritative",
    "Energetic",
    "Calm",
    "Direct",
    "Humorous",
  ],
  emojiUse: ["Auto", "None", "Minimal", "Moderate"],
  formattingMode: [
    "Auto",
    "Plain text",
    "Telegram HTML",
    "MarkdownV2",
    "Manual editor",
  ],
  hashtagPreference: ["Auto", "None", "1–3 relevant", "Use tags from facts"],
  numberOfVariants: ["1", "2", "3"],
};

const showWhen = {
  buttonText: { key: "destinationUrl", isValidUrl: true },
};

const examples = {
  topicOrOffer: "Creatornivo Early Access update",
  primaryGoal: "Inform or update",
  targetAudience:
    "Existing Creatornivo users and creators following product updates.",
  keyMessage:
    "Password reset and sign-out polish are live, and generation limits are clearer.",
  factsAndDetails:
    "Free plan has 5 generations per UTC day. Pro has 100 generations per UTC month. Support email is support@creatornivo.com.",
  postFormat: "Text post",
  outputLanguage: "English",
  channelContext:
    "Product update channel for an early-access AI content workflow product.",
  lengthPreference: "Standard",
  ctaGoal: "Open link",
  tone: "Clear and natural",
  brandVoice: "Practical, transparent, and product-focused.",
  emojiUse: "Minimal",
  formattingMode: "Plain text",
  destinationUrl: "https://www.creatornivo.com/updates",
  buttonText: "Read update",
  timingDetails: "Published after the July 2026 maintenance release.",
  hashtagPreference: "None",
  evidenceAndSources:
    "Use only the supplied release notes and public product limits.",
  disclosuresAndRestrictions:
    "Do not imply customer numbers, ratings, revenue, urgency, or scarcity.",
  numberOfVariants: "1",
  additionalContext: "Keep the post calm and easy to scan on mobile.",
};

const fieldRows = `
topicOrOffer|Topic, Product, or Offer|essentials|text|yes|200|What should the Telegram post be about?|Enter the main topic, announcement, product, event, or offer.|It establishes the central subject of the post.
primaryGoal|Primary Goal|essentials|select|yes|40|Select the main purpose|Choose the single most important outcome for this post.|The goal determines the post structure, emphasis, and CTA.
targetAudience|Target Audience|essentials|textarea|yes|500|Who should read this post, and what matters to them?|Describe the intended readers and any relevant interests or needs.|Audience context materially changes vocabulary, examples, framing, and detail.
keyMessage|Core Message|essentials|textarea|yes|800|What should readers understand or remember?|State the main takeaway in plain language.|It prevents the generated post from drifting away from the intended takeaway.
factsAndDetails|Facts and Required Details|essentials|textarea|yes|1500|Names, dates, prices, conditions, features, or required points|Include only confirmed information that must appear in the post.|It supplies the factual information the model must not infer or fabricate.
postFormat|Post Format|essentials|select|no|30|Choose how the post will be published|Media captions require a much shorter result than standalone posts.|Text posts and media captions require different length handling.
outputLanguage|Output Language|essentials|text|no|60|English, Ukrainian, Spanish, or another language|The model will write the complete output in this language.|Language cannot always be safely inferred from names or source material.
channelContext|Channel Context|essentials|textarea|no|500|What does the channel publish, and what do readers expect?|Add the channel topic, relationship with readers, or publishing context.|The same announcement may require different framing in a news, business, educational, or personal channel.
lengthPreference|Length|essentials|select|no|30|Choose a preferred length|Auto selects a practical length while respecting the selected post format.|Users may need anything from a short update to a detailed channel post.
ctaGoal|Reader Action|essentials|select|no|40|What should readers do next?|Choose one primary action or let the model select it.|It aligns the ending with the intended user action without creating competing CTAs.
tone|Tone|message_voice|select|no|40|Select a tone|Choose the overall communication style.|Tone materially changes wording and audience perception.
brandVoice|Brand Voice|message_voice|textarea|no|800|Describe the usual voice or paste a short style example|Add distinctive voice rules only when the default tone is insufficient.|It helps the result remain consistent with an established channel identity.
emojiUse|Emoji Use|message_voice|select|no|20|Choose an emoji level|Controls whether emojis support scanning or are omitted.|Emoji expectations vary substantially between Telegram channels.
formattingMode|Telegram Formatting|message_voice|select|no|30|Choose a publishing format|Select plain copy, manual formatting, or bot-compatible markup.|Telegram HTML, MarkdownV2, and manually formatted posts require different output syntax.
destinationUrl|Destination URL|links_publishing|url|no|2000|https://www.creatornivo.com/updates|Add the exact page readers should open.|The model must not invent or modify destination links.
buttonText|Button Text|links_publishing|text|no|80|Read More, Join Now, View Details|Leave blank to generate a concise label automatically.|It allows control over the optional Telegram inline-button label.
timingDetails|Dates and Timing|links_publishing|textarea|no|600|Launch date, deadline, event time, timezone, or availability|Include confirmed time-sensitive information that affects the message.|Announcements and events often depend on exact dates, deadlines, and timezones.
hashtagPreference|Hashtags|links_publishing|select|no|30|Choose a hashtag approach|Telegram posts usually need few or no hashtags.|Some channels use hashtags for navigation, while others avoid them entirely.
evidenceAndSources|Evidence and Sources|accuracy_output|textarea|no|4000|Paste approved statistics, quotations, source notes, or URLs|Supply evidence for claims that should not rely only on general wording.|It allows factual claims to be grounded without asking users for a separate research workflow.
disclosuresAndRestrictions|Disclosures and Restrictions|accuracy_output|textarea|no|1500|Sponsorship disclosure, prohibited claims, privacy rules, or topics to avoid|Add mandatory disclosures and anything the post must not say.|Commercial, regulated, or sensitive posts may require explicit boundaries.
numberOfVariants|Number of Variants|accuracy_output|select|no|10|Choose the number of versions|Additional versions use different angles without changing the supplied facts.|Some users need alternatives, but excessive variations would make a compact template inefficient.
additionalContext|Additional Context|accuracy_output|textarea|no|2000|Add any useful instruction not covered above|Use this only for information that materially affects the result.|It provides one controlled place for uncommon requirements without multiplying form fields.
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
  return { type: sourceType };
}

function helpAvoidFor(field) {
  if (field.key === "destinationUrl") {
    return "Avoid invented, shortened, tracking-modified, or unsupported links.";
  }
  if (field.key === "evidenceAndSources") {
    return "Avoid unsupported statistics, quotes, studies, proof, or claims that the supplied source does not establish.";
  }
  if (field.key === "disclosuresAndRestrictions") {
    return "Avoid hiding commercial relationships, privacy boundaries, regulated-topic limits, or prohibited claims.";
  }
  if (field.key === "factsAndDetails") {
    return "Avoid assumptions, fake dates, invented prices, fabricated results, unsupported links, or vague filler.";
  }
  if (field.required) {
    return "Avoid vague placeholders, multiple competing topics, invented context, or claims the post cannot support.";
  }
  return "Avoid guessed facts, fake urgency, fake scarcity, engagement bait, unsupported social proof, or extra CTAs.";
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
        ? `Provide the ${label.toLowerCase()} for this Telegram post.`
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
  slug: "telegram-post",
  title: "Telegram Post",
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
