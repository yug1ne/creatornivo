/**
 * Builds Blog Article form schema from the UX brief (42 fields).
 * Does NOT modify the prompt text — only form metadata for UX.
 *
 * Usage: node scripts/build-blog-article-form.mjs
 *
 * Optional: agent-tools/blog-article-schema-parsed.json (from brief parse).
 * Falls back to embedding if the parse file is missing.
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
  "blog-article.txt",
);
const parsedPath = path.join(
  root,
  "agent-tools",
  "blog-article-schema-parsed.json",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "blog-article-variables.json",
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
      "Topic, audience, goal, key points, language, length, tone, and publishing identity.",
    defaultOpen: true,
  },
  "Editorial Direction": {
    id: "editorial",
    title: "Editorial Direction",
    description:
      "Angle, knowledge level, voice, narrative approach, and exclusions.",
    defaultOpen: false,
  },
  "SEO & Discovery": {
    id: "seo",
    title: "SEO & Discovery",
    description:
      "Keywords, intent, location, links, and snippet opportunities.",
    defaultOpen: false,
  },
  "Facts, Sources & Restrictions": {
    id: "facts",
    title: "Facts, Sources & Restrictions",
    description:
      "Evidence, quotes, claim handling, privacy, jurisdiction, disclosures.",
    defaultOpen: false,
  },
  "Output & Conversion": {
    id: "output",
    title: "Output & Conversion",
    description: "Headlines, FAQ, CTA, destination, and formatting.",
    defaultOpen: false,
  },
};

/** Conditional display rules from the brief. */
const SHOW_WHEN = {
  customLanguage: { key: "outputLanguage", equals: "Other" },
  customWordCount: { key: "desiredLength", equals: "Custom" },
  jurisdiction: {
    key: "contentSensitivity",
    equals: [
      "Health or medical",
      "Legal or regulatory",
      "Financial, tax, or investment",
      "Safety or technical",
      "Political or public affairs",
      "Other high-stakes",
    ],
  },
  faqCount: { key: "includeFAQ", equals: "On" },
  ctaDestination: { key: "ctaGoal", notEquals: "None" },
};

const EXTRA_HELP = {
  articleTopic: {
    example: "How small teams write honest product copy without fake social proof",
    avoid: "Several unrelated topics in one article.",
  },
  articleGoal: {
    example: "Educate readers",
    avoid: "Stacking rank + sell + lead gen as equal goals.",
  },
  articleFormat: {
    example: "How-to guide",
    avoid: "Picking a format that fights the topic (e.g. list for a pure argument).",
  },
  targetAudience: {
    example: "Founders and content leads at early-stage B2B products",
    avoid: "Assuming every reader is already an expert or a buyer.",
  },
  readerOutcome: {
    example: "They can write one clearer product update without inventing claims",
    avoid: "Vague outcomes like “feel inspired”.",
  },
  keyPoints: {
    example: "Only use supplied facts; Free 5/day; no fake testimonials",
    avoid: "Leaving out non-negotiable claims that must appear.",
  },
  sourceNotes: {
    example: "Paste product limits, verified stats, approved product stage",
    avoid: "Unverified stats or private customer data.",
  },
  primaryKeyword: {
    example: "honest product marketing copy",
    avoid: "Keyword stuffing or unrelated head terms.",
  },
  contentSensitivity: {
    example: "Standard",
    avoid: "Treating medical/financial topics as standard marketing copy.",
  },
  ctaGoal: {
    example: "Learn more",
    avoid: "Aggressive CTAs when goal is None or purely educational.",
  },
};

function mapType(briefType) {
  if (briefType === "textarea") return "textarea";
  if (briefType === "select") return "select";
  if (briefType === "number") return "number";
  if (briefType === "toggle") return "select";
  if (briefType === "URL") return "text";
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

  let type = mapType(raw.type);
  let options = raw.options?.length ? [...raw.options] : undefined;

  if (raw.type === "toggle") {
    options = ["Off", "On"];
    type = "select";
  }

  const defaultValue = normalizeDefault(raw);
  const extra = EXTRA_HELP[raw.key] || {};
  const help = {
    what: raw.label + ".",
    why: raw.why || raw.helper || `Used as ${raw.key} in the article brief.`,
    example:
      extra.example ||
      (defaultValue && defaultValue !== "Blank"
        ? defaultValue
        : raw.placeholder || "A short factual value you can verify."),
    avoid:
      extra.avoid ||
      "Invented facts, sources, quotes, guarantees, or private data.",
  };

  const field = {
    key: raw.key,
    label: raw.label,
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
      `Missing ${parsedPath}. Parse the brief field schema first.`,
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
    slug: "blog-article",
    title: "Blog Article",
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
