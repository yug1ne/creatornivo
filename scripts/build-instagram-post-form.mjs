/**
 * Builds Instagram Post form schema from the UX brief (23 fields).
 * Does NOT modify the prompt text — only form metadata for UX.
 *
 * Usage: node scripts/build-instagram-post-form.mjs
 *
 * Requires: agent-tools/instagram-post-schema-parsed.json
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
  "instagram-post.txt",
);
const parsedPath = path.join(
  root,
  "agent-tools",
  "instagram-post-schema-parsed.json",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "instagram-post-variables.json",
);

function extractVars(prompt) {
  const set = new Set();
  const re = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  let m;
  while ((m = re.exec(prompt))) set.add(m[1]);
  return [...set];
}

const GROUP_MAP = {
  Essentials: {
    id: "essentials",
    title: "Essentials",
    description:
      "Topic, goal, audience, message, language, mode, length, and CTA.",
    defaultOpen: true,
  },
  "Message & Evidence": {
    id: "message",
    title: "Message & Evidence",
    description:
      "Supporting points, offer terms, proof, disclosures, and restrictions.",
    defaultOpen: false,
  },
  "Brand & Style": {
    id: "brand",
    title: "Brand & Style",
    description: "Voice, tone, emoji use, and hashtag strategy.",
    defaultOpen: false,
  },
  "Visual & Output": {
    id: "visual",
    title: "Visual & Output",
    description: "Visual format, asset notes, alt text, and variants.",
    defaultOpen: false,
  },
};

const SHOW_WHEN = {
  offerDetails: {
    anyOf: [
      { key: "contentMode", equals: "Offer or promotion" },
      { key: "primaryGoal", equals: "Promote an offer" },
    ],
  },
  providedHashtags: {
    key: "hashtagPreference",
    equals: "Provided only",
  },
};

const EXTRA_HELP = {
  postTopic: {
    example: "Honest Early Access product update for content teams",
    avoid: "Several unrelated topics in one feed post.",
  },
  primaryGoal: {
    example: "Educate",
    avoid: "Stacking sell + follow + share as equal primary goals.",
  },
  keyMessage: {
    example: "One clear takeaway the reader should remember",
    avoid: "Competing messages or unstated claims.",
  },
  offerDetails: {
    example: "Confirmed price, dates, and terms only",
    avoid: "Invented discounts, deadlines, or scarcity.",
  },
  hashtagPreference: {
    example: "Niche mix",
    avoid: "Unrelated trending tags or stuffing.",
  },
  numberOfVariants: {
    example: "1",
    avoid: "More than three variants — keep noise low.",
  },
};

function mapType(briefType) {
  if (briefType === "textarea") return "textarea";
  if (briefType === "select") return "select";
  if (briefType === "number") return "number";
  return "text";
}

function normalizeDefault(field) {
  if (!field.default || field.default === "Blank") return undefined;
  return field.default;
}

function buildField(raw) {
  const groupMeta = GROUP_MAP[raw.group] || {
    id: "other",
    title: raw.group || "Other",
    description: "",
    defaultOpen: false,
  };

  const type = mapType(raw.type);
  const options = raw.options?.length ? [...raw.options] : undefined;
  const defaultValue = normalizeDefault(raw);
  const extra = EXTRA_HELP[raw.key] || {};

  const help = {
    what: (raw.label || raw.key) + ".",
    why: raw.why || raw.helper || `Used as ${raw.key} in the Instagram brief.`,
    example:
      extra.example ||
      (defaultValue ? defaultValue : raw.placeholder) ||
      "A short factual value you can verify.",
    avoid:
      extra.avoid ||
      "Invented proof, fake urgency, engagement bait, or private data.",
  };

  const field = {
    key: raw.key,
    label: raw.label || raw.key,
    placeholder: raw.placeholder || "Optional — leave blank if unknown",
    required: Boolean(raw.required),
    type,
    group: groupMeta.id,
    groupTitle: groupMeta.title,
    hint: raw.helper || help.what,
    help,
    fullWidth: type === "textarea",
  };

  if (options?.length) field.options = options;
  if (defaultValue) field.defaultValue = defaultValue;
  if (SHOW_WHEN[raw.key]) field.showWhen = SHOW_WHEN[raw.key];

  return field;
}

function main() {
  if (!fs.existsSync(parsedPath)) {
    console.error(
      `Missing ${parsedPath}. Run: node scripts/parse-instagram-post-brief.mjs`,
    );
    process.exit(1);
  }

  const prompt = fs.readFileSync(promptPath, "utf8");
  const promptKeys = new Set(extractVars(prompt));
  const rawFields = JSON.parse(fs.readFileSync(parsedPath, "utf8"));

  if (rawFields.length !== 23) {
    console.warn(`Expected 23 fields, got ${rawFields.length}`);
  }

  const fields = rawFields.map(buildField);

  for (const f of fields) {
    if (!promptKeys.has(f.key)) {
      console.warn(`Schema key missing from prompt: ${f.key}`);
    }
  }
  for (const k of promptKeys) {
    if (!fields.some((f) => f.key === k)) {
      console.warn(`Prompt key missing from schema: ${k}`);
    }
  }

  const used = new Set(fields.map((f) => f.group));
  const groups = Object.values(GROUP_MAP).filter((g) => used.has(g.id));

  const payload = {
    slug: "instagram-post",
    title: "Instagram Post",
    version: 2,
    generatedAt: new Date().toISOString(),
    fieldCount: fields.length,
    requiredKeys: fields.filter((f) => f.required).map((f) => f.key),
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
