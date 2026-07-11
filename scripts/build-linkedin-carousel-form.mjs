/**
 * Builds LinkedIn Carousel form schema from the internal prompt (36 fields).
 * Does NOT modify the prompt text — only form metadata for UX.
 *
 * Usage: node scripts/build-linkedin-carousel-form.mjs
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
  "linkedin-carousel.txt",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "linkedin-carousel-variables.json",
);

function extractVars(prompt) {
  const set = new Set();
  const re = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  let m;
  while ((m = re.exec(prompt))) set.add(m[1]);
  return [...set];
}

const GROUP_MAP = {
  essentials: {
    id: "essentials",
    title: "Essentials",
    description:
      "Topic, goal, audience, takeaway, key info, structure, publisher, slides, CTA, tone, language.",
    defaultOpen: true,
  },
  content: {
    id: "content",
    title: "Content & Proof",
    description:
      "Category, sources, proof, story, offer, URL, must-include, restrictions.",
    defaultOpen: false,
  },
  visual: {
    id: "visual",
    title: "Brand & Visual",
    description:
      "Brand voice, visual system, format, imagery, colors, attribution, emoji.",
    defaultOpen: false,
  },
  caption: {
    id: "caption",
    title: "Caption & Output",
    description:
      "Caption length, hashtags, cover hooks, accessibility, design notes.",
    defaultOpen: false,
  },
  compliance: {
    id: "compliance",
    title: "Compliance",
    description:
      "Jurisdiction, disclosure, compliance notes, and privacy restrictions.",
    defaultOpen: false,
  },
};

const REQUIRED = new Set([
  "carouselTopic",
  "primaryGoal",
  "targetAudience",
  "coreMessage",
  "keyInformation",
  "outputLanguage",
]);

const SHOW_WHEN = {
  customHashtags: {
    key: "hashtagMode",
    equals: "Custom",
  },
};

const FIELDS = [
  {
    key: "carouselTopic",
    label: "Carousel topic",
    group: "essentials",
    type: "textarea",
    placeholder: "What professional topic will this document carousel cover?",
    helper: "One clear subject — not several unrelated ideas.",
    why: "Defines the carousel’s central subject.",
    example: "How small teams write honest product updates",
    avoid: "Vague multi-topic briefs.",
  },
  {
    key: "primaryGoal",
    label: "Primary goal",
    group: "essentials",
    type: "select",
    default: "Educate",
    placeholder: "Select the main outcome",
    helper: "One dominant goal for structure and CTA.",
    options: [
      "Educate",
      "Build authority",
      "Share a framework",
      "Support a launch",
      "Promote an offer",
      "Start a discussion",
      "Document a process",
      "Correct a misconception",
    ],
    why: "Determines progression and final CTA intensity.",
  },
  {
    key: "targetAudience",
    label: "Target audience",
    group: "essentials",
    type: "textarea",
    placeholder: "Who should read this on LinkedIn?",
    helper: "Professional role, context, and knowledge level.",
    why: "Shapes vocabulary, examples, and depth.",
  },
  {
    key: "coreMessage",
    label: "Core takeaway",
    group: "essentials",
    type: "textarea",
    placeholder: "What should readers remember after the last slide?",
    helper: "One central takeaway, not a list of competing messages.",
    why: "Keeps every slide aligned to one outcome.",
  },
  {
    key: "keyInformation",
    label: "Key information",
    group: "essentials",
    type: "textarea",
    placeholder: "Facts, steps, points, or arguments the slides must cover",
    helper: "Only accurate, approved information.",
    why: "Factual basis for slide content — no invention.",
  },
  {
    key: "carouselType",
    label: "Carousel structure",
    group: "essentials",
    type: "select",
    default: "Auto",
    placeholder: "Choose a structure",
    helper: "Auto picks a structure from topic and goal.",
    options: [
      "Auto",
      "Step-by-step guide",
      "Mistakes and fixes",
      "Framework",
      "Checklist",
      "Story and lesson",
      "Case-study breakdown",
      "Myth versus reality",
      "Opinion and argument",
    ],
    why: "Different structures need different slide roles.",
  },
  {
    key: "publisherType",
    label: "Publishing as",
    group: "essentials",
    type: "select",
    default: "Personal profile",
    placeholder: "Who is publishing?",
    helper: "Controls first person vs organizational voice.",
    options: [
      "Personal profile",
      "Company Page",
      "Employee advocate",
      "Independent publication",
    ],
    why: "Perspective must match the real publisher type.",
  },
  {
    key: "slideCount",
    label: "Slide count",
    group: "essentials",
    type: "select",
    default: "8",
    placeholder: "6–15 slides including cover and close",
    helper: "Includes cover + development + final slide.",
    options: ["6", "7", "8", "9", "10", "11", "12", "13", "14", "15"],
    why: "Controls depth without padding weak ideas.",
  },
  {
    key: "ctaObjective",
    label: "CTA objective",
    group: "essentials",
    type: "select",
    default: "Auto",
    placeholder: "What should readers do next?",
    helper: "Auto chooses the least promotional action that fits the goal.",
    options: [
      "Auto",
      "No CTA",
      "Invite discussion",
      "Visit a link",
      "Download a resource",
      "Follow for more",
      "Book a call",
      "Try or buy",
    ],
    why: "Final slide and caption CTA must stay proportional.",
  },
  {
    key: "tone",
    label: "Tone",
    group: "essentials",
    type: "select",
    default: "Clear and natural",
    placeholder: "Select tone",
    helper: "Professional LinkedIn voice without hype.",
    options: [
      "Clear and natural",
      "Educational",
      "Authoritative",
      "Conversational",
      "Analytical",
      "Warm and human",
      "Direct",
    ],
    why: "Tone changes how the same facts are received.",
  },
  {
    key: "outputLanguage",
    label: "Output language",
    group: "essentials",
    type: "text",
    default: "English",
    placeholder: "English",
    helper: "Language for slides, caption, and notes.",
    why: "Cannot always be inferred from the topic.",
  },
  {
    key: "topicCategory",
    label: "Topic category",
    group: "content",
    type: "select",
    default: "General professional",
    placeholder: "Select when high-stakes content applies",
    helper: "Activates extra caution for regulated subjects.",
    options: [
      "General professional",
      "Health or medical",
      "Legal",
      "Financial",
      "Employment",
      "Child safety",
      "Political or public policy",
      "Other regulated",
    ],
    why: "High-stakes topics need cautious wording.",
  },
  {
    key: "sourceMaterial",
    label: "Source material",
    group: "content",
    type: "textarea",
    placeholder: "Notes, research excerpts, product docs, approved drafts",
    helper: "Paste only material the slides may use.",
    why: "Improves accuracy without inventing evidence.",
  },
  {
    key: "proofPoints",
    label: "Verified proof points",
    group: "content",
    type: "textarea",
    placeholder: "Only verified stats, results, or credentials",
    helper: "Include context and measurement periods when known.",
    why: "Prevents fabricated social proof or metrics.",
  },
  {
    key: "examplesOrStory",
    label: "Example or story",
    group: "content",
    type: "textarea",
    placeholder: "Approved anecdote or example only",
    helper: "Do not invent first-hand experience.",
    why: "Story slides need real supplied narrative material.",
  },
  {
    key: "offerOrResource",
    label: "Offer or resource",
    group: "content",
    type: "textarea",
    placeholder: "Real offer, resource, or next step if promotional",
    helper: "Only confirmed commercial or resource details.",
    why: "CTA must not invent products or freebies.",
  },
  {
    key: "destinationUrl",
    label: "Destination URL",
    group: "content",
    type: "text",
    placeholder: "https://www.creatornivo.com/…",
    helper: "Only a real URL — never invented.",
    why: "Links must be accurate when used in caption or final slide.",
  },
  {
    key: "mustInclude",
    label: "Must include",
    group: "content",
    type: "textarea",
    placeholder: "Required points, terms, or sections",
    helper: "Non-negotiable content that must appear.",
    why: "Prevents omission of critical messages.",
  },
  {
    key: "contentRestrictions",
    label: "Content restrictions",
    group: "content",
    type: "textarea",
    placeholder: "Topics, claims, or words to avoid",
    helper: "Brand, legal, or editorial exclusions.",
    why: "User-specific bans cannot be inferred.",
  },
  {
    key: "brandVoice",
    label: "Brand voice",
    group: "visual",
    type: "textarea",
    placeholder: "How this brand or author usually sounds",
    helper: "Leave blank for a natural professional voice.",
    why: "Distinctive voice cannot be guessed from topic alone.",
  },
  {
    key: "visualStyle",
    label: "Visual style",
    group: "visual",
    type: "select",
    default: "Auto",
    placeholder: "Overall design system",
    helper: "Auto = clean professional hierarchy.",
    options: [
      "Auto",
      "Minimal clean",
      "Bold editorial",
      "Data-led",
      "Soft professional",
      "High contrast",
    ],
    why: "Keeps slide system consistent.",
  },
  {
    key: "aspectRatio",
    label: "Slide format",
    group: "visual",
    type: "select",
    default: "1:1",
    placeholder: "Page aspect ratio",
    helper: "Common LinkedIn document formats.",
    options: ["1:1", "4:5", "16:9", "Auto"],
    why: "Affects layout recommendations.",
  },
  {
    key: "imageryStyle",
    label: "Imagery preference",
    group: "visual",
    type: "select",
    default: "Icons and simple diagrams",
    placeholder: "What kind of visuals?",
    helper: "Do not request stock photos of fake customers.",
    options: [
      "Icons and simple diagrams",
      "Typography-led",
      "Charts only with real data",
      "Product screenshots if supplied",
      "Illustration",
      "Photo only if real asset exists",
      "Auto",
    ],
    why: "Visual direction must stay producible and honest.",
  },
  {
    key: "brandColors",
    label: "Brand colors",
    group: "visual",
    type: "text",
    placeholder: "e.g. #0F172A, #2563EB — or leave blank",
    helper: "Hex or named brand colors if known.",
    why: "Supports consistent production notes.",
  },
  {
    key: "attributionName",
    label: "Name or attribution",
    group: "visual",
    type: "text",
    placeholder: "Optional subtle footer name",
    helper: "Subtle only — not a long signature every slide.",
    why: "Attribution must match real identity.",
  },
  {
    key: "emojiUse",
    label: "Emoji use",
    group: "visual",
    type: "select",
    default: "None",
    placeholder: "Emoji policy",
    helper: "Usually none on slides; minimal in caption if any.",
    options: ["None", "Minimal", "Moderate"],
    why: "Emoji preference varies by brand.",
  },
  {
    key: "captionLength",
    label: "Caption length",
    group: "caption",
    type: "select",
    default: "Standard",
    placeholder: "Accompanying LinkedIn caption depth",
    helper: "Short ~300–600, Standard ~600–1200, Detailed ~1200–2000 chars.",
    options: ["Short", "Standard", "Detailed"],
    why: "Caption complements slides without repeating them.",
  },
  {
    key: "hashtagMode",
    label: "Hashtag mode",
    group: "caption",
    type: "select",
    default: "Auto",
    placeholder: "How hashtags should be handled",
    helper: "Auto suggests 0–5 relevant tags; Custom uses only your list.",
    options: ["None", "Auto", "Custom"],
    why: "Hashtag strategy is account-specific.",
  },
  {
    key: "customHashtags",
    label: "Custom hashtags",
    group: "caption",
    type: "text",
    placeholder: "#BrandTag #TopicTag",
    helper: "Shown when Hashtag mode is Custom.",
    why: "Campaign tags must not be invented when Custom is selected.",
  },
  {
    key: "coverHookCount",
    label: "Cover hook options",
    group: "caption",
    type: "select",
    default: "3",
    placeholder: "How many cover options to generate",
    helper: "Distinct angles, not one-word swaps.",
    options: ["1", "2", "3", "4", "5"],
    why: "Gives cover alternatives without noise.",
  },
  {
    key: "includeAltText",
    label: "Accessibility text",
    group: "caption",
    type: "select",
    default: "Off",
    placeholder: "Include accessibility summary?",
    helper: "Document summary + optional per-slide notes when visuals add meaning.",
    options: ["Off", "On"],
    why: "Supports accessible PDF / publishing workflows.",
  },
  {
    key: "includeDesignNotes",
    label: "Design notes",
    group: "caption",
    type: "select",
    default: "On",
    placeholder: "Include production notes per slide?",
    helper: "Layout, hierarchy, and visual device guidance.",
    options: ["Off", "On"],
    why: "Helps designers produce the document consistently.",
  },
  {
    key: "jurisdiction",
    label: "Relevant jurisdiction",
    group: "compliance",
    type: "text",
    placeholder: "e.g. United Kingdom, EU — only if needed",
    helper: "For high-stakes topics that vary by region.",
    why: "Avoids false universal legal/medical claims.",
  },
  {
    key: "requiredDisclosure",
    label: "Required disclosure",
    group: "compliance",
    type: "textarea",
    placeholder: "Exact sponsorship / affiliation wording if required",
    helper: "Included nearly verbatim when supplied.",
    why: "Commercial relationships must be transparent.",
  },
  {
    key: "complianceNotes",
    label: "Claims and compliance notes",
    group: "compliance",
    type: "textarea",
    placeholder: "Claim limits, required caveats, review needs",
    helper: "Anything reviewers must respect.",
    why: "Prevents overclaiming on regulated subjects.",
  },
  {
    key: "privacyRestrictions",
    label: "Privacy restrictions",
    group: "compliance",
    type: "textarea",
    placeholder: "Names, clients, metrics, or data that must not appear",
    helper: "Omit or generalize protected details.",
    why: "Protects confidential and personal information.",
  },
];

function mapType(t) {
  if (t === "textarea") return "textarea";
  if (t === "select") return "select";
  if (t === "number") return "number";
  return "text";
}

function buildField(raw) {
  const groupMeta = GROUP_MAP[raw.group] || GROUP_MAP.essentials;
  const type = mapType(raw.type);
  const help = {
    what: raw.label + ".",
    why: raw.why || raw.helper || `Used as ${raw.key} in the carousel brief.`,
    example:
      raw.example ||
      raw.default ||
      raw.placeholder ||
      "A short factual value you can verify.",
    avoid:
      raw.avoid ||
      "Invented stats, fake social proof, engagement bait, or private data.",
  };

  const field = {
    key: raw.key,
    label: raw.label,
    placeholder: raw.placeholder || "Optional — leave blank if unknown",
    required: REQUIRED.has(raw.key),
    type,
    group: groupMeta.id,
    groupTitle: groupMeta.title,
    hint: raw.helper || help.what,
    help,
    fullWidth: type === "textarea",
  };

  if (raw.options?.length) field.options = raw.options;
  if (raw.default) field.defaultValue = raw.default;
  if (SHOW_WHEN[raw.key]) field.showWhen = SHOW_WHEN[raw.key];

  return field;
}

function main() {
  const prompt = fs.readFileSync(promptPath, "utf8");
  const promptKeys = new Set(extractVars(prompt));

  if (FIELDS.length !== 36) {
    console.warn(`Expected 36 fields, got ${FIELDS.length}`);
  }

  const fields = FIELDS.map(buildField);

  for (const f of fields) {
    if (!promptKeys.has(f.key)) console.warn(`Schema missing from prompt: ${f.key}`);
  }
  for (const k of promptKeys) {
    if (!fields.some((f) => f.key === k))
      console.warn(`Prompt missing from schema: ${k}`);
  }

  const used = new Set(fields.map((f) => f.group));
  const groups = Object.values(GROUP_MAP).filter((g) => used.has(g.id));

  const payload = {
    slug: "linkedin-carousel",
    title: "LinkedIn Carousel",
    version: 1,
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
