/**
 * Parse LinkedIn Post compact brief into schema JSON.
 * Usage: node scripts/parse-linkedin-post-brief.mjs [path-to-brief.txt]
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
    ".grok/sessions/F%3A%5Ccreatornivo/019f505d-6680-70f1-adb8-cb5fadaff5be/prompts/prompt_16.txt",
  );

const keys = [
  "subjectOrOffer",
  "primaryGoal",
  "targetAudience",
  "coreMessage",
  "essentialFacts",
  "postFormat",
  "desiredAction",
  "outputLanguage",
  "lengthPreference",
  "authorPerspective",
  "audienceContext",
  "audienceProblem",
  "credibilityContext",
  "readerObjections",
  "tone",
  "brandVoice",
  "emojiUse",
  "hashtagUse",
  "sourceMaterial",
  "linkUrl",
  "affiliationDisclosure",
  "privacyRestrictions",
  "claimsToAvoid",
  "additionalContext",
];

const p = fs.readFileSync(briefPath, "utf8");

function extractFieldBlock(key) {
  const needle = "`" + key + "`";
  let idx = p.indexOf(needle);
  if (idx < 0) {
    idx = p.indexOf(key);
    if (idx < 0) return "";
  }
  const start = p.lastIndexOf("### Field", idx);
  const nextField = p.indexOf("### Field", idx + 1);
  const nextSection = p.indexOf("## 5.", idx);
  let end = p.length;
  if (nextField > 0) end = Math.min(end, nextField);
  if (nextSection > 0) end = Math.min(end, nextSection);
  return p.slice(start > 0 ? start : idx, end);
}

function grab(block, label) {
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

function grabOptions(block) {
  const i = block.indexOf("**Options:**");
  if (i < 0) return [];
  const opts = [];
  for (const line of block.slice(i).split("\n")) {
    const t = line.trim();
    if (t.startsWith("**") && !t.startsWith("**Options")) break;
    if (t.startsWith("* ")) {
      const v = t.slice(2).trim();
      if (v === "Not applicable") return [];
      opts.push(v);
    }
  }
  return opts;
}

function grabWhy(block) {
  const marker = "**Why this field is needed:**";
  const i = block.indexOf(marker);
  if (i < 0) return "";
  for (const line of block.slice(i + marker.length).split("\n")) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith("**") || t.startsWith("---") || t.startsWith("###")) break;
    return t;
  }
  return "";
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

const out = path.join(root, "agent-tools", "linkedin-post-schema-parsed.json");
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
    f.default,
  );
}
