/**
 * Builds Newsletter form schema from the prompt.
 * Does NOT modify the prompt text — only form metadata for UX.
 *
 * Usage: node scripts/build-newsletter-form.mjs
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
  "newsletter.txt",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "newsletter-variables.json",
);

function humanize(key) {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

function extractVars(prompt) {
  const set = new Set();
  const re = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  let m;
  while ((m = re.exec(prompt))) set.add(m[1]);
  return [...set];
}

const NEWSLETTER_TYPES = [
  "Weekly or monthly digest",
  "Educational newsletter",
  "Industry insights newsletter",
  "Product or company update",
  "Founder newsletter",
  "Curated content newsletter",
  "Community newsletter",
  "Promotional newsletter",
  "Editorial newsletter",
  "Event newsletter",
  "Customer newsletter",
  "Personal creator newsletter",
];

const LENGTH_OPTIONS = [
  "short (about 200–350 words)",
  "medium (about 400–700 words)",
  "long (about 800–1200 words)",
];

const REQUIRED = new Set([
  "topic",
  "goal",
  "target_audience",
  "newsletter_type",
  "brand_name",
  "tone",
  "language",
]);

/** Field order and grouping for the generate form. */
const FIELD_META = {
  topic: {
    group: "essentials",
    groupTitle: "Essentials",
    type: "text",
    placeholder: "How small teams ship useful content without fake hype",
    hint: "One central theme for this issue.",
    what: "Newsletter topic.",
    why: "Keeps the issue focused on one theme instead of several disconnected ideas.",
    example: "Why we publish Early Access status honestly",
    avoid: "Several unrelated topics or a vague “this week’s updates” without a thread.",
  },
  goal: {
    group: "essentials",
    groupTitle: "Essentials",
    type: "text",
    placeholder: "educate / update / invite reply / drive one clear action",
    hint: "One primary goal for this issue.",
    what: "Main goal of the newsletter.",
    why: "Shapes structure, CTA, and how promotional the issue should feel.",
    example: "Help readers write one clearer product update email",
    avoid: "Stacking sell + event + survey + reply in one goal.",
  },
  target_audience: {
    group: "essentials",
    groupTitle: "Essentials",
    type: "text",
    placeholder: "founders and marketers who publish product content",
    hint: "Who receives this newsletter.",
    what: "Target audience.",
    why: "Language, depth, and examples should match their knowledge and goals.",
    example: "Early-stage B2B founders and content leads",
    avoid: "Assuming every reader is a buyer, expert, or insider.",
  },
  newsletter_type: {
    group: "essentials",
    groupTitle: "Essentials",
    type: "select",
    options: NEWSLETTER_TYPES,
    placeholder: "Educational newsletter",
    hint: "Pick the type that fits the goal — structure adapts to it.",
    what: "Newsletter type.",
    why: "Digest, founder note, and promotional issue need different structures.",
    example: "Founder newsletter",
    avoid: "Forcing every issue into the same template regardless of content.",
  },
  brand_name: {
    group: "essentials",
    groupTitle: "Essentials",
    type: "text",
    placeholder: "Creatornivo",
    hint: "Brand or sender name for sign-off and voice.",
    what: "Brand or sender name.",
    why: "Used in sign-off and so the voice matches who is writing.",
    example: "Creatornivo",
    avoid: "Invented company names or multiple conflicting sender identities.",
  },
  tone: {
    group: "essentials",
    groupTitle: "Essentials",
    type: "text",
    placeholder: "clear, useful, conversational, credible",
    hint: "How the newsletter should sound.",
    what: "Tone of voice.",
    why: "Keeps the issue warm and professional without corporate fluff or hype.",
    example: "direct, human, no hype",
    avoid: "Empty motivation, aggressive sales tone, or generic AI polish.",
  },
  language: {
    group: "essentials",
    groupTitle: "Essentials",
    type: "text",
    placeholder: "English",
    hint: "Language of the full package (subjects + body).",
    what: "Publishing language.",
    why: "All subject lines, preview text, and body should match this language.",
    example: "English",
    avoid: "Mixing languages without saying so.",
  },
  industry: {
    group: "content",
    groupTitle: "Content",
    type: "text",
    placeholder: "Content tools / B2B SaaS",
    hint: "Niche context for examples and framing.",
    what: "Industry or niche.",
    why: "Helps examples and wording feel relevant to the reader’s world.",
    example: "Marketing software for small teams",
    avoid: "Jargon without explanation when the audience is mixed.",
  },
  main_message: {
    group: "content",
    groupTitle: "Content",
    type: "textarea",
    fullWidth: true,
    placeholder: "One clear point the reader should remember after reading",
    hint: "Central idea — not a list of unrelated updates.",
    what: "Main message.",
    why: "Gives the body a single spine from opening to CTA.",
    example: "Honest Early Access messaging builds more trust than fake social proof.",
    avoid: "Several competing messages or unstated claims.",
  },
  key_points: {
    group: "content",
    groupTitle: "Content",
    type: "textarea",
    fullWidth: true,
    placeholder:
      "Point 1…\nPoint 2…\nPoint 3…\n(only facts you can verify)",
    hint: "Facts and takeaways to include — no invented stats or stories.",
    what: "Key points to include.",
    why: "Supplies verified content so the model does not invent details.",
    example:
      "Free: 5 generations/day UTC. Pro: 100/month. We never invent testimonials.",
    avoid: "Unverified stats, fake testimonials, or product features that are not live.",
  },
  length: {
    group: "content",
    groupTitle: "Content",
    type: "select",
    options: LENGTH_OPTIONS,
    placeholder: "medium (about 400–700 words)",
    hint: "Editorial length — not a hard platform limit.",
    what: "Desired length.",
    why: "Controls depth without padding a simple idea.",
    example: "short (about 200–350 words)",
    avoid: "Making a simple update artificially long.",
  },
  additional_context: {
    group: "content",
    groupTitle: "Content",
    type: "textarea",
    fullWidth: true,
    placeholder:
      "Restrictions, must-include links, things to avoid, brand rules…",
    hint: "Anything else the model must respect.",
    what: "Additional context, requirements, or restrictions.",
    why: "Captures constraints so the draft stays on-policy and accurate.",
    example: "Do not invent customer counts. No fake urgency. No hashtags.",
    avoid: "Leaving critical restrictions only in your head.",
  },
  call_to_action: {
    group: "cta",
    groupTitle: "CTA & destination",
    type: "text",
    placeholder: "Try the Newsletter template / Reply with your biggest blocker",
    hint: "One primary action — not several competing CTAs.",
    what: "Primary call to action.",
    why: "Ends the issue with one clear, relevant next step.",
    example: "Open the Newsletter template in Creatornivo",
    avoid: "Stacking download + book a call + share + survey in one section.",
  },
  link: {
    group: "cta",
    groupTitle: "CTA & destination",
    type: "text",
    placeholder: "https://www.creatornivo.com/… or leave blank for placeholder",
    hint: "Real URL only — missing links become placeholders.",
    what: "Link or destination.",
    why: "Supports the CTA with a verified destination.",
    example: "https://www.creatornivo.com",
    avoid: "Fake URLs, untested links, or several competing destinations.",
  },
};

const GROUPS = [
  {
    id: "essentials",
    title: "Essentials",
    description: "Minimum inputs for a useful newsletter package.",
    defaultOpen: true,
  },
  {
    id: "content",
    title: "Content",
    description: "Message, points, length, and constraints.",
    defaultOpen: true,
  },
  {
    id: "cta",
    title: "CTA & destination",
    description: "One clear action and verified link.",
    defaultOpen: true,
  },
];

const FIELD_ORDER = [
  "topic",
  "goal",
  "target_audience",
  "newsletter_type",
  "brand_name",
  "tone",
  "language",
  "industry",
  "main_message",
  "key_points",
  "length",
  "additional_context",
  "call_to_action",
  "link",
];

function defaultHelp(key, label) {
  return {
    what: `${label} for this newsletter issue.`,
    why: `When provided, the model uses this instead of inventing details. Empty fields stay unset ([${key}]).`,
    example: `A short, factual value for ${label.toLowerCase()}.`,
    avoid: `Invented stats, fake urgency, unsupported claims, or private details for ${label.toLowerCase()}.`,
  };
}

function buildField(key) {
  const meta = FIELD_META[key] || {};
  const label = meta.label || humanize(key);
  const type = meta.type || "text";
  const helpBase = defaultHelp(key, label);
  const help = {
    what: meta.what || helpBase.what,
    why: meta.why || helpBase.why,
    example: meta.example || meta.placeholder || helpBase.example,
    avoid: meta.avoid || helpBase.avoid,
  };

  return {
    key,
    label,
    placeholder: meta.placeholder || "Optional — leave blank if unknown",
    required: REQUIRED.has(key),
    type,
    group: meta.group || "content",
    groupTitle: meta.groupTitle || "Content",
    hint: meta.hint || help.what,
    help,
    options: meta.options,
    fullWidth: Boolean(meta.fullWidth || type === "textarea"),
  };
}

function main() {
  const prompt = fs.readFileSync(promptPath, "utf8");
  const keys = extractVars(prompt);

  if (keys.length === 0) {
    console.error("No variables found in prompt");
    process.exit(1);
  }

  const keySet = new Set(keys);
  const fields = [];

  for (const key of FIELD_ORDER) {
    if (!keySet.has(key)) continue;
    fields.push(buildField(key));
  }

  for (const key of keys.sort()) {
    if (fields.some((f) => f.key === key)) continue;
    fields.push(buildField(key));
  }

  const usedGroups = new Set(fields.map((f) => f.group));
  const groups = GROUPS.filter((g) => usedGroups.has(g.id));

  const payload = {
    slug: "newsletter",
    title: "Newsletter",
    version: 1,
    generatedAt: new Date().toISOString(),
    fieldCount: fields.length,
    requiredKeys: [...REQUIRED].filter((k) => keySet.has(k)),
    groups,
    variables: fields,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(
    `Wrote ${outPath} — ${fields.length} fields, ${groups.length} groups, required: ${payload.requiredKeys.join(", ")}`,
  );
}

main();
