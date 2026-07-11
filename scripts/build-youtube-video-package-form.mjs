/**
 * Builds the YouTube Video Package form schema from the approved 40-field specification.
 * Does NOT modify the prompt text. It verifies that every prompt variable has
 * exactly one form field before writing the form JSON.
 *
 * Usage: node scripts/build-youtube-video-package-form.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const promptPath = path.join(root, "prisma", "template-prompts", "youtube-video-package.txt");
const outPath = path.join(root, "src", "config", "template-forms", "youtube-video-package-variables.json");

const groups = [
  {
    id: "essentials",
    title: "Essentials",
    description:
      "Minimum strategic, factual, structural, and stylistic information needed to generate a valid YouTube package.",
    defaultOpen: true,
  },
  {
    id: "content_retention",
    title: "Content & Retention",
    description:
      "Opening, viewer problem, required content, examples, supporting materials, and pacing.",
    defaultOpen: false,
  },
  {
    id: "discovery_packaging",
    title: "Discovery & Packaging",
    description:
      "Titles, thumbnail concepts, search positioning, description links, and viewer-facing packaging.",
    defaultOpen: false,
  },
  {
    id: "channel_brand_production",
    title: "Channel, Brand & Production",
    description:
      "Channel context, presenter style, available equipment, visual assets, and editing capacity.",
    defaultOpen: false,
  },
  {
    id: "monetization_safety_final",
    title: "Monetization, Safety & Final Settings",
    description:
      "Commercial relationships, disclosures, high-stakes subjects, privacy restrictions, and final requirements.",
    defaultOpen: false,
  },
];

const fieldSpecs = [
  {
    key: "videoTopic",
    label: "Video topic or offer",
    group: "essentials",
    type: "textarea",
    required: true,
    placeholder:
      "Describe what the video is about, including any product, subject, event, or question it covers.",
    hint:
      "Give enough context to distinguish this video from other content on the same general topic.",
    why:
      "It establishes the central subject and factual scope of the entire package.",
    maxLength: 1200,
    fullWidth: true,
  },
  {
    key: "primaryGoal",
    label: "Primary goal",
    group: "essentials",
    type: "select",
    required: true,
    placeholder: "Choose the main outcome for this video.",
    hint:
      "Select the single most important result rather than several competing objectives.",
    why: "The goal determines the video angle, CTA, pacing, and publishing package.",
    maxLength: 40,
    options: [
      "Educate or explain",
      "Attract search traffic",
      "Build authority",
      "Increase engagement",
      "Generate leads or sales",
      "Launch or announce",
      "Entertain or tell a story",
      "Support existing customers",
    ],
  },
  {
    key: "targetAudience",
    label: "Target audience",
    group: "essentials",
    type: "textarea",
    required: true,
    placeholder:
      "Who should watch this, and what do they already know about the topic?",
    hint:
      "Include experience level, situation, needs, or relevant audience characteristics.",
    why:
      "Audience knowledge and motivation materially affect explanations, examples, tone, and packaging.",
    maxLength: 800,
    fullWidth: true,
  },
  {
    key: "keyMessage",
    label: "Main viewer takeaway",
    group: "essentials",
    type: "textarea",
    required: true,
    placeholder:
      "What should viewers understand, remember, believe, or be able to do after watching?",
    hint: "Focus on one central promise or conclusion.",
    why:
      "It prevents the video from becoming an unfocused collection of loosely connected points.",
    maxLength: 700,
    fullWidth: true,
  },
  {
    key: "essentialFacts",
    label: "Essential facts",
    group: "essentials",
    type: "textarea",
    required: true,
    placeholder:
      "Add the facts, features, dates, claims, prices, results, or details that must remain accurate.",
    hint:
      "Include only confirmed information; unsupported details will not be invented.",
    why: "It provides the approved factual foundation for the script and metadata.",
    maxLength: 2000,
    fullWidth: true,
  },
  {
    key: "videoFormat",
    label: "Video format",
    group: "essentials",
    type: "select",
    required: true,
    placeholder: "Choose the closest video format.",
    hint:
      "Choose the format that best fits the video the package should help create.",
    why:
      "Different formats require different structures, pacing, packaging, and production notes.",
    maxLength: 40,
    options: [
      "Tutorial or how-to",
      "Educational explainer",
      "Commentary or analysis",
      "Review or comparison",
      "Story or case study",
      "List or roundup",
      "Product or service video",
      "Interview or podcast-style",
      "Other",
    ],
  },
  {
    key: "scriptDepth",
    label: "Script format",
    group: "essentials",
    type: "select",
    required: true,
    placeholder: "Choose how detailed the recording material should be.",
    hint: "Select whether you need a full script, outline, or hybrid deliverable.",
    why: "It controls the main production asset and prevents over- or under-scripting.",
    maxLength: 40,
    options: [
      "Full script",
      "Detailed outline",
      "Hybrid script + talking points",
    ],
  },
  {
    key: "targetDuration",
    label: "Target duration",
    group: "essentials",
    type: "select",
    required: true,
    placeholder: "Choose the intended video length.",
    hint: "The script or outline will be sized to this duration when the topic supports it.",
    why:
      "Duration affects depth, pacing, section count, script length, and chapter planning.",
    maxLength: 20,
    options: [
      "Under 3 minutes",
      "3–5 minutes",
      "5–8 minutes",
      "8–12 minutes",
      "12–20 minutes",
      "20–30 minutes",
      "30–45 minutes",
      "More than 45 minutes",
    ],
  },
  {
    key: "outputLanguage",
    label: "Output language",
    group: "essentials",
    type: "text",
    required: false,
    defaultValue: "English",
    placeholder: "Example: English, Ukrainian, Spanish, or Brazilian Portuguese.",
    hint: "Specify the language and regional variant if relevant.",
    why:
      "The language affects script rhythm, title wording, description style, and speaking-length estimates.",
    maxLength: 60,
  },
  {
    key: "toneStyle",
    label: "Tone",
    group: "essentials",
    type: "select",
    required: false,
    defaultValue: "Clear and natural",
    placeholder: "Choose the overall style.",
    hint: "Use Brand-defined only when you provide brand voice details.",
    why:
      "The tone guides the script, titles, description, CTA, and presenter language.",
    maxLength: 40,
    options: [
      "Clear and natural",
      "Conversational",
      "Energetic",
      "Calm and expert",
      "Direct and practical",
      "Story-driven",
      "Analytical",
      "Humorous",
      "Brand-defined",
    ],
  },
  {
    key: "channelContext",
    label: "Channel context",
    group: "essentials",
    type: "textarea",
    required: false,
    placeholder:
      "Describe the channel niche, usual audience, content style, or where this video fits.",
    hint:
      "Leave blank if this is a standalone package and no channel context matters.",
    why:
      "It helps align the package with existing audience expectations and channel positioning.",
    maxLength: 700,
    fullWidth: true,
  },
  {
    key: "primaryCTA",
    label: "Primary call to action",
    group: "essentials",
    type: "textarea",
    required: false,
    defaultValue: "Auto",
    placeholder:
      "Example: subscribe, watch another video, download a checklist, book a demo, or leave a comment.",
    hint:
      "Write Auto if the model should choose one proportional CTA from the goal and context.",
    why:
      "A complete package needs one clear next step without stacking competing actions.",
    maxLength: 300,
    fullWidth: true,
  },
  {
    key: "viewerProblem",
    label: "Viewer problem or desire",
    group: "content_retention",
    type: "textarea",
    required: false,
    placeholder:
      "Describe the problem, desire, confusion, question, or motivation that makes viewers care.",
    hint: "Use this when the topic needs stronger viewer relevance.",
    why:
      "It sharpens the hook, intro, examples, title angles, and retention map.",
    maxLength: 700,
    fullWidth: true,
  },
  {
    key: "openingDirection",
    label: "Opening approach",
    group: "content_retention",
    type: "select",
    required: false,
    defaultValue: "Auto",
    placeholder: "Choose how the video should open.",
    hint: "Auto selects the strongest opening based on the goal and topic.",
    why: "The opening strongly affects retention and viewer expectation.",
    maxLength: 30,
    options: [
      "Auto",
      "Direct promise",
      "Surprising fact",
      "Viewer question",
      "Cold open",
      "Contrarian angle",
      "Story moment",
      "Demonstration first",
    ],
  },
  {
    key: "mustInclude",
    label: "Required points",
    group: "content_retention",
    type: "textarea",
    required: false,
    placeholder:
      "List points, sections, examples, objections, steps, phrases, or proof that must appear.",
    hint: "Use only for information that must be included.",
    why:
      "It prevents important user-approved material from being omitted from a large package.",
    maxLength: 1500,
    fullWidth: true,
  },
  {
    key: "mustAvoid",
    label: "Things to avoid",
    group: "content_retention",
    type: "textarea",
    required: false,
    placeholder:
      "List claims, phrases, examples, angles, competitors, topics, or production choices to avoid.",
    hint: "Use this for brand, accuracy, privacy, or positioning limits.",
    why:
      "It prevents the script and package from using unwanted or unsafe material.",
    maxLength: 1000,
    fullWidth: true,
  },
  {
    key: "sourceMaterial",
    label: "Sources and reference material",
    group: "content_retention",
    type: "textarea",
    required: false,
    placeholder:
      "Paste source notes, research summaries, approved data, transcript notes, or reference links.",
    hint: "Use only material you are allowed to use; do not paste long copyrighted passages.",
    why:
      "It gives the model supported material for claims and prevents fabricated evidence.",
    maxLength: 4000,
    fullWidth: true,
  },
  {
    key: "storyExamples",
    label: "Stories and examples",
    group: "content_retention",
    type: "textarea",
    required: false,
    placeholder:
      "Add approved anecdotes, examples, customer situations, demos, or case details.",
    hint:
      "Mark examples as hypothetical if they are not real or cannot be verified.",
    why:
      "Stories and examples make long-form videos more concrete and easier to follow.",
    maxLength: 1500,
    fullWidth: true,
  },
  {
    key: "retentionStyle",
    label: "Pacing and retention",
    group: "content_retention",
    type: "select",
    required: false,
    defaultValue: "Balanced",
    placeholder: "Choose the preferred pacing style.",
    hint:
      "This controls transitions, section rhythm, and retention devices without encouraging clickbait.",
    why: "Retention strategy affects structure and delivery across the entire video.",
    maxLength: 30,
    options: [
      "Balanced",
      "Fast-paced",
      "Calm and detailed",
      "Curiosity-driven",
      "Story-led",
      "Demonstration-led",
      "Minimal interruptions",
    ],
  },
  {
    key: "searchIntent",
    label: "Viewer search intent",
    group: "discovery_packaging",
    type: "textarea",
    required: false,
    placeholder:
      "Describe what viewers might search for, compare, solve, learn, or decide before watching.",
    hint: "Leave blank for videos that are not search-led.",
    why:
      "Search intent shapes titles, description wording, keyword themes, and structure.",
    maxLength: 700,
    fullWidth: true,
  },
  {
    key: "targetKeywords",
    label: "Target keywords",
    group: "discovery_packaging",
    type: "textarea",
    required: false,
    placeholder:
      "List approved primary and secondary topic phrases, product terms, or search phrases.",
    hint: "Use natural topic phrases rather than a keyword-stuffing list.",
    why:
      "It guides discovery metadata while keeping title and description wording relevant.",
    maxLength: 800,
    fullWidth: true,
  },
  {
    key: "titleAngle",
    label: "Preferred title angles",
    group: "discovery_packaging",
    type: "textarea",
    required: false,
    placeholder:
      "List preferred angles: Search-led, Curiosity-led, Benefit-led, Problem and solution, Contrarian, Authority-led, Story-led, Comparison-led.",
    hint:
      "Multi-select adapted to textarea: list any applicable title angles, separated by commas.",
    why:
      "It guides title variety without forcing a single packaging style.",
    maxLength: 200,
    fullWidth: true,
    options: [
      "Search-led",
      "Curiosity-led",
      "Benefit-led",
      "Problem and solution",
      "Contrarian",
      "Authority-led",
      "Story-led",
      "Comparison-led",
    ],
  },
  {
    key: "titleVariantCount",
    label: "Number of title options",
    group: "discovery_packaging",
    type: "number",
    required: false,
    defaultValue: "5",
    placeholder: "5",
    hint: "Choose between 3 and 10 title options.",
    why:
      "A complete package needs enough title choices for comparison without generating noise.",
    min: 3,
    max: 10,
  },
  {
    key: "thumbnailStyle",
    label: "Thumbnail direction",
    group: "discovery_packaging",
    type: "select",
    required: false,
    defaultValue: "Clear and specific",
    placeholder: "Choose the preferred thumbnail style.",
    hint: "Thumbnail concepts must accurately represent the video.",
    why: "Thumbnail style affects the visual packaging concepts and title pairing.",
    maxLength: 35,
    options: [
      "Clear and specific",
      "Curiosity gap",
      "Result-focused",
      "Before-and-after concept",
      "Emotional reaction",
      "Object or product focus",
      "Diagram or data focus",
      "Minimal text",
    ],
  },
  {
    key: "packagingRestrictions",
    label: "Title and thumbnail limits",
    group: "discovery_packaging",
    type: "textarea",
    required: false,
    placeholder:
      "List words, visual ideas, promises, thumbnail elements, or title styles that must be avoided.",
    hint: "Use this to prevent misleading, off-brand, or overused packaging.",
    why:
      "It keeps titles and thumbnails accurate, brand-safe, and aligned with constraints.",
    maxLength: 800,
    fullWidth: true,
  },
  {
    key: "descriptionLinks",
    label: "Description links",
    group: "discovery_packaging",
    type: "textarea",
    required: false,
    placeholder:
      "Paste approved URLs, resources, product links, credits, timestamps, or link labels.",
    hint: "Only supplied links may appear in the description or pinned comment.",
    why:
      "The template must not invent URLs, affiliate links, resources, or credits.",
    maxLength: 1800,
    fullWidth: true,
  },
  {
    key: "channelName",
    label: "Channel name",
    group: "channel_brand_production",
    type: "text",
    required: false,
    placeholder: "Example: Creatornivo Studio",
    hint: "Use when the package should reference the channel directly.",
    why: "Channel name can affect intro wording, description, and CTA phrasing.",
    maxLength: 120,
  },
  {
    key: "brandVoice",
    label: "Brand voice",
    group: "channel_brand_production",
    type: "textarea",
    required: false,
    placeholder:
      "Describe voice traits, phrases to use, phrases to avoid, or a short style note.",
    hint: "Use this when the channel has an established voice.",
    why:
      "It helps the script and metadata fit the creator’s existing brand without imitating another creator.",
    maxLength: 1000,
    fullWidth: true,
  },
  {
    key: "presenterStyle",
    label: "Presentation style",
    group: "channel_brand_production",
    type: "select",
    required: false,
    defaultValue: "Auto",
    placeholder: "Choose how the video will be presented.",
    hint: "Auto chooses a suitable style from the brief and available resources.",
    why:
      "Presentation style affects script phrasing, production notes, and visual planning.",
    maxLength: 35,
    options: [
      "Auto",
      "On-camera solo",
      "Voice-over narrator",
      "Screen-recorded tutorial",
      "Interview host",
      "Podcast or conversation",
      "Faceless documentary",
      "Mixed presentation",
    ],
  },
  {
    key: "filmingResources",
    label: "Available production resources",
    group: "channel_brand_production",
    type: "textarea",
    required: false,
    defaultValue: "Basic setup only",
    placeholder:
      "List available resources: Basic setup only, Smartphone or camera, External microphone, Screen recording, Existing footage, Stock footage, Product demonstration, Slides or graphics, Guest or interview.",
    hint:
      "Multi-select adapted to textarea: list the resources actually available.",
    why:
      "Production notes must be feasible with the user’s actual filming and editing resources.",
    maxLength: 300,
    fullWidth: true,
    options: [
      "Basic setup only",
      "Smartphone or camera",
      "External microphone",
      "Screen recording",
      "Existing footage",
      "Stock footage",
      "Product demonstration",
      "Slides or graphics",
      "Guest or interview",
    ],
  },
  {
    key: "visualAssets",
    label: "Existing visual assets",
    group: "channel_brand_production",
    type: "textarea",
    required: false,
    placeholder:
      "Describe screenshots, footage, product images, charts, B-roll, logos, demos, or assets available.",
    hint: "Include only assets you can legally use.",
    why:
      "It allows production notes and thumbnail concepts to use real available visuals.",
    maxLength: 1500,
    fullWidth: true,
  },
  {
    key: "editingComplexity",
    label: "Editing level",
    group: "channel_brand_production",
    type: "select",
    required: false,
    defaultValue: "Auto",
    placeholder: "Choose the realistic editing complexity.",
    hint: "This keeps production notes achievable.",
    why:
      "Editing capacity affects pacing, visuals, graphics, B-roll, and post-production recommendations.",
    maxLength: 20,
    options: ["Auto", "Minimal", "Basic", "Moderate", "Advanced"],
  },
  {
    key: "chapterMode",
    label: "Video chapters",
    group: "channel_brand_production",
    type: "select",
    required: false,
    defaultValue: "Auto",
    placeholder: "Choose whether to include chapters.",
    hint: "Auto includes chapters only when the structure and duration support them.",
    why:
      "Chapters are useful for longer segmented videos but not every format needs them.",
    maxLength: 15,
    options: ["Auto", "Include", "Omit"],
  },
  {
    key: "commercialRelationship",
    label: "Commercial relationship",
    group: "monetization_safety_final",
    type: "select",
    required: false,
    defaultValue: "None",
    placeholder: "Select any commercial relationship.",
    hint:
      "This controls sponsorship, affiliate, owned-product, employer, client, and paid-promotion handling.",
    why:
      "Commercial interests affect disclosure, description wording, CTA, and claims.",
    maxLength: 35,
    options: [
      "None",
      "Own product or service",
      "Affiliate relationship",
      "Sponsor or paid integration",
      "Paid partnership",
      "Employer or client",
      "Other",
    ],
  },
  {
    key: "promotionDetails",
    label: "Promotion details",
    group: "monetization_safety_final",
    type: "textarea",
    required: false,
    placeholder:
      "Describe the product, sponsor, affiliate link, owned offer, compensation, or relationship details.",
    hint: "Include only confirmed information that may be disclosed.",
    why:
      "Promotional facts and relationship details cannot be invented safely.",
    maxLength: 1200,
    fullWidth: true,
    showWhen: {
      key: "commercialRelationship",
      notEquals: "None",
    },
  },
  {
    key: "disclosureText",
    label: "Required disclosure",
    group: "monetization_safety_final",
    type: "textarea",
    required: false,
    placeholder:
      "Paste required sponsor, affiliate, employer, client, or paid-promotion wording.",
    hint:
      "When blank, the output may suggest plain-language disclosure wording for review.",
    why:
      "Required disclosure wording may be contractual or jurisdiction-specific and cannot be invented confidently.",
    maxLength: 800,
    fullWidth: true,
    showWhen: {
      key: "commercialRelationship",
      notEquals: "None",
    },
  },
  {
    key: "regulatedContext",
    label: "Sensitive or regulated topic",
    group: "monetization_safety_final",
    type: "select",
    required: false,
    defaultValue: "None",
    placeholder:
      "Select a category only when the video enters a high-stakes subject area.",
    hint:
      "This enables cautious wording and relevant verification notes without adding a large compliance questionnaire.",
    why: "High-stakes subjects require different claim handling and safety protections.",
    maxLength: 30,
    options: [
      "None",
      "Health or medical",
      "Legal",
      "Financial or investing",
      "Personal or public safety",
      "Employment",
      "Political or civic",
      "Children or minors",
      "Other",
    ],
  },
  {
    key: "jurisdiction",
    label: "Relevant jurisdiction",
    group: "monetization_safety_final",
    type: "text",
    required: false,
    placeholder:
      "For example: United States, European Union, Ukraine, California, or England and Wales.",
    hint:
      "Add this only when laws, regulations, elections, financial rules, or local guidance matter.",
    why:
      "Legal and regulatory information can differ substantially between jurisdictions.",
    maxLength: 150,
    showWhen: {
      key: "regulatedContext",
      notEquals: "None",
    },
  },
  {
    key: "privacyRestrictions",
    label: "Privacy restrictions",
    group: "monetization_safety_final",
    type: "textarea",
    required: false,
    placeholder:
      "Identify private names, faces, locations, client details, children, records, or data that must be removed or anonymized.",
    hint: "Do not paste unnecessary sensitive personal data into this field.",
    why:
      "The user knows which real people or confidential details require protection.",
    maxLength: 1000,
    fullWidth: true,
  },
  {
    key: "additionalRequirements",
    label: "Additional requirements",
    group: "monetization_safety_final",
    type: "textarea",
    required: false,
    placeholder: "Add any final instructions that are not already covered by another field.",
    hint: "Use this as the only general miscellaneous field.",
    why:
      "It accommodates legitimate project-specific constraints without expanding the standard form.",
    maxLength: 2000,
    fullWidth: true,
  },
];

const groupTitleById = new Map(groups.map((group) => [group.id, group.title]));

const variables = fieldSpecs.map((field) => ({
  key: field.key,
  label: field.label,
  placeholder: field.placeholder,
  required: Boolean(field.required),
  type: field.type,
  group: field.group,
  groupTitle: groupTitleById.get(field.group),
  hint: field.hint,
  help: {
    what: field.hint,
    why: field.why,
    example: field.placeholder || field.defaultValue || field.label,
    avoid:
      "Avoid vague inputs, unsupported claims, invented facts, conflicting instructions, or irrelevant context.",
  },
  options: field.options,
  fullWidth: Boolean(field.fullWidth),
  defaultValue: field.defaultValue,
  maxLength: field.maxLength,
  min: field.min,
  max: field.max,
  showWhen: field.showWhen,
}));

function extractVars(prompt) {
  const set = new Set();
  const re = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
  let match;
  while ((match = re.exec(prompt))) set.add(match[1]);
  return [...set];
}

const prompt = fs.readFileSync(promptPath, "utf8");
const promptVars = extractVars(prompt);
const fieldKeys = variables.map((field) => field.key);
const missing = promptVars.filter((key) => !fieldKeys.includes(key));
const extra = fieldKeys.filter((key) => !promptVars.includes(key));

if (missing.length || extra.length) {
  console.error("YouTube Video Package prompt/form mismatch");
  console.error("Missing fields:", missing.join(", ") || "none");
  console.error("Extra fields:", extra.join(", ") || "none");
  process.exit(1);
}

const payload = {
  slug: "youtube-video-package",
  title: "YouTube Video Package",
  version: 1,
  generatedAt: new Date().toISOString(),
  fieldCount: variables.length,
  requiredKeys: variables
    .filter((field) => field.required)
    .map((field) => field.key),
  groups,
  variables,
};

fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
console.log("Wrote " + outPath + " - " + variables.length + " fields");
