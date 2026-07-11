/**
 * Builds Product Description form schema from the UX brief (32 Standard fields).
 * Does NOT modify the prompt text — only form metadata for UX.
 *
 * Usage: node scripts/build-product-description-form.mjs
 *
 * Requires: agent-tools/product-description-schema-parsed.json
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
  "product-description.txt",
);
const parsedPath = path.join(
  root,
  "agent-tools",
  "product-description-schema-parsed.json",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "product-description-variables.json",
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
      "Name, format, category, audience, goal, facts, benefits, brand, destination, tone, length.",
    defaultOpen: true,
  },
  "Product Details & Proof": {
    id: "details",
    title: "Product Details & Proof",
    description:
      "Features, specs, materials, package, usage, evidence, and claim limits.",
    defaultOpen: false,
  },
  "Offer & Purchase Information": {
    id: "offer",
    title: "Offer & Purchase Information",
    description:
      "Variants, price, delivery, returns, digital access, subscription terms.",
    defaultOpen: false,
  },
  "Positioning, SEO & Brand": {
    id: "positioning",
    title: "Positioning, SEO & Brand",
    description:
      "Customer problem, differentiators, use cases, objections, SEO, voice, extras.",
    defaultOpen: false,
  },
};

const PHYSICAL_OR_BUNDLE = ["Physical product", "Bundle"];
const DIGITAL_OR_BUNDLE = ["Digital product", "Bundle"];

const SHOW_WHEN = {
  specifications: {
    key: "productFormat",
    equals: PHYSICAL_OR_BUNDLE,
  },
  materialsIngredients: {
    key: "productFormat",
    equals: PHYSICAL_OR_BUNDLE,
  },
  digitalAccessDetails: {
    key: "productFormat",
    equals: DIGITAL_OR_BUNDLE,
  },
  subscriptionTerms: {
    key: "productFormat",
    equals: "Subscription",
  },
};

const EXTRA_HELP = {
  productName: {
    example: "AeroPress Go Travel Coffee Maker",
    avoid: "Vague working titles that customers will never see.",
  },
  productFormat: {
    example: "Physical product",
    avoid: "Picking a format that does not match fulfilment reality.",
  },
  coreProductFacts: {
    example: "What it is, how it works, verified capabilities only",
    avoid: "Unreleased features stated as available.",
  },
  topBenefits: {
    example: "Faster morning coffee on the road without a bulky setup",
    avoid: "Guaranteed outcomes without evidence.",
  },
  claimsRestrictions: {
    example: "No medical claims; no “clinically proven” without study",
    avoid: "Leaving regulated claim bans only in your head.",
  },
  subscriptionTerms: {
    example: "Billed monthly; cancel anytime; what renews",
    avoid: "Invented renewal or cancellation policy.",
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

  const type = mapType(raw.type);
  const options = raw.options?.length ? [...raw.options] : undefined;
  const defaultValue = normalizeDefault(raw);
  const extra = EXTRA_HELP[raw.key] || {};

  const help = {
    what: (raw.label || raw.key) + ".",
    why:
      raw.why ||
      raw.helper ||
      `Used as ${raw.key} in the product description brief.`,
    example:
      extra.example ||
      (defaultValue ? defaultValue : raw.placeholder) ||
      "A short factual value you can verify.",
    avoid:
      extra.avoid ||
      "Invented specs, prices, reviews, scarcity, or performance guarantees.",
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
      `Missing ${parsedPath}. Run: node scripts/parse-product-description-brief.mjs`,
    );
    process.exit(1);
  }

  const prompt = fs.readFileSync(promptPath, "utf8");
  const promptKeys = new Set(extractVars(prompt));
  const rawFields = JSON.parse(fs.readFileSync(parsedPath, "utf8"));

  if (rawFields.length !== 32) {
    console.warn(`Expected 32 fields, got ${rawFields.length}`);
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
    slug: "product-description",
    title: "Product Description",
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
