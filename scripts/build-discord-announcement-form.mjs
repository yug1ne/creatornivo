/**
 * Builds the Discord Announcement form schema from the approved 23-field
 * specification. It verifies that every prompt variable has exactly one form
 * field before writing the form JSON.
 *
 * Usage: node scripts/build-discord-announcement-form.mjs
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
  "discord-announcement.txt",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "discord-announcement-variables.json",
);

const groups = [
  {
    id: "essentials",
    title: "Essentials",
    description:
      "Announcement subject, type, goal, audience, facts, language, timing, action, destination, and community context.",
    defaultOpen: true,
  },
  {
    id: "message_delivery",
    title: "Message & Delivery",
    description:
      "Discord publishing mode, tone, target length, mention behavior, and channel-specific context.",
    defaultOpen: false,
  },
  {
    id: "brand_formatting",
    title: "Brand & Formatting",
    description:
      "Community voice, emoji level, Discord formatting style, and optional short-version output.",
    defaultOpen: false,
  },
  {
    id: "accuracy_restrictions",
    title: "Accuracy & Restrictions",
    description:
      "Verified claims, disclosures, privacy restrictions, factual boundaries, and uncommon requirements.",
    defaultOpen: false,
  },
];

const defaultValues = {
  announcementType: "General update",
  primaryGoal: "Inform members",
  outputLanguage: "English",
  publishingMode: "Auto",
  tone: "Clear and community-friendly",
  messageLength: "Auto",
  mentionPreference: "Auto recommendation",
  emojiLevel: "Minimal",
  formattingStyle: "Structured and scannable",
  includeShortVersion: "Yes",
};

const options = {
  announcementType: [
    "General update",
    "Event",
    "Product or feature release",
    "Maintenance or outage",
    "Policy or rule change",
    "Community milestone",
    "Promotion or offer",
    "Recruitment or opportunity",
    "Correction or clarification",
    "Emergency or safety notice",
  ],
  primaryGoal: [
    "Inform members",
    "Drive a specific action",
    "Increase event attendance",
    "Explain an important change",
    "Clarify or restore trust",
    "Celebrate with the community",
  ],
  publishingMode: [
    "Auto",
    "Regular server message",
    "Announcement channel (crosspost)",
    "Bot or webhook embed",
  ],
  tone: [
    "Clear and community-friendly",
    "Professional",
    "Casual",
    "Excited",
    "Calm and reassuring",
    "Urgent and direct",
    "Celebratory",
    "Technical",
  ],
  messageLength: [
    "Auto",
    "Short",
    "Standard",
    "Detailed",
    "Maximum safe single message",
  ],
  mentionPreference: [
    "Auto recommendation",
    "No mention",
    "Relevant role mention",
    "Use supplied mention",
    "@here",
    "@everyone",
  ],
  emojiLevel: ["None", "Minimal", "Moderate", "Expressive"],
  formattingStyle: [
    "Structured and scannable",
    "Plain and concise",
    "Conversational",
    "Technical changelog",
  ],
  includeShortVersion: ["Yes", "No"],
};

const examples = {
  announcementSubject: "Scheduled maintenance for the creator dashboard",
  announcementType: "Maintenance or outage",
  primaryGoal: "Inform members",
  targetAudience: "All active Creatornivo community members",
  keyDetails:
    "Maintenance runs July 18, 2026 from 02:00 to 04:00 UTC. Generation and library access may be unavailable during that window.",
  outputLanguage: "English",
  serverContext: "SaaS product community for creators using AI content workflows.",
  dateTimeDetails: "July 18, 2026, 02:00-04:00 UTC",
  primaryLink: "https://www.creatornivo.com/status",
  desiredAction: "Check the status page before reporting duplicate issues.",
  publishingMode: "Regular server message",
  tone: "Calm and reassuring",
  messageLength: "Standard",
  mentionPreference: "No mention",
  channelContext: "#announcements, read-only update channel",
  brandVoice: "Clear, practical, transparent, and support-focused.",
  emojiLevel: "Minimal",
  formattingStyle: "Structured and scannable",
  includeShortVersion: "Yes",
  verifiedClaims:
    "Maintenance window confirmed by the engineering team. No customer data changes are planned.",
  disclosureText: "Staff announcement from the Creatornivo team.",
  restrictions:
    "Do not imply data loss, security impact, or guaranteed completion time.",
  additionalContext:
    "Keep the message easy to scan on mobile and avoid fake urgency.",
};

const fieldRows = `
announcementSubject|Announcement subject|essentials|text|yes|160|New feature release, scheduled maintenance, community event...|State the main subject in one clear phrase.|It establishes the central topic around which the announcement is written.
announcementType|Announcement type|essentials|select|yes|40|Select an announcement type|Helps organize the message around the correct Discord use case.|Different announcement types require different priorities, details, and levels of urgency.
primaryGoal|Primary goal|essentials|select|yes|32|Choose the main outcome|Select the single most important result the announcement should achieve.|It determines what information receives the strongest emphasis.
targetAudience|Target audience|essentials|text|yes|200|All members, new users, moderators, paid members, developers...|Describe who should read and act on the announcement.|The model cannot safely infer which server members the message is intended for.
keyDetails|Essential details|essentials|textarea|yes|1500|Add the confirmed information members need to know.|Include the update, impact, dates, requirements, benefits, or changes.|It supplies the factual content that cannot be invented or inferred.
outputLanguage|Output language|essentials|text|yes|80|English, Spanish, Ukrainian, German...|The complete generated package will use this language.|Discord communities may publish in any language, so the correct language cannot always be inferred.
serverContext|Server or community context|essentials|text|no|200|Gaming clan, SaaS community, creator server, customer support...|Briefly describe the community so the message sounds appropriate.|Community context materially affects vocabulary, assumed knowledge, and formality.
dateTimeDetails|Date, time, and timezone|essentials|text|no|300|July 18, 2026 at 19:00 UTC, maintenance from 02:00-04:00...|Include exact scheduling details and a timezone when relevant.|Events, maintenance, releases, and deadlines require exact user-supplied timing.
primaryLink|Primary link|essentials|url|no|500|https://example.com/event|Add the main destination only; the generator will not invent links.|The correct destination URL must come directly from the user.
desiredAction|Desired member action|essentials|text|no|200|Register, read the new rules, update the app, join the event...|Leave blank when the announcement is purely informational.|It defines the CTA without forcing one when no action is required.
publishingMode|Publishing mode|message_delivery|select|no|40|Select how the announcement will be posted|Choose a regular message, crosspost, or bot-ready embed.|Standard messages, crossposts, and embeds require different structures and mention handling.
tone|Tone|message_delivery|select|no|40|Select a tone|Choose the overall delivery style without changing the underlying facts.|Discord server cultures vary substantially in tone and level of formality.
messageLength|Message length|message_delivery|select|no|32|Select a target length|Auto chooses the shortest length that communicates the full update.|A brief event reminder and a detailed policy change require different content depth.
mentionPreference|Mention preference|message_delivery|select|no|40|Choose how mentions should be handled|The generator will never invent a role or user mention.|Discord mentions affect notifications and must be selected deliberately.
channelContext|Channel context|message_delivery|text|no|160|#announcements, #events, #status-updates, read-only channel...|Describe where the message will appear or how the channel is used.|Channel context helps prevent redundant wording and improves placement guidance.
brandVoice|Brand or community voice|brand_formatting|textarea|no|800|Friendly and direct, developer-focused, playful but not childish...|Add voice characteristics or a short style example.|It lets established communities preserve a recognizable communication style.
emojiLevel|Emoji use|brand_formatting|select|no|16|Select an emoji level|Controls visual emphasis without changing the message structure.|Emoji expectations differ significantly between professional and informal servers.
formattingStyle|Formatting style|brand_formatting|select|no|32|Select a Discord formatting style|Controls paragraph, heading, and bullet use.|The same information may need a conversational post or a structured operational update.
includeShortVersion|Include short version|brand_formatting|select|no|5|Choose whether to include a short version|Adds a compact alternative for reminders or secondary channels.|A reusable reminder version is particularly useful for Discord announcements.
verifiedClaims|Verified facts or proof|accuracy_restrictions|textarea|no|1200|Confirmed figures, approved quotations, release status, validated results...|Add exact claims that are approved for publication.|It separates approved evidence from unsupported promotional assumptions.
disclosureText|Required disclosure|accuracy_restrictions|textarea|no|500|Sponsored event, affiliate relationship, staff affiliation, contest terms...|Include any relationship or commercial context members should know.|Community promotions and partnerships may require transparent affiliation disclosure.
restrictions|Restrictions and must-avoid items|accuracy_restrictions|textarea|no|1000|Do not mention pricing, avoid specific wording, protect member identities...|List prohibited claims, sensitive details, or mandatory limitations.|It consolidates factual, privacy, legal, and brand restrictions into one field.
additionalContext|Additional context|accuracy_restrictions|textarea|no|2000|Add any relevant information not covered above.|Use only for context that materially affects the announcement.|It provides one controlled place for uncommon requirements without expanding the main form.
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
  if (field.key === "primaryLink") {
    return "Avoid invented, shortened, private, misleading, or unsupported links.";
  }
  if (field.key === "mentionPreference") {
    return "Avoid unsupported mass mentions, fake role names, invented user IDs, repeated pings, or engagement bait.";
  }
  if (field.key === "dateTimeDetails") {
    return "Avoid vague relative timing without a date, missing time zones, guessed deadlines, or unverified Discord timestamps.";
  }
  if (field.key === "verifiedClaims") {
    return "Avoid unsupported statistics, quotes, reviews, proof, member counts, results, approvals, or partnerships.";
  }
  if (field.key === "disclosureText") {
    return "Avoid hiding sponsorships, affiliate relationships, staff affiliation, paid promotions, contest terms, or commercial context.";
  }
  if (field.key === "restrictions") {
    return "Avoid burying privacy, legal, factual, moderation, or brand limits in another field.";
  }
  if (field.key === "keyDetails") {
    return "Avoid assumptions, fake urgency, invented dates, unsupported features, guessed causes, fake links, or vague filler.";
  }
  if (field.required) {
    return "Avoid vague placeholders, unsupported claims, multiple competing announcements, or changing the topic into a different update.";
  }
  return "Avoid guessed facts, fake urgency, fake scarcity, unsupported social proof, private data, repeated CTAs, or unnecessary mass mentions.";
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
        ? `Provide the ${label.toLowerCase()} for this Discord announcement.`
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
  slug: "discord-announcement",
  title: "Discord Announcement",
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
