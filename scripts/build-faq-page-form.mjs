/**
 * Builds FAQ Page form schema from the UX brief (42 fields).
 * Does NOT modify the prompt text — only form metadata for UX.
 *
 * Usage: node scripts/build-faq-page-form.mjs
 *
 * Requires: agent-tools/faq-page-schema-parsed.json
 *   (node scripts/parse-faq-page-brief.mjs [brief-path])
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
  "faq-page.txt",
);
const parsedPath = path.join(
  root,
  "agent-tools",
  "faq-page-schema-parsed.json",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "faq-page-variables.json",
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
      "Subject, brand, page type, goal, audience, must-answer questions, facts, depth, language.",
    defaultOpen: true,
  },
  "Question Architecture": {
    id: "architecture",
    title: "Question Architecture",
    description:
      "Scope, real questions, count, categories, journey stages, objections, exclusions.",
    defaultOpen: false,
  },
  "Brand, Voice & Conversion": {
    id: "brand",
    title: "Brand, Voice & Conversion",
    description: "Voice, tone, terminology, wording bans, and one CTA.",
    defaultOpen: false,
  },
  "SEO & Publishing": {
    id: "seo",
    title: "SEO & Publishing",
    description:
      "Keywords, intent, metadata notes, structured data, format.",
    defaultOpen: false,
  },
  "Accuracy, Policies & Edge Cases": {
    id: "accuracy",
    title: "Accuracy, Policies & Edge Cases",
    description:
      "Regulated topics, policies, sources, privacy, claim bans, escalation.",
    defaultOpen: false,
  },
};

/** Conditional display from the brief. */
const SHOW_WHEN = {
  ctaText: {
    key: "ctaGoal",
    notEquals: ["Auto", "No CTA"],
  },
  ctaDestination: {
    key: "ctaGoal",
    equals: [
      "Contact support",
      "Start or sign up",
      "Book a call",
      "View pricing",
      "Read documentation",
      "Visit a page",
    ],
  },
  canonicalPageUrl: {
    key: "structuredDataMode",
    equals: ["JSON-LD if appropriate", "JSON-LD always"],
  },
  jurisdiction: {
    key: "regulatedTopic",
    notEquals: "None",
  },
  escalationRoute: {
    key: "faqPageType",
    equals: [
      "Customer support",
      "Pricing or billing",
      "Policy or terms",
      "Product or service",
    ],
  },
};

const EXTRA_HELP = {
  faqSubject: {
    example: "Creatornivo subscriptions and billing",
    avoid: "Several unrelated products on one FAQ page.",
  },
  organizationName: {
    example: "Creatornivo",
    avoid: "Inventing a brand name or multiple conflicting entities.",
  },
  faqPageType: {
    example: "Product or service",
    avoid: "Picking a type that does not match the real page purpose.",
  },
  primaryGoal: {
    example: "Reduce support requests",
    avoid: "Stacking sell + SEO + support as equal primary goals.",
  },
  priorityQuestions: {
    example: "How do Free quotas work? What is included in Pro?",
    avoid: "Leaving out non-negotiable policy questions.",
  },
  confirmedFacts: {
    example: "Free: 5/day UTC. Pro: 100/month. No invented testimonials.",
    avoid: "Unverified prices, guarantees, or features not live yet.",
  },
  journeyStages: {
    example: "Before choosing\nGetting started\nUsing the product",
    avoid: "Selecting every stage when only two apply.",
  },
  structuredDataMode: {
    example: "Guidance only",
    avoid: "Promising FAQ rich results or inventing page URLs.",
  },
  regulatedTopic: {
    example: "None",
    avoid: "Medical/legal claims without approved policy wording.",
  },
};

function mapType(briefType, key, options) {
  if (briefType === "textarea") return "textarea";
  if (briefType === "select") return "select";
  if (briefType === "number") return "number";
  if (briefType === "URL") return "text";
  // multi-select → textarea listing options in helper (no multi-select UI yet)
  if (briefType === "multi-select") return "textarea";
  return "text";
}

function normalizeDefault(field) {
  if (!field.default || field.default === "Blank") return undefined;
  return field.default;
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

  const type = mapType(raw.type, raw.key, raw.options);
  const options =
    raw.type === "select" && raw.options?.length
      ? [...raw.options]
      : undefined;
  const defaultValue = normalizeDefault(raw);
  const extra = EXTRA_HELP[raw.key] || {};
  const multiHelper = multiSelectHelper(raw);

  const help = {
    what: (raw.label || raw.key) + ".",
    why: raw.why || raw.helper || `Used as ${raw.key} in the FAQ brief.`,
    example:
      extra.example ||
      (defaultValue ? defaultValue : raw.placeholder) ||
      "A short factual value you can verify.",
    avoid:
      extra.avoid ||
      "Invented features, prices, policies, reviews, or unsupported guarantees.",
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
      `Missing ${parsedPath}. Run: node scripts/parse-faq-page-brief.mjs`,
    );
    process.exit(1);
  }

  const prompt = fs.readFileSync(promptPath, "utf8");
  const promptKeys = new Set(extractVars(prompt));
  const rawFields = JSON.parse(fs.readFileSync(parsedPath, "utf8"));

  if (rawFields.length !== 42) {
    console.warn(`Expected 42 fields, got ${rawFields.length}`);
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
    slug: "faq-page",
    title: "FAQ Page",
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
