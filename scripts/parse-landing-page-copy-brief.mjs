/**
 * Parse Landing Page Copy brief into schema JSON.
 * Usage: node scripts/parse-landing-page-copy-brief.mjs [path-to-brief.txt]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const briefPath =
  process.argv[2] ||
  path.join(
    process.env.USERPROFILE || "",
    ".grok/sessions/F%3A%5Ccreatornivo/019f505d-6680-70f1-adb8-cb5fadaff5be/prompts/prompt_32.txt",
  );

const keys = [
  "brandOrCompany",
  "offerName",
  "offerType",
  "primaryGoal",
  "targetAudience",
  "coreProblem",
  "mainPromise",
  "primaryCta",
  "destinationUrl",
  "outputLanguage",
  "pageLength",
  "audienceContext",
  "desiredOutcome",
  "keyDifferentiators",
  "awarenessLevel",
  "mainObjections",
  "alternativesContext",
  "keyBenefits",
  "featuresOrDeliverables",
  "pricingAndTerms",
  "conversionPath",
  "secondaryCta",
  "timeSensitiveOffer",
  "deadlineOrScarcityDetails",
  "brandVoice",
  "brandStyleNotes",
  "proofAvailable",
  "proofDetails",
  "regulatedTopic",
  "jurisdiction",
  "restrictionsAndDisclosures",
  "privacyOrDataNotes",
  "primaryKeyword",
  "supportingKeywords",
  "faqMode",
  "additionalContext",
];

const p = fs.readFileSync(briefPath, "utf8");

function extractFieldBlock(key) {
  const candidates = [
    "Field key:\n`" + key + "`",
    "Field key:\n" + key,
    "`" + key + "`",
  ];
  let idx = -1;
  for (const c of candidates) {
    idx = p.indexOf(c);
    if (idx >= 0) break;
  }
  if (idx < 0) return "";
  const start = Math.max(p.lastIndexOf("### Field", idx), idx - 30);
  const nextField = p.indexOf("### Field", idx + 1);
  const nextKey = p.indexOf("\nField key:", idx + 20);
  const nextSection = p.indexOf("## 5.", idx);
  let end = p.length;
  if (nextField > 0) end = Math.min(end, nextField);
  if (nextKey > 0) end = Math.min(end, nextKey);
  if (nextSection > 0) end = Math.min(end, nextSection);
  return p.slice(start > 0 ? start : idx, end);
}

function grabBare(block, label) {
  const re = new RegExp(
    "(?:^|\\n)" +
      label +
      ":\\n([\\s\\S]*?)(?=\\n[A-Z][A-Za-z /&-]+:\\n|\\n### |\\n## |\\nField |$)",
  );
  const m = block.match(re);
  if (!m) return "";
  return (
    m[1]
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l) || ""
  );
}

function grabOptions(block) {
  const i = block.indexOf("\nOptions:\n");
  if (i < 0) return [];
  const opts = [];
  for (const line of block.slice(i + 1).split("\n")) {
    const t = line.trim();
    if (t.startsWith("* ")) {
      const v = t.slice(2).trim();
      if (v === "Not applicable") return [];
      opts.push(v);
      continue;
    }
    if (
      opts.length &&
      (t.startsWith("Display condition:") ||
        t.startsWith("Why this field") ||
        t.startsWith("Maximum length:") ||
        t.startsWith("Helper text:") ||
        t.startsWith("Field key:") ||
        t.startsWith("###"))
    )
      break;
  }
  return opts;
}

const fields = keys.map((key) => {
  const block = extractFieldBlock(key);
  return {
    key,
    label: grabBare(block, "Label") || key,
    group: grabBare(block, "Group") || "Essentials",
    type: grabBare(block, "Type") || "text",
    required: grabBare(block, "Required") === "Yes",
    default: grabBare(block, "Default") || "Blank",
    placeholder: grabBare(block, "Placeholder") || "",
    helper: grabBare(block, "Helper text") || "",
    options: grabOptions(block),
    why: grabBare(block, "Why this field is needed") || "",
    blockLen: block.length,
  };
});

const out = path.join(
  root,
  "agent-tools",
  "landing-page-copy-schema-parsed.json",
);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(fields, null, 2), "utf8");
console.log("Wrote", out);
for (const f of fields) {
  console.log(
    f.key,
    "|",
    f.type,
    "|",
    f.group,
    "| req=",
    f.required,
    "| opts=",
    f.options.length,
    "| def=",
    (f.default || "").slice(0, 35),
    "| bl=",
    f.blockLen,
  );
}
