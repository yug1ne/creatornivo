/**
 * Builds SEO Meta Tags form schema from the UX brief (24 compact fields).
 * Does NOT modify the prompt text — only form metadata for UX.
 *
 * Usage: node scripts/build-seo-meta-tags-form.mjs
 *
 * Requires: agent-tools/seo-meta-tags-schema-parsed.json
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
  "seo-meta-tags.txt",
);
const parsedPath = path.join(
  root,
  "agent-tools",
  "seo-meta-tags-schema-parsed.json",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "seo-meta-tags-variables.json",
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
      "Page summary, type, audience, primary keyword, facts, goal, language, brand, URL.",
    defaultOpen: true,
  },
  "Search Focus": {
    id: "search",
    title: "Search Focus",
    description:
      "Intent, supporting keywords, geography, and wording restrictions.",
    defaultOpen: false,
  },
  "Technical Settings": {
    id: "technical",
    title: "Technical Settings",
    description:
      "Title branding, slug handling, indexing, and canonical URL.",
    defaultOpen: false,
  },
  "Social Preview": {
    id: "social",
    title: "Social Preview",
    description:
      "Optional Open Graph / X Card metadata and preview image.",
    defaultOpen: false,
  },
  "Output Options": {
    id: "output",
    title: "Output Options",
    description: "Number of variants and special requirements.",
    defaultOpen: false,
  },
};

const SHOW_WHEN = {
  currentSlug: {
    key: "slugPreference",
    equals: ["Improve existing slug", "Keep existing slug"],
  },
  socialPlatforms: {
    key: "includeSocialMetadata",
    equals: "On",
  },
  socialImageUrl: {
    key: "includeSocialMetadata",
    equals: "On",
  },
  socialImageAlt: {
    key: "includeSocialMetadata",
    equals: "On",
  },
};

const EXTRA_HELP = {
  pageTopic: {
    example: "Simple online invoice generator for freelancers",
    avoid: "Metadata that describes content not on the page.",
  },
  primaryKeyword: {
    example: "online invoice generator",
    avoid: "Keyword stuffing or unrelated head terms.",
  },
  keyPageFacts: {
    example: "Free plan, PDF export, no invented features",
    avoid: "Unverified prices, rankings, or guarantees.",
  },
  includeSocialMetadata: {
    example: "Off",
    avoid: "Inventing social image URLs.",
  },
  socialPlatforms: {
    example: "Open Graph\nX Card",
    avoid: "Requesting formats you will not implement.",
  },
};

function mapType(briefType) {
  if (briefType === "textarea") return "textarea";
  if (briefType === "select") return "select";
  if (briefType === "number") return "number";
  if (briefType === "URL") return "text";
  if (briefType === "toggle") return "select";
  if (briefType === "multi-select") return "textarea";
  return "text";
}

function normalizeDefault(field) {
  if (!field.default || field.default === "Blank") return undefined;
  let value = field.default;
  // toggle defaults: Off / On
  if (field.type === "toggle") {
    if (/^off$/i.test(value)) return "Off";
    if (/^on$/i.test(value)) return "On";
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
    options = ["Off", "On"];
  }

  const defaultValue = normalizeDefault(raw);
  const extra = EXTRA_HELP[raw.key] || {};
  const multiHelper = multiSelectHelper(raw);

  const help = {
    what: (raw.label || raw.key) + ".",
    why:
      raw.why ||
      raw.helper ||
      `Used as ${raw.key} in the SEO metadata brief.`,
    example:
      extra.example ||
      (defaultValue ? defaultValue : raw.placeholder) ||
      "A short factual value you can verify.",
    avoid:
      extra.avoid ||
      "Invented page facts, fake rankings, keyword stuffing, or fabricated URLs.",
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

  // select options (not multi-select textarea)
  if (type === "select" && options?.length) field.options = options;
  if (defaultValue) field.defaultValue = defaultValue;
  if (SHOW_WHEN[raw.key]) field.showWhen = SHOW_WHEN[raw.key];

  return field;
}

function main() {
  if (!fs.existsSync(parsedPath)) {
    console.error(
      `Missing ${parsedPath}. Run: node scripts/parse-seo-meta-tags-brief.mjs`,
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
    slug: "seo-meta-tags",
    title: "SEO Meta Tags",
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
