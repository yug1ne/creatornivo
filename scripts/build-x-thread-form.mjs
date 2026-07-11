/**
 * Builds X Thread form schema from the UX brief (24 compact fields).
 * Does NOT modify the prompt text — only form metadata for UX.
 *
 * Usage: node scripts/build-x-thread-form.mjs
 *
 * Requires: agent-tools/x-thread-schema-parsed.json
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
  "x-thread.txt",
);
const parsedPath = path.join(root, "agent-tools", "x-thread-schema-parsed.json");
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "x-thread-variables.json",
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
      "Topic, goal, audience, facts, language, sources, type, length, takeaway.",
    defaultOpen: true,
  },
  "Content & Structure": {
    id: "structure",
    title: "Content & Structure",
    description:
      "Opening, depth, perspective, numbering, and ending style.",
    defaultOpen: false,
  },
  "Brand & Conversion": {
    id: "brand",
    title: "Brand & Conversion",
    description:
      "Tone, voice, CTA, destination link, and commercial disclosure.",
    defaultOpen: false,
  },
  "Compliance & Constraints": {
    id: "compliance",
    title: "Compliance & Constraints",
    description:
      "Sensitive topics, claim restrictions, and additional context.",
    defaultOpen: false,
  },
};

const SHOW_WHEN = {
  ctaDetails: {
    key: "ctaMode",
    notEquals: "None",
  },
  destinationUrl: {
    key: "ctaMode",
    equals: ["Visit a link", "Subscribe", "Download", "Buy or book"],
  },
  disclosureText: {
    key: "commercialRelationship",
    notEquals: "None",
  },
};

const EXTRA_HELP = {
  topicAndAngle: {
    example: "Why short product posts convert better than feature dumps",
    avoid: "A generic topic with no angle.",
  },
  primaryGoal: {
    example: "Educate or explain",
    avoid: "Stacking sell + discuss + authority as equal goals.",
  },
  keyPointsAndFacts: {
    example: "Only verified steps, numbers, and examples",
    avoid: "Invented stats, quotes, or personal experiences.",
  },
  ctaDetails: {
    example: "Reply with your biggest posting bottleneck",
    avoid: "Multiple competing CTAs in the final posts.",
  },
  commercialRelationship: {
    example: "My own product",
    avoid: "Presenting owned products as independent reviews.",
  },
  sensitiveTopic: {
    example: "None",
    avoid: "Medical/legal claims without approved wording.",
  },
};

function mapType(briefType) {
  if (briefType === "textarea") return "textarea";
  if (briefType === "select") return "select";
  if (briefType === "number") return "number";
  if (briefType === "URL") return "text";
  return "text";
}

function normalizeDefault(field) {
  if (!field.default || field.default === "Blank") return undefined;
  let value = field.default;
  if (field.options?.length && !field.options.includes(value)) {
    const match = field.options.find(
      (o) =>
        o === value || o.startsWith(value + ":") || o.startsWith(value + " "),
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

  const type = mapType(raw.type);
  const options = raw.options?.length ? [...raw.options] : undefined;
  const defaultValue = normalizeDefault(raw);
  const extra = EXTRA_HELP[raw.key] || {};

  const help = {
    what: (raw.label || raw.key) + ".",
    why: raw.why || raw.helper || `Used as ${raw.key} in the X thread brief.`,
    example:
      extra.example ||
      (defaultValue ? defaultValue : raw.placeholder) ||
      "A short factual value you can verify.",
    avoid:
      extra.avoid ||
      "Invented facts, engagement bait, fake urgency, or undisclosed promotion.",
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
      `Missing ${parsedPath}. Run: node scripts/parse-x-thread-brief.mjs`,
    );
    process.exit(1);
  }

  const prompt = fs.readFileSync(promptPath, "utf8");
  const promptKeys = new Set(extractVars(prompt));
  const rawFields = JSON.parse(fs.readFileSync(parsedPath, "utf8"));

  if (rawFields.length !== 24) {
    console.warn(`Expected 24 fields, got ${rawFields.length}`);
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
    slug: "x-thread",
    title: "X Thread",
    version: 1,
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
