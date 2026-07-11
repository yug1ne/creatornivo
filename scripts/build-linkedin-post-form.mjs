/**
 * Builds LinkedIn Post form schema from the UX brief (24 compact fields).
 * Does NOT modify the prompt text — only form metadata for UX.
 *
 * Usage: node scripts/build-linkedin-post-form.mjs
 *
 * Requires: agent-tools/linkedin-post-schema-parsed.json
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
  "linkedin-post.txt",
);
const parsedPath = path.join(
  root,
  "agent-tools",
  "linkedin-post-schema-parsed.json",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "linkedin-post-variables.json",
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
      "Subject, goal, audience, message, facts, format, CTA, language, length, perspective.",
    defaultOpen: true,
  },
  "Audience & Positioning": {
    id: "audience",
    title: "Audience & Positioning",
    description:
      "Awareness, problem, credibility, and objections.",
    defaultOpen: false,
  },
  "Voice & Formatting": {
    id: "voice",
    title: "Voice & Formatting",
    description: "Tone, brand voice, emoji use, and hashtags.",
    defaultOpen: false,
  },
  "Evidence & Restrictions": {
    id: "evidence",
    title: "Evidence & Restrictions",
    description:
      "Sources, link, disclosures, privacy, claim bans, extra rules.",
    defaultOpen: false,
  },
};

const EXTRA_HELP = {
  subjectOrOffer: {
    example: "How small teams publish honest product updates",
    avoid: "Several unrelated topics in one post.",
  },
  primaryGoal: {
    example: "Build authority",
    avoid: "Stacking hire + sell + discuss as equal primary goals.",
  },
  coreMessage: {
    example: "One clear professional takeaway readers should remember",
    avoid: "Guessing the takeaway or inventing lessons.",
  },
  essentialFacts: {
    example: "No external claims — or only verified numbers and details",
    avoid: "Invented metrics, clients, or personal stories.",
  },
  authorPerspective: {
    example: "Personal profile",
    avoid: "Company Page voice on a personal confession without authorization.",
  },
  affiliationDisclosure: {
    example: "I built this product / employed by …",
    avoid: "Hidden commercial relationships.",
  },
  privacyRestrictions: {
    example: "Do not name the client; omit internal revenue",
    avoid: "Leaving private client data in essentialFacts.",
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
  return field.default;
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
    why: raw.why || raw.helper || `Used as ${raw.key} in the LinkedIn brief.`,
    example:
      extra.example ||
      (defaultValue ? defaultValue : raw.placeholder) ||
      "A short factual value you can verify.",
    avoid:
      extra.avoid ||
      "Invented expertise, fake vulnerability, engagement bait, or private data.",
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

  return field;
}

function main() {
  if (!fs.existsSync(parsedPath)) {
    console.error(
      `Missing ${parsedPath}. Run: node scripts/parse-linkedin-post-brief.mjs`,
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
    slug: "linkedin-post",
    title: "LinkedIn Post",
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
