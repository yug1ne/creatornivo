/**
 * Builds Landing Page Copy form schema from the UX brief (36 Standard fields).
 * Does NOT modify the prompt text — only form metadata for UX.
 *
 * Usage: node scripts/build-landing-page-copy-form.mjs
 *
 * Requires: agent-tools/landing-page-copy-schema-parsed.json
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
  "landing-page-copy.txt",
);
const parsedPath = path.join(
  root,
  "agent-tools",
  "landing-page-copy-schema-parsed.json",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "landing-page-copy-variables.json",
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
      "Brand, offer, type, goal, audience, problem, promise, CTA, URL, language, page depth.",
    defaultOpen: true,
  },
  "Audience & Positioning": {
    id: "audience",
    title: "Audience & Positioning",
    description:
      "Context, outcomes, differentiators, awareness, objections, alternatives.",
    defaultOpen: false,
  },
  "Offer & Conversion": {
    id: "offer",
    title: "Offer & Conversion",
    description:
      "Benefits, features, pricing, conversion path, secondary CTA, urgency.",
    defaultOpen: false,
  },
  "Brand, Proof & Compliance": {
    id: "brand",
    title: "Brand, Proof & Compliance",
    description:
      "Voice, proof, regulated topics, jurisdiction, disclosures, privacy notes.",
    defaultOpen: false,
  },
  "SEO & Output Settings": {
    id: "seo",
    title: "SEO & Output Settings",
    description: "Keywords, FAQ mode, and additional requirements.",
    defaultOpen: false,
  },
};

const SHOW_WHEN = {
  deadlineOrScarcityDetails: {
    key: "timeSensitiveOffer",
    equals: "On",
  },
  proofDetails: {
    key: "proofAvailable",
    equals: "On",
  },
  jurisdiction: {
    key: "regulatedTopic",
    notEquals: "None or general",
  },
  privacyOrDataNotes: {
    key: "conversionPath",
    equals: [
      "Purchase or checkout",
      "Lead form",
      "Book a call",
      "Start trial or signup",
      "Download or access",
      "Join waitlist",
      "Contact or request quote",
    ],
  },
};

const EXTRA_HELP = {
  brandOrCompany: {
    example: "Creatornivo",
    avoid: "Inventing a brand name.",
  },
  offerName: {
    example: "AI Content Template Library",
    avoid: "Vague working titles without a real offer name.",
  },
  mainPromise: {
    example: "Clearer first drafts without inventing claims",
    avoid: "Unsupported guarantees.",
  },
  timeSensitiveOffer: {
    example: "Off",
    avoid: "Fake urgency without real deadlines.",
  },
  proofAvailable: {
    example: "Off",
    avoid: "Invented testimonials or ratings.",
  },
  regulatedTopic: {
    example: "None or general",
    avoid: "Medical/legal claims without approved wording.",
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

  const help = {
    what: (raw.label || raw.key) + ".",
    why:
      raw.why ||
      raw.helper ||
      `Used as ${raw.key} in the landing page brief.`,
    example:
      extra.example ||
      (defaultValue ? defaultValue : raw.placeholder) ||
      "A short factual value you can verify.",
    avoid:
      extra.avoid ||
      "Invented proof, fake urgency, unsupported guarantees, or fabricated pricing.",
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

  if (type === "select" && options?.length) field.options = options;
  if (defaultValue) field.defaultValue = defaultValue;
  if (SHOW_WHEN[raw.key]) field.showWhen = SHOW_WHEN[raw.key];

  return field;
}

function main() {
  if (!fs.existsSync(parsedPath)) {
    console.error(
      `Missing ${parsedPath}. Run: node scripts/parse-landing-page-copy-brief.mjs`,
    );
    process.exit(1);
  }

  const prompt = fs.readFileSync(promptPath, "utf8");
  const promptKeys = new Set(extractVars(prompt));
  const rawFields = JSON.parse(fs.readFileSync(parsedPath, "utf8"));

  if (rawFields.length !== 36) {
    console.warn(`Expected 36 fields, got ${rawFields.length}`);
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
    slug: "landing-page-copy",
    title: "Landing Page Copy",
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
