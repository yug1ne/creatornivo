/**
 * Parse FAQ Page brief into schema JSON.
 * Usage: node scripts/parse-faq-page-brief.mjs [path-to-brief.txt]
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
    ".grok/sessions/F%3A%5Ccreatornivo/019f505d-6680-70f1-adb8-cb5fadaff5be/prompts/prompt_11.txt",
  );

const keys = [
  "faqSubject",
  "organizationName",
  "faqPageType",
  "primaryGoal",
  "targetAudience",
  "priorityQuestions",
  "confirmedFacts",
  "outputLanguage",
  "answerDepth",
  "pageLength",
  "introPreference",
  "additionalContext",
  "faqScope",
  "existingQuestions",
  "questionCount",
  "categoryPreference",
  "journeyStages",
  "objectionAreas",
  "excludedTopics",
  "brandVoice",
  "tone",
  "preferredTerms",
  "avoidWording",
  "ctaGoal",
  "ctaText",
  "ctaDestination",
  "primaryKeyword",
  "secondaryKeywords",
  "searchIntent",
  "pageTitleNotes",
  "metaDescriptionNotes",
  "structuredDataMode",
  "canonicalPageUrl",
  "publishingFormat",
  "regulatedTopic",
  "jurisdiction",
  "officialPolicies",
  "sourceReferences",
  "changeSensitiveDetails",
  "privacyRestrictions",
  "prohibitedClaims",
  "escalationRoute",
];

const p = fs.readFileSync(briefPath, "utf8");

function extractFieldBlock(key) {
  const needle = "`" + key + "`";
  let idx = p.indexOf(needle);
  if (idx < 0) {
    idx = p.indexOf("Field key:\n" + key);
    if (idx < 0) idx = p.indexOf(key);
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
  let i = block.indexOf(marker);
  if (i < 0) {
    // bare Label: style without bold
    const bare = label + ":\n";
    i = block.indexOf(bare);
    if (i < 0) return "";
    for (const line of block.slice(i + bare.length).split("\n")) {
      const t = line.trim();
      if (!t) continue;
      if (/^[A-Z][a-z]+ [a-z]+:$/.test(t) || t.startsWith("###") || t.startsWith("Field "))
        break;
      if (t.endsWith(":") && t.length < 40) break;
      return t;
    }
    return "";
  }
  for (const line of block.slice(i + marker.length).split("\n")) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith("**")) break;
    return t;
  }
  return "";
}

function grabBare(block, label) {
  // Spec uses "Label:\nValue" without markdown bold
  const re = new RegExp(
    "(?:^|\\n)" + label + ":\\n([\\s\\S]*?)(?=\\n[A-Z][A-Za-z /&-]+:\\n|\\n### |\\n## |$)",
  );
  const m = block.match(re);
  if (!m) return "";
  const body = m[1].trim();
  // first non-empty line for simple fields
  return body;
}

function grabField(block, labels) {
  for (const label of labels) {
    const v = grab(block, label);
    if (v) return v;
    const bare = grabBare(block, label);
    if (bare) {
      // return first line for simple values
      const first = bare.split("\n").find((l) => l.trim());
      return first ? first.trim() : bare;
    }
  }
  return "";
}

function grabOptions(block) {
  let i = block.indexOf("**Options:**");
  let body = "";
  if (i >= 0) {
    body = block.slice(i);
  } else {
    i = block.indexOf("\nOptions:\n");
    if (i < 0) return [];
    body = block.slice(i + 1);
  }
  const opts = [];
  for (const line of body.split("\n")) {
    const t = line.trim();
    if (
      t.startsWith("**") &&
      !t.startsWith("**Options") &&
      opts.length > 0
    )
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
  let v = grab(block, "Why this field is needed");
  if (v) return v;
  const bare = grabBare(block, "Why this field is needed");
  if (!bare) return "";
  return bare.split("\n")[0].trim();
}

function grabMultiLine(block, label) {
  const bare = grabBare(block, label);
  if (!bare) return grab(block, label);
  return bare;
}

const fields = keys.map((key) => {
  const block = extractFieldBlock(key);
  const typeRaw = grabField(block, ["Type"]) || "text";
  const requiredRaw = grabField(block, ["Required"]);
  const defaultRaw = grabMultiLine(block, "Default");
  let defaultVal = "Blank";
  if (defaultRaw && !defaultRaw.startsWith("Blank")) {
    // multi-select defaults may be bullet list
    if (defaultRaw.includes("* ")) {
      defaultVal = defaultRaw
        .split("\n")
        .map((l) => l.replace(/^\*\s+/, "").trim())
        .filter(Boolean)
        .join("\n");
    } else {
      defaultVal = defaultRaw.split("\n")[0].trim();
    }
  }

  return {
    key,
    label: grabField(block, ["Label"]) || key,
    group: grabField(block, ["Group"]) || "Essentials",
    type: typeRaw,
    required: requiredRaw === "Yes",
    default: defaultVal,
    placeholder: grabField(block, ["Placeholder"]) || "",
    helper: grabField(block, ["Helper text"]) || "",
    options: grabOptions(block),
    why: grabWhy(block),
    display: grabField(block, ["Display condition"]),
    blockLen: block.length,
  };
});

const out = path.join(root, "agent-tools", "faq-page-schema-parsed.json");
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
