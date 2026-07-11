/**
 * Builds Cold Email Outreach form schema from the UX brief (34 fields).
 * Does NOT modify the prompt text — only form metadata for UX.
 *
 * Usage: node scripts/build-cold-email-outreach-form.mjs
 *
 * Requires: agent-tools/cold-email-schema-parsed.json
 *   (node scripts/parse-cold-email-brief.mjs [brief-path])
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
  "cold-email-outreach.txt",
);
const parsedPath = path.join(
  root,
  "agent-tools",
  "cold-email-schema-parsed.json",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "cold-email-outreach-variables.json",
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
      "Sender, offer, recipient context, relevance, facts, package, CTA, tone, length.",
    defaultOpen: true,
  },
  "Recipient & Personalization": {
    id: "recipient",
    title: "Recipient & Personalization",
    description:
      "Named contact details, personalization, relationship, and contact source.",
    defaultOpen: false,
  },
  "Offer & Evidence": {
    id: "offer",
    title: "Offer & Evidence",
    description:
      "Differentiator, proof, links, next-step details, pricing, objections.",
    defaultOpen: false,
  },
  "Delivery, Compliance & Output": {
    id: "delivery",
    title: "Delivery, Compliance & Output",
    description:
      "Region, sender details, opt-out, regulated topics, variants, extra rules.",
    defaultOpen: false,
  },
};

const SHOW_WHEN = {
  referralDetails: {
    key: "relationshipBasis",
    equals: "Referral or introduction",
  },
  regulatedRequirements: {
    key: "sensitiveCategory",
    notEquals: "None",
  },
};

const EXTRA_HELP = {
  senderIdentity: {
    example: "Alex Morgan, Partnerships Lead at Northstar Labs",
    avoid: "Fake names, invented titles, or hidden sender identity.",
  },
  offerAndOutcome: {
    example:
      "A lightweight support triage workflow that may reduce ticket backlog for small CS teams",
    avoid: "Guaranteed ROI or vague “we help companies grow”.",
  },
  outreachGoal: {
    example: "Start a conversation",
    avoid: "Stacking meeting + referral + purchase in one email.",
  },
  targetRecipient: {
    example: "Heads of customer support at B2B SaaS companies with 20–100 employees",
    avoid: "Generic “decision makers everywhere”.",
  },
  relevanceBasis: {
    example: "They recently posted about hiring support agents and ticket volume",
    avoid: "Fabricated research into private company problems.",
  },
  approvedFacts: {
    example: "Used by X customers; Early Access; Free 5/day — only if true",
    avoid: "Invented metrics, clients, or capabilities.",
  },
  personalizationDetails: {
    example: "Public LinkedIn post about onboarding bottlenecks",
    avoid: "Pretending private knowledge or false familiarity.",
  },
  referralDetails: {
    example: "Introduced by Sam Lee — may mention first name only",
    avoid: "Name-dropping without permission or accuracy.",
  },
  sensitiveCategory: {
    example: "None",
    avoid: "Making medical/legal/financial claims without approved wording.",
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
    why: raw.why || raw.helper || `Used as ${raw.key} in the cold outreach brief.`,
    example:
      extra.example ||
      (defaultValue ? defaultValue : raw.placeholder) ||
      "A short factual value you can verify.",
    avoid:
      extra.avoid ||
      "Invented personalization, fake proof, pressure tactics, or private data.",
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
      `Missing ${parsedPath}. Run: node scripts/parse-cold-email-brief.mjs`,
    );
    process.exit(1);
  }

  const prompt = fs.readFileSync(promptPath, "utf8");
  const promptKeys = new Set(extractVars(prompt));
  const rawFields = JSON.parse(fs.readFileSync(parsedPath, "utf8"));

  if (rawFields.length !== 34) {
    console.warn(`Expected 34 fields, got ${rawFields.length}`);
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
    slug: "cold-email-outreach",
    title: "Cold Email Outreach",
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
