/**
 * Parse YouTube Script brief into schema JSON.
 * Usage: node scripts/parse-youtube-script-brief.mjs [path-to-brief.txt]
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
    ".grok/sessions/F%3A%5Ccreatornivo/019f505d-6680-70f1-adb8-cb5fadaff5be/prompts/prompt_38.txt",
  );

const keys = [
  "videoTopic",
  "primaryGoal",
  "targetAudience",
  "centralPromise",
  "mustInclude",
  "videoFormat",
  "outputLanguage",
  "targetDurationMinutes",
  "audienceKnowledge",
  "toneStyle",
  "narratorVoice",
  "primaryCTA",
  "contentAngle",
  "keySections",
  "openingStyle",
  "narrativeStructure",
  "pacing",
  "retentionDevices",
  "examplesStories",
  "objectionsQuestions",
  "channelContext",
  "brandVoice",
  "hostPresence",
  "availableVisuals",
  "bRollDirection",
  "onScreenText",
  "editingIntensity",
  "titleDirection",
  "primaryKeyword",
  "supportingKeywords",
  "includeDescription",
  "includeChapters",
  "includePinnedComment",
  "sourceMaterial",
  "commercialRelationship",
  "sponsorOrOfferDetails",
  "disclosureRequirements",
  "regulatedTopic",
  "jurisdiction",
  "restrictionsAndAdditionalContext",
];

const p = fs.readFileSync(briefPath, "utf8");

function extractFieldBlock(key) {
  const candidates = [
    "Field key:\n" + key,
    "Field key:\n`" + key + "`",
    "**Field key:**\n`" + key + "`",
    "**Field key:**\n" + key,
  ];
  let idx = -1;
  for (const c of candidates) {
    idx = p.indexOf(c);
    if (idx >= 0) break;
  }
  if (idx < 0) {
    idx = p.indexOf("\n" + key + "\n");
    if (idx < 0) return "";
  }
  const start = Math.max(p.lastIndexOf("### Field", idx), idx - 40);
  const nextField = p.indexOf("### Field", idx + 1);
  const nextKey = p.indexOf("\nField key:", idx + 15);
  const nextSection = p.indexOf("## 5.", idx);
  let end = p.length;
  if (nextField > 0) end = Math.min(end, nextField);
  if (nextKey > 0) end = Math.min(end, nextKey);
  if (nextSection > 0) end = Math.min(end, nextSection);
  return p.slice(start > 0 ? start : idx, end);
}

function grab(block, label) {
  const bold = "**" + label + ":**";
  let i = block.indexOf(bold);
  if (i >= 0) {
    for (const line of block.slice(i + bold.length).split("\n")) {
      const t = line.trim();
      if (!t) continue;
      if (t.startsWith("**")) break;
      return t;
    }
  }
  const re = new RegExp(
    "(?:^|\\n)" +
      label +
      ":\\n([\\s\\S]*?)(?=\\n[A-Z*][A-Za-z /&*-]*:\\n|\\n### |\\n## |\\nField |$)",
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
    if (t.startsWith("* ")) {
      const v = t.slice(2).trim();
      if (v === "Not applicable") return [];
      opts.push(v);
      continue;
    }
    if (
      opts.length &&
      (t.startsWith("**") ||
        t.startsWith("Display condition:") ||
        t.startsWith("Why this field") ||
        t.startsWith("Maximum length:") ||
        t.startsWith("Helper text:") ||
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
    label: grab(block, "Label") || key,
    group: grab(block, "Group") || "Essentials",
    type: grab(block, "Type") || "text",
    required: grab(block, "Required") === "Yes",
    default: grab(block, "Default") || "Blank",
    placeholder: grab(block, "Placeholder") || "",
    helper: grab(block, "Helper text") || "",
    options: grabOptions(block),
    why: grab(block, "Why this field is needed") || "",
    blockLen: block.length,
  };
});

const out = path.join(
  root,
  "agent-tools",
  "youtube-script-schema-parsed.json",
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
    (f.default || "").slice(0, 30),
    "| bl=",
    f.blockLen,
  );
}
