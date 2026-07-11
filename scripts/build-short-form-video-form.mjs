/**
 * Builds Short-Form Video Script form schema from the UX brief (24 fields).
 * Does NOT modify the prompt text — only form metadata for UX.
 *
 * Usage: node scripts/build-short-form-video-form.mjs
 *
 * Requires: agent-tools/short-form-video-schema-parsed.json
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
  "short-form-video.txt",
);
const parsedPath = path.join(
  root,
  "agent-tools",
  "short-form-video-schema-parsed.json",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "short-form-video-variables.json",
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
      "Topic, goal, audience, takeaway, facts, platform, duration, format, CTA, language.",
    defaultOpen: true,
  },
  "Platform & Production": {
    id: "production",
    title: "Platform & Production",
    description:
      "Filming method, available assets, production level, and variants.",
    defaultOpen: false,
  },
  "Brand & Style": {
    id: "brand",
    title: "Brand & Style",
    description: "Tone, brand voice, pacing, and caption style.",
    defaultOpen: false,
  },
  "Accuracy & Restrictions": {
    id: "accuracy",
    title: "Accuracy & Restrictions",
    description:
      "Sources, restrictions, sensitive subject category, and jurisdiction.",
    defaultOpen: false,
  },
};

const SHOW_WHEN = {
  offerDetails: {
    key: "primaryGoal",
    equals: "Promote or sell",
  },
  customPlatform: {
    key: "targetPlatform",
    equals: "Other",
  },
  jurisdiction: {
    key: "subjectRisk",
    notEquals: "General topic",
  },
};

const EXTRA_HELP = {
  videoTopic: {
    example: "One practical tip for clearer product demos on Reels",
    avoid: "Several unrelated topics in a 30-second script.",
  },
  primaryGoal: {
    example: "Educate or explain",
    avoid: "Stacking sell + engage + entertain as equal goals.",
  },
  keyMessage: {
    example: "One takeaway viewers should remember",
    avoid: "Vague multi-message scripts.",
  },
  essentialFacts: {
    example: "Only verified steps, features, or dates",
    avoid: "Invented stats, testimonials, or guarantees.",
  },
  offerDetails: {
    example: "Confirmed product name, price, and terms only",
    avoid: "Fake discounts or scarcity.",
  },
  availableVisuals: {
    example: "Creator on camera\nProduct footage",
    avoid: "Requesting footage you cannot shoot.",
  },
  subjectRisk: {
    example: "General topic",
    avoid: "Medical/legal claims without approved wording.",
  },
};

function mapType(briefType) {
  if (briefType === "textarea") return "textarea";
  if (briefType === "select") return "select";
  if (briefType === "number") return "number";
  if (briefType === "URL") return "text";
  if (briefType === "multi-select") return "textarea";
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

function multiSelectHelper(raw) {
  if (raw.type !== "multi-select" || !raw.options?.length) return null;
  return (
    (raw.helper ? raw.helper + " " : "") +
    "Select all that apply (one per line). Options: " +
    raw.options.join("; ") +
    "."
  );
}

function buildField(raw) {
  const groupMeta = GROUP_MAP[raw.group] || {
    id: "other",
    title: raw.group || "Other",
    description: "",
    defaultOpen: false,
  };

  const type = mapType(raw.type);
  const options =
    raw.type === "select" && raw.options?.length
      ? [...raw.options]
      : undefined;
  const defaultValue = normalizeDefault(raw);
  const extra = EXTRA_HELP[raw.key] || {};
  const multiHelper = multiSelectHelper(raw);

  const help = {
    what: (raw.label || raw.key) + ".",
    why:
      raw.why ||
      raw.helper ||
      `Used as ${raw.key} in the short-form video brief.`,
    example:
      extra.example ||
      (defaultValue ? defaultValue : raw.placeholder) ||
      "A short factual value you can verify.",
    avoid:
      extra.avoid ||
      "Invented proof, fake urgency, engagement bait, or unsafe claims.",
  };

  const field = {
    key: raw.key,
    label: raw.label || raw.key,
    placeholder:
      raw.type === "multi-select" && raw.options?.length
        ? raw.options.join("\n")
        : raw.placeholder || "Optional — leave blank if unknown",
    required: Boolean(raw.required),
    type,
    group: groupMeta.id,
    groupTitle: groupMeta.title,
    hint: multiHelper || raw.helper || help.what,
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
      `Missing ${parsedPath}. Run: node scripts/parse-short-form-video-brief.mjs`,
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
    slug: "short-form-video",
    title: "Short-Form Video Script",
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
