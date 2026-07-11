/**
 * Builds Paid Ad Copy form schema from the UX brief (30 Standard fields).
 * Does NOT modify the prompt text — only form metadata for UX.
 *
 * Usage: node scripts/build-paid-ad-copy-form.mjs
 *
 * Requires: agent-tools/paid-ad-copy-schema-parsed.json
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
  "paid-ad-copy.txt",
);
const parsedPath = path.join(
  root,
  "agent-tools",
  "paid-ad-copy-schema-parsed.json",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "paid-ad-copy-variables.json",
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
      "Platform, format, offer, goal, audience, value prop, terms, URL, language, variants.",
    defaultOpen: true,
  },
  "Audience & Offer": {
    id: "audience",
    title: "Audience & Offer",
    description:
      "Awareness, need, outcome, differentiators, objections, proof, market.",
    defaultOpen: false,
  },
  "Brand & Creative": {
    id: "brand",
    title: "Brand & Creative",
    description:
      "Brand name, voice, tone, creative context, search/video/carousel inputs.",
    defaultOpen: false,
  },
  "Compliance & Output": {
    id: "compliance",
    title: "Compliance & Output",
    description:
      "CTA, testing angles, regulated category, disclosures, prohibited claims.",
    defaultOpen: false,
  },
};

const SHOW_WHEN = {
  searchKeywords: {
    key: "adPlatform",
    equals: "Google Search Ads",
  },
  videoOpeningContext: {
    key: "adFormat",
    equals: "Short video",
  },
  carouselCardCount: {
    key: "adFormat",
    equals: "Carousel",
  },
  mandatoryDisclosures: {
    key: "regulatedCategory",
    notEquals: "None",
  },
};

const EXTRA_HELP = {
  adPlatform: {
    example: "Meta Ads",
    avoid: "Mixing platform rules in one package without selecting a platform.",
  },
  productOrOffer: {
    example: "What is advertised and what the customer receives",
    avoid: "Vague offers without a clear product or next step.",
  },
  coreValueProposition: {
    example: "One clear reason to consider the offer",
    avoid: "A long feature dump without a main idea.",
  },
  proofPoints: {
    example: "Only verified results with context",
    avoid: "Invented testimonials, ratings, or ROI.",
  },
  regulatedCategory: {
    example: "None",
    avoid: "Health/finance claims without approved disclosures.",
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
      `Used as ${raw.key} in the paid ad brief.`,
    example:
      extra.example ||
      (defaultValue ? defaultValue : raw.placeholder) ||
      "A short factual value you can verify.",
    avoid:
      extra.avoid ||
      "Invented proof, fake urgency, personal-attribute claims, or guaranteed approval.",
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
      `Missing ${parsedPath}. Run: node scripts/parse-paid-ad-copy-brief.mjs`,
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
    slug: "paid-ad-copy",
    title: "Paid Ad Copy",
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
