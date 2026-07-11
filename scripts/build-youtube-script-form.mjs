/**
 * Builds YouTube Script form schema from the UX brief (40 Complex fields).
 * Does NOT modify the prompt text — only form metadata for UX.
 *
 * Usage: node scripts/build-youtube-script-form.mjs
 *
 * Requires: agent-tools/youtube-script-schema-parsed.json
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
  "youtube-script.txt",
);
const parsedPath = path.join(
  root,
  "agent-tools",
  "youtube-script-schema-parsed.json",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "youtube-script-variables.json",
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
      "Topic, goal, audience, promise, facts, format, language, duration, tone, voice, CTA.",
    defaultOpen: true,
  },
  "Story, Structure & Retention": {
    id: "story",
    title: "Story, Structure & Retention",
    description:
      "Angle, sections, opening, structure, pacing, retention, examples, questions.",
    defaultOpen: false,
  },
  "Channel Voice & Production": {
    id: "production",
    title: "Channel Voice & Production",
    description:
      "Channel context, brand voice, host, visuals, B-roll, on-screen text, editing.",
    defaultOpen: false,
  },
  "Discovery & Publishing": {
    id: "discovery",
    title: "Discovery & Publishing",
    description:
      "Title direction, keywords, description, chapters, pinned comment.",
    defaultOpen: false,
  },
  "Accuracy & Commercial Context": {
    id: "accuracy",
    title: "Accuracy & Commercial Context",
    description:
      "Sources, commercial relationship, disclosures, regulated topics, restrictions.",
    defaultOpen: false,
  },
};

// Normalize truncated/partial group names from parse
const GROUP_ALIASES = {
  Channel: "Channel Voice & Production",
  "Channel Voice": "Channel Voice & Production",
};

const SHOW_WHEN = {
  sponsorOrOfferDetails: {
    key: "commercialRelationship",
    equals: [
      "Creator’s own offer",
      "Creator's own offer",
      "Sponsorship",
      "Affiliate relationship",
      "Brand partnership",
      "Other commercial relationship",
    ],
  },
  disclosureRequirements: {
    key: "commercialRelationship",
    equals: [
      "Sponsorship",
      "Affiliate relationship",
      "Brand partnership",
      "Other commercial relationship",
    ],
  },
  jurisdiction: {
    key: "regulatedTopic",
    notEquals: "None",
  },
};

const EXTRA_HELP = {
  videoTopic: {
    example: "What the long-form video will cover",
    avoid: "Several unrelated subjects in one video.",
  },
  centralPromise: {
    example: "What viewers should understand or be able to do afterward",
    avoid: "Vague promises the video cannot deliver.",
  },
  mustInclude: {
    example: "Only mandatory facts, steps, or arguments",
    avoid: "Invented stats or first-hand stories.",
  },
  commercialRelationship: {
    example: "None",
    avoid: "Hidden sponsorship or fake independent review framing.",
  },
  regulatedTopic: {
    example: "None",
    avoid: "Medical/legal claims without approved wording.",
  },
};

function mapType(briefType) {
  if (briefType === "textarea") return "textarea";
  if (briefType === "select") return "select";
  if (briefType === "number") return "number";
  if (briefType === "URL") return "text";
  if (briefType === "multi-select") return "textarea";
  if (briefType === "toggle") return "select";
  return "text";
}

function normalizeDefault(field) {
  if (!field.default || field.default === "Blank") return undefined;
  let value = field.default;
  if (field.type === "toggle") {
    if (/^off$/i.test(value) || /^no$/i.test(value)) return "Off";
    if (/^on$/i.test(value) || /^yes$/i.test(value)) return "On";
  }
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

function resolveGroup(rawGroup) {
  const g = GROUP_ALIASES[rawGroup] || rawGroup;
  return (
    GROUP_MAP[g] || {
      id: "other",
      title: g || "Other",
      description: "",
      defaultOpen: false,
    }
  );
}

function buildField(raw) {
  const groupMeta = resolveGroup(raw.group);

  let type = mapType(raw.type);
  let options = raw.options?.length ? [...raw.options] : undefined;

  if (raw.type === "toggle") {
    type = "select";
    options = ["Off", "On"];
  }

  // Boolean-like include* fields from brief may be select Yes/No/Auto
  if (
    ["includeDescription", "includeChapters", "includePinnedComment"].includes(
      raw.key,
    ) &&
    type === "text" &&
    !options?.length
  ) {
    type = "select";
    options = ["Auto", "Yes", "No"];
  }

  const defaultValue = normalizeDefault(raw);
  const extra = EXTRA_HELP[raw.key] || {};
  const multiHelper = multiSelectHelper(raw);

  const help = {
    what: (raw.label || raw.key) + ".",
    why:
      raw.why ||
      raw.helper ||
      `Used as ${raw.key} in the YouTube script brief.`,
    example:
      extra.example ||
      (defaultValue ? defaultValue : raw.placeholder) ||
      "A short factual value you can verify.",
    avoid:
      extra.avoid ||
      "Invented proof, fake urgency, fabricated stories, or unsupported claims.",
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

  if (type === "select" && options?.length) field.options = options;
  if (defaultValue) field.defaultValue = defaultValue;
  if (SHOW_WHEN[raw.key]) field.showWhen = SHOW_WHEN[raw.key];

  return field;
}

function main() {
  if (!fs.existsSync(parsedPath)) {
    console.error(
      `Missing ${parsedPath}. Run: node scripts/parse-youtube-script-brief.mjs`,
    );
    process.exit(1);
  }

  const prompt = fs.readFileSync(promptPath, "utf8");
  const promptKeys = new Set(extractVars(prompt));
  const rawFields = JSON.parse(fs.readFileSync(parsedPath, "utf8"));

  if (rawFields.length !== 40) {
    console.warn(`Expected 40 fields, got ${rawFields.length}`);
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
  // include any other groups
  for (const f of fields) {
    if (!groups.some((g) => g.id === f.group)) {
      groups.push({
        id: f.group,
        title: f.groupTitle || f.group,
        description: "",
        defaultOpen: false,
      });
    }
  }

  const payload = {
    slug: "youtube-script",
    title: "YouTube Script",
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
