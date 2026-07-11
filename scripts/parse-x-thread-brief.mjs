/**
 * Parse X Thread compact brief into schema JSON.
 * Usage: node scripts/parse-x-thread-brief.mjs [path-to-brief.txt]
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
    ".grok/sessions/F%3A%5Ccreatornivo/019f505d-6680-70f1-adb8-cb5fadaff5be/prompts/prompt_26.txt",
  );

const keys = [
  "topicAndAngle",
  "primaryGoal",
  "targetAudience",
  "keyPointsAndFacts",
  "outputLanguage",
  "sourceMaterial",
  "threadType",
  "threadLength",
  "centralTakeaway",
  "hookStyle",
  "depthLevel",
  "narrativePerspective",
  "threadNumbering",
  "endingStyle",
  "tone",
  "brandVoice",
  "ctaMode",
  "ctaDetails",
  "destinationUrl",
  "commercialRelationship",
  "disclosureText",
  "sensitiveTopic",
  "claimsAndRestrictions",
  "additionalContext",
];

const p = fs.readFileSync(briefPath, "utf8");

function extractFieldBlock(key) {
  const needle = "Field key:\n`" + key + "`";
  let idx = p.indexOf(needle);
  if (idx < 0) {
    idx = p.indexOf("Field key:\n" + key);
    if (idx < 0) idx = p.indexOf("`" + key + "`");
    if (idx < 0) idx = p.indexOf(key);
    if (idx < 0) return "";
  }
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

function grabBold(block, label) {
  const marker = "**" + label + ":**";
  const i = block.indexOf(marker);
  if (i < 0) return "";
  for (const line of block.slice(i + marker.length).split("\n")) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith("**")) break;
    return t;
  }
  return "";
}

function grabBare(block, label) {
  const re = new RegExp(
    "(?:^|\\n)" +
      label +
      ":\\n([\\s\\S]*?)(?=\\n[A-Z][A-Za-z /&-]+:\\n|\\n### |\\n## |\\nField |$)",
  );
  const m = block.match(re);
  if (!m) return "";
  const first = m[1]
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l);
  return first || "";
}

function grab(block, label) {
  return grabBold(block, label) || grabBare(block, label);
}

function grabOptions(block) {
  let i = block.indexOf("**Options:**");
  let body = "";
  if (i >= 0) body = block.slice(i);
  else {
    i = block.indexOf("\nOptions:\n");
    if (i < 0) return [];
    body = block.slice(i + 1);
  }
  const opts = [];
  for (const line of body.split("\n")) {
    const t = line.trim();
    if (t.startsWith("**") && !t.startsWith("**Options") && opts.length)
      break;
    if (
      opts.length > 0 &&
      (t.startsWith("Display condition:") ||
        t.startsWith("Why this field") ||
        t.startsWith("Maximum length:") ||
        t.startsWith("Helper text:") ||
        t === "Not applicable")
    )
      break;
    if (t.startsWith("* ")) {
      const v = t.slice(2).trim();
      if (v === "Not applicable") return [];
      opts.push(v);
    }
  }
  return opts;
}

function grabWhy(block) {
  return (
    grabBold(block, "Why this field is needed") ||
    grabBare(block, "Why this field is needed")
  );
}

const fields = keys.map((key) => {
  const block = extractFieldBlock(key);
  return {
    key,
    label: grab(block, "Label") || key,
    group: grab(block, "Group") || "Essentials",
    type: grab(block, "Type") || "text",
    required: grab(block, "Required") === "Yes",
    default: grab(block, "Default") || "Blank",
    placeholder: grab(block, "Placeholder") || "",
    helper: grab(block, "Helper text") || "",
    options: grabOptions(block),
    why: grabWhy(block),
    display: grab(block, "Display condition"),
    blockLen: block.length,
  };
});

const out = path.join(root, "agent-tools", "x-thread-schema-parsed.json");
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
    (f.default || "").slice(0, 40),
    "| bl=",
    f.blockLen,
  );
}
