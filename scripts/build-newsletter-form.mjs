/**
 * Builds Newsletter form schema from the UX brief (30 Standard fields).
 * Does NOT modify the prompt text — only form metadata for UX.
 *
 * Usage: node scripts/build-newsletter-form.mjs
 *
 * Requires: agent-tools/newsletter-schema-parsed.json
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
const parsedPath = path.join(
  root,
  "agent-tools",
  "newsletter-schema-parsed.json",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "newsletter-variables.json",
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
      "Topic, goal, audience, takeaway, facts, language, format, sender, CTA, length.",
    defaultOpen: true,
  },
  "Message & Structure": {
    id: "structure",
    title: "Message & Structure",
    description:
      "Sources, sections, opening, links, timing, series context, exclusions.",
    defaultOpen: false,
  },
  "Brand & Delivery": {
    id: "brand",
    title: "Brand & Delivery",
    description:
      "Tone, voice, platform, formatting, personalisation, sign-off, replies.",
    defaultOpen: false,
  },
  "Evidence & Compliance": {
    id: "compliance",
    title: "Evidence & Compliance",
    description:
      "CTA URL, claims, disclosures, sensitive topics, and jurisdiction.",
    defaultOpen: false,
  },
};

const SHOW_WHEN = {
  jurisdiction: {
    key: "sensitiveTopic",
    equals: [
      "Health or medical",
      "Legal",
      "Finance or tax",
      "Employment or insurance",
      "Political or public affairs",
      "Child or personal safety",
      "Other regulated topic",
    ],
  },
};

const EXTRA_HELP = {
  newsletterTopic: {
    example: "Honest Early Access update and what shipped this week",
    avoid: "Several unrelated themes in one issue.",
  },
  primaryGoal: {
    example: "Inform readers",
    avoid: "Stacking sell + re-engage + community as equal goals.",
  },
  keyMessage: {
    example: "One clear takeaway readers should remember",
    avoid: "Vague multi-message issues without a spine.",
  },
  essentialFacts: {
    example: "Only verified dates, prices, and product limits",
    avoid: "Invented stats, testimonials, or urgency.",
  },
  sensitiveTopic: {
    example: "None",
    avoid: "Medical/legal claims without approved wording and jurisdiction.",
  },
  replyPrompt: {
    example: "No",
    avoid: "Invented subscriber names or private personalisation.",
  },
};

function mapType(briefType) {
  if (briefType === "textarea") return "textarea";
  if (briefType === "select") return "select";
  if (briefType === "number") return "number";
  if (briefType === "URL") return "text";
  if (briefType === "toggle") return "select";
  return "text";
}

function normalizeDefault(field) {
  if (!field.default || field.default === "Blank") return undefined;
  let value = field.default;
  // Prefer full select option when default is a short label (e.g. "Standard")
  if (field.options?.length && !field.options.includes(value)) {
    const match = field.options.find(
      (o) => o === value || o.startsWith(value + ":") || o.startsWith(value + " "),
    );
    if (match) value = match;
  }
  return value;
}

function buildField(raw) {
  const groupMeta = GROUP_MAP[raw.group] || {
    id: "other",
    title: raw.group || "Other",
    description: "",
    defaultOpen: false,
  };

  let type = mapType(raw.type);
  let options = raw.options?.length ? [...raw.options] : undefined;

  if (raw.type === "toggle") {
    type = "select";
    options = options?.length ? options : ["Yes", "No"];
  }

  const defaultValue = normalizeDefault(raw);
  const extra = EXTRA_HELP[raw.key] || {};

  const help = {
    what: (raw.label || raw.key) + ".",
    why: raw.why || raw.helper || `Used as ${raw.key} in the newsletter brief.`,
    example:
      extra.example ||
      (defaultValue ? defaultValue : raw.placeholder) ||
      "A short factual value you can verify.",
    avoid:
      extra.avoid ||
      "Invented links, fake personalisation, false urgency, or unsupported claims.",
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
      `Missing ${parsedPath}. Run: node scripts/parse-newsletter-brief.mjs`,
    );
    process.exit(1);
  }

  const prompt = fs.readFileSync(promptPath, "utf8");
  const promptKeys = new Set(extractVars(prompt));
  const rawFields = JSON.parse(fs.readFileSync(parsedPath, "utf8"));

  if (rawFields.length !== 30) {
    console.warn(`Expected 30 fields, got ${rawFields.length}`);
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
    slug: "newsletter",
    title: "Newsletter",
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
