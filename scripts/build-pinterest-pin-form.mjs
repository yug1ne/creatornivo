/**
 * Builds the Pinterest Pin form schema from the approved 24-field specification.
 * Does NOT modify the prompt text. It verifies that every prompt variable has
 * exactly one form field before writing the form JSON.
 *
 * Usage: node scripts/build-pinterest-pin-form.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const promptPath = path.join(root, "prisma", "template-prompts", "pinterest-pin.txt");
const outPath = path.join(root, "src", "config", "template-forms", "pinterest-pin-variables.json");

const groups = [
  {
    "id": "essentials",
    "title": "Essentials",
    "description": "Core subject, goal, audience, message, destination, language, tone, format, and variant count for a useful first Pin package.",
    "defaultOpen": true
  },
  {
    "id": "search_content",
    "title": "Search & Content",
    "description": "Pinterest discovery language, content angle, required details, and timing relevance.",
    "defaultOpen": false
  },
  {
    "id": "brand_visual_direction",
    "title": "Brand & Visual Direction",
    "description": "Brand naming, voice, available assets, and the visual treatment for the Pin concept.",
    "defaultOpen": false
  },
  {
    "id": "conversion_requirements",
    "title": "Conversion & Requirements",
    "description": "CTA preference, offer details, commercial relationship, disclosure, and final constraints.",
    "defaultOpen": false
  }
];

const variables = [
  {
    "key": "pinSubject",
    "label": "Pin topic or offer",
    "placeholder": "Example: Beginner balcony garden checklist",
    "required": true,
    "type": "text",
    "group": "essentials",
    "groupTitle": "Essentials",
    "hint": "Enter the main topic, product, article, idea, or offer featured in the Pin.",
    "help": {
      "what": "Enter the main topic, product, article, idea, or offer featured in the Pin.",
      "why": "It defines the central subject the entire Pin package must communicate.",
      "example": "Example: Beginner balcony garden checklist",
      "avoid": "Avoid broad topics such as ?marketing? without a clear subject, product, idea, or offer."
    },
    "fullWidth": false,
    "maxLength": 200
  },
  {
    "key": "primaryGoal",
    "label": "Primary goal",
    "placeholder": "Select the main goal",
    "required": true,
    "type": "select",
    "group": "essentials",
    "groupTitle": "Essentials",
    "hint": "Choose the single most important result this Pin should support.",
    "help": {
      "what": "Choose the single most important result this Pin should support.",
      "why": "The goal determines the content angle, CTA strength, and emphasis of each variant.",
      "example": "Select the main goal",
      "avoid": "Avoid selecting several goals at once or choosing a promotional goal when the facts do not support it."
    },
    "fullWidth": false,
    "maxLength": 40,
    "options": [
      "Drive website traffic",
      "Increase saves",
      "Promote a product or service",
      "Grow brand awareness",
      "Generate leads",
      "Educate or inspire"
    ]
  },
  {
    "key": "targetAudience",
    "label": "Target audience",
    "placeholder": "Example: First-time apartment renters who want affordable decor ideas",
    "required": true,
    "type": "textarea",
    "group": "essentials",
    "groupTitle": "Essentials",
    "hint": "Describe who should find, save, or click the Pin.",
    "help": {
      "what": "Describe who should find, save, or click the Pin.",
      "why": "Pinterest copy must match the audience’s interests, knowledge, and search intent.",
      "example": "Example: First-time apartment renters who want affordable decor ideas",
      "avoid": "Avoid ?everyone,? unsupported demographic assumptions, or audience descriptions unrelated to the Pin."
    },
    "fullWidth": true,
    "maxLength": 500
  },
  {
    "key": "keyMessage",
    "label": "Key message and facts",
    "placeholder": "Add the main promise, useful facts, benefits, or takeaway",
    "required": true,
    "type": "textarea",
    "group": "essentials",
    "groupTitle": "Essentials",
    "hint": "Include only accurate information the generated Pin may state.",
    "help": {
      "what": "Include only accurate information the generated Pin may state.",
      "why": "It supplies the factual foundation and prevents unsupported claims.",
      "example": "Add the main promise, useful facts, benefits, or takeaway",
      "avoid": "Avoid invented claims, vague promises, or facts that cannot be published."
    },
    "fullWidth": true,
    "maxLength": 1200
  },
  {
    "key": "pinFormat",
    "label": "Pin format",
    "placeholder": "Choose a format or use Auto",
    "required": false,
    "type": "select",
    "group": "essentials",
    "groupTitle": "Essentials",
    "hint": "Select the content format when it is already known.",
    "help": {
      "what": "Select the content format when it is already known.",
      "why": "Different Pin formats require different overlay, visual, and destination treatments.",
      "example": "Choose a format or use Auto",
      "avoid": "Avoid choosing a format that conflicts with the actual content or available assets."
    },
    "fullWidth": false,
    "maxLength": 40,
    "options": [
      "Auto",
      "Image Pin",
      "Video Pin",
      "Product Pin",
      "Article or Blog Pin",
      "Recipe or How-to Pin"
    ],
    "defaultValue": "Auto"
  },
  {
    "key": "destinationUrl",
    "label": "Destination URL",
    "placeholder": "https://example.com/page",
    "required": false,
    "type": "text",
    "group": "essentials",
    "groupTitle": "Essentials",
    "hint": "Add the page the Pin should lead to, when applicable.",
    "help": {
      "what": "Add the page the Pin should lead to, when applicable.",
      "why": "It allows the output package to retain and reference the intended destination accurately.",
      "example": "https://example.com/page",
      "avoid": "Avoid invented URLs, tracking links you cannot verify, or destinations that do not match the Pin promise."
    },
    "fullWidth": false,
    "format": "url",
    "maxLength": 500
  },
  {
    "key": "destinationSummary",
    "label": "Destination page summary",
    "placeholder": "Briefly explain what users will find after clicking",
    "required": false,
    "type": "textarea",
    "group": "essentials",
    "groupTitle": "Essentials",
    "hint": "The generator will not assume it can read the URL, so summarize the page content.",
    "help": {
      "what": "The generator will not assume it can read the URL, so summarize the page content.",
      "why": "It prevents clickbait and keeps the Pin promise aligned with the landing page.",
      "example": "Briefly explain what users will find after clicking",
      "avoid": "Avoid claiming the page contains downloads, products, recipes, or offers that are not actually there."
    },
    "fullWidth": true,
    "maxLength": 1000
  },
  {
    "key": "outputLanguage",
    "label": "Output language",
    "placeholder": "Example: English, Ukrainian, Spanish",
    "required": true,
    "type": "text",
    "group": "essentials",
    "groupTitle": "Essentials",
    "hint": "Enter the language for all audience-facing copy.",
    "help": {
      "what": "Enter the language for all audience-facing copy.",
      "why": "Language cannot always be inferred safely from the subject or destination.",
      "example": "Example: English, Ukrainian, Spanish",
      "avoid": "Avoid mixing languages unless the brand intentionally uses more than one language."
    },
    "fullWidth": false,
    "maxLength": 80,
    "defaultValue": "English"
  },
  {
    "key": "tone",
    "label": "Tone",
    "placeholder": "Choose a tone",
    "required": false,
    "type": "select",
    "group": "essentials",
    "groupTitle": "Essentials",
    "hint": "Select the overall writing feel without defining a full brand voice.",
    "help": {
      "what": "Select the overall writing feel without defining a full brand voice.",
      "why": "Tone materially changes wording while retaining a simple default.",
      "example": "Choose a tone",
      "avoid": "Avoid exaggerated hype, forced slang, or a tone that conflicts with the topic."
    },
    "fullWidth": false,
    "maxLength": 40,
    "options": [
      "Clear and natural",
      "Warm and inspiring",
      "Concise and direct",
      "Educational",
      "Playful",
      "Premium and elegant",
      "Bold but credible",
      "Auto"
    ],
    "defaultValue": "Clear and natural"
  },
  {
    "key": "variantCount",
    "label": "Number of variants",
    "placeholder": "1–5",
    "required": false,
    "type": "number",
    "group": "essentials",
    "groupTitle": "Essentials",
    "hint": "Generate between one and five meaningfully different Pin approaches.",
    "help": {
      "what": "Generate between one and five meaningfully different Pin approaches.",
      "why": "It controls output volume without forcing a fixed number of alternatives.",
      "example": "1–5",
      "avoid": "Avoid requesting many tiny rewrites; variants should be meaningfully different."
    },
    "fullWidth": false,
    "defaultValue": "3",
    "min": 1,
    "max": 5
  },
  {
    "key": "priorityKeywords",
    "label": "Priority search keywords",
    "placeholder": "Example: small balcony garden, container gardening, apartment plants",
    "required": false,
    "type": "textarea",
    "group": "search_content",
    "groupTitle": "Search & Content",
    "hint": "Add relevant phrases to use naturally, not as a keyword-stuffed list.",
    "help": {
      "what": "Add relevant phrases to use naturally, not as a keyword-stuffed list.",
      "why": "User-supplied search terminology can improve relevance for a specific niche.",
      "example": "Example: small balcony garden, container gardening, apartment plants",
      "avoid": "Avoid keyword stuffing, unrelated trending phrases, or repeating the same phrase unnaturally."
    },
    "fullWidth": true,
    "maxLength": 600
  },
  {
    "key": "contentAngle",
    "label": "Preferred content angle",
    "placeholder": "Choose an angle or use Auto",
    "required": false,
    "type": "select",
    "group": "search_content",
    "groupTitle": "Search & Content",
    "hint": "Select the main framing when a specific approach is preferred.",
    "help": {
      "what": "Select the main framing when a specific approach is preferred.",
      "why": "The angle changes the title, overlay, description structure, and save motivation.",
      "example": "Choose an angle or use Auto",
      "avoid": "Avoid an angle that changes the underlying facts or misrepresents the destination."
    },
    "fullWidth": false,
    "maxLength": 40,
    "options": [
      "Auto",
      "How-to",
      "Checklist",
      "Tips or ideas",
      "Inspiration",
      "Problem and solution",
      "Product benefit",
      "Educational",
      "Seasonal"
    ],
    "defaultValue": "Auto"
  },
  {
    "key": "mustInclude",
    "label": "Must-include details",
    "placeholder": "Add names, features, steps, wording, or facts that must appear",
    "required": false,
    "type": "textarea",
    "group": "search_content",
    "groupTitle": "Search & Content",
    "hint": "Use this for specific content requirements rather than general writing instructions.",
    "help": {
      "what": "Use this for specific content requirements rather than general writing instructions.",
      "why": "It ensures essential user-controlled details are not omitted.",
      "example": "Add names, features, steps, wording, or facts that must appear",
      "avoid": "Avoid adding unverified claims, excessive requirements, or details that conflict with the core message."
    },
    "fullWidth": true,
    "maxLength": 1000
  },
  {
    "key": "seasonalTiming",
    "label": "Seasonal or timing context",
    "placeholder": "Choose the timing context",
    "required": false,
    "type": "select",
    "group": "search_content",
    "groupTitle": "Search & Content",
    "hint": "Indicate whether the Pin should be evergreen or linked to a particular period.",
    "help": {
      "what": "Indicate whether the Pin should be evergreen or linked to a particular period.",
      "why": "Pinterest content is often planned ahead, but timing should never be invented.",
      "example": "Choose the timing context",
      "avoid": "Avoid fake seasonality, invented deadlines, or timing references that are not relevant."
    },
    "fullWidth": false,
    "maxLength": 40,
    "options": [
      "Auto",
      "Evergreen",
      "Current season",
      "Upcoming event or holiday",
      "Specific date or campaign window",
      "No timing references"
    ],
    "defaultValue": "Auto"
  },
  {
    "key": "timingDetails",
    "label": "Timing details",
    "placeholder": "Example: Back-to-school campaign running August 1–25",
    "required": false,
    "type": "textarea",
    "group": "search_content",
    "groupTitle": "Search & Content",
    "hint": "Provide the exact season, event, date, or campaign window.",
    "help": {
      "what": "Provide the exact season, event, date, or campaign window.",
      "why": "It supplies exact timing information the model must not guess.",
      "example": "Example: Back-to-school campaign running August 1–25",
      "avoid": "Avoid relative timing such as ?tomorrow? without a clear date, year, or campaign window."
    },
    "fullWidth": true,
    "maxLength": 500,
    "showWhen": {
      "key": "seasonalTiming",
      "equals": [
        "Current season",
        "Upcoming event or holiday",
        "Specific date or campaign window"
      ]
    }
  },
  {
    "key": "brandName",
    "label": "Brand name",
    "placeholder": "Example: Northfield Studio",
    "required": false,
    "type": "text",
    "group": "brand_visual_direction",
    "groupTitle": "Brand & Visual Direction",
    "hint": "Add the brand name only when it may appear naturally in the content.",
    "help": {
      "what": "Add the brand name only when it may appear naturally in the content.",
      "why": "Brand identification may be important for awareness or promotional Pins.",
      "example": "Example: Northfield Studio",
      "avoid": "Avoid forcing the brand name into every line or using a name the user is not authorized to publish."
    },
    "fullWidth": false,
    "maxLength": 120
  },
  {
    "key": "brandVoice",
    "label": "Brand voice",
    "placeholder": "Example: Friendly, practical, understated, never overly promotional",
    "required": false,
    "type": "textarea",
    "group": "brand_visual_direction",
    "groupTitle": "Brand & Visual Direction",
    "hint": "Describe established voice characteristics not covered by the Tone field.",
    "help": {
      "what": "Describe established voice characteristics not covered by the Tone field.",
      "why": "It preserves a recognisable brand style when one already exists.",
      "example": "Example: Friendly, practical, understated, never overly promotional",
      "avoid": "Avoid voice instructions that conflict with accuracy, disclosure, privacy, or platform integrity."
    },
    "fullWidth": true,
    "maxLength": 600
  },
  {
    "key": "visualAssets",
    "label": "Available visual assets",
    "placeholder": "Example: Product photo, logo, three room images, and neutral background",
    "required": false,
    "type": "textarea",
    "group": "brand_visual_direction",
    "groupTitle": "Brand & Visual Direction",
    "hint": "Describe the real images, video clips, graphics, or product assets available.",
    "help": {
      "what": "Describe the real images, video clips, graphics, or product assets available.",
      "why": "Visual guidance should be based on assets that actually exist.",
      "example": "Example: Product photo, logo, three room images, and neutral background",
      "avoid": "Avoid pretending assets exist, using private customer images, or referencing unauthorized logos."
    },
    "fullWidth": true,
    "maxLength": 1000
  },
  {
    "key": "visualStyle",
    "label": "Preferred visual style",
    "placeholder": "Choose a style or use Auto",
    "required": false,
    "type": "select",
    "group": "brand_visual_direction",
    "groupTitle": "Brand & Visual Direction",
    "hint": "Select the general visual treatment for the Pin concept.",
    "help": {
      "what": "Select the general visual treatment for the Pin concept.",
      "why": "The visual treatment affects composition, overlay placement, and production guidance.",
      "example": "Choose a style or use Auto",
      "avoid": "Avoid styles that make text unreadable or imply proof, results, or ratings not supplied."
    },
    "fullWidth": false,
    "maxLength": 40,
    "options": [
      "Auto",
      "Editorial photography",
      "Lifestyle photography",
      "Product close-up",
      "Minimal graphic",
      "Illustrated",
      "Collage",
      "Step-by-step layout"
    ],
    "defaultValue": "Auto"
  },
  {
    "key": "ctaPreference",
    "label": "CTA preference",
    "placeholder": "Choose a CTA or use Auto",
    "required": false,
    "type": "select",
    "group": "conversion_requirements",
    "groupTitle": "Conversion & Requirements",
    "hint": "Choose one desired action or allow the generator to select a proportional CTA.",
    "help": {
      "what": "Choose one desired action or allow the generator to select a proportional CTA.",
      "why": "It controls the intended action without creating several competing CTAs.",
      "example": "Choose a CTA or use Auto",
      "avoid": "Avoid multiple competing CTAs or a sales CTA when the Pin is informational."
    },
    "fullWidth": false,
    "maxLength": 40,
    "options": [
      "Auto",
      "Visit the website",
      "Read more",
      "Shop now",
      "Save for later",
      "Learn more",
      "Download",
      "Sign up",
      "None"
    ],
    "defaultValue": "Auto"
  },
  {
    "key": "offerDetails",
    "label": "Offer details",
    "placeholder": "Add accurate product, service, lead magnet, price, or availability details",
    "required": false,
    "type": "textarea",
    "group": "conversion_requirements",
    "groupTitle": "Conversion & Requirements",
    "hint": "Include only information that may be stated publicly and is currently accurate.",
    "help": {
      "what": "Include only information that may be stated publicly and is currently accurate.",
      "why": "Commercial Pins require precise offer information that cannot be safely inferred.",
      "example": "Add accurate product, service, lead magnet, price, or availability details",
      "avoid": "Avoid fake scarcity, invented prices, unsupported discounts, or unclear offer terms."
    },
    "fullWidth": true,
    "maxLength": 1200,
    "showWhen": {
      "key": "primaryGoal",
      "equals": [
        "Promote a product or service",
        "Generate leads"
      ]
    }
  },
  {
    "key": "promotionRelationship",
    "label": "Promotion relationship",
    "placeholder": "Select the commercial relationship",
    "required": false,
    "type": "select",
    "group": "conversion_requirements",
    "groupTitle": "Conversion & Requirements",
    "hint": "Identify ownership, sponsorship, or affiliate involvement when relevant.",
    "help": {
      "what": "Identify ownership, sponsorship, or affiliate involvement when relevant.",
      "why": "The generator must not present commercial content as an independent recommendation.",
      "example": "Select the commercial relationship",
      "avoid": "Avoid hiding affiliate, sponsorship, ownership, client, or other commercial relationships."
    },
    "fullWidth": false,
    "maxLength": 40,
    "options": [
      "None",
      "Own product or service",
      "Affiliate relationship",
      "Sponsored collaboration",
      "Other disclosed relationship"
    ],
    "defaultValue": "None"
  },
  {
    "key": "disclosureText",
    "label": "Required disclosure text",
    "placeholder": "Example: Affiliate link — I may earn a commission",
    "required": false,
    "type": "textarea",
    "group": "conversion_requirements",
    "groupTitle": "Conversion & Requirements",
    "hint": "Add approved disclosure wording required by the brand, platform, or jurisdiction.",
    "help": {
      "what": "Add approved disclosure wording required by the brand, platform, or jurisdiction.",
      "why": "Exact disclosure wording may depend on facts and requirements the model cannot infer.",
      "example": "Example: Affiliate link — I may earn a commission",
      "avoid": "Avoid vague disclosure wording or implying legal sufficiency when it has not been approved."
    },
    "fullWidth": true,
    "maxLength": 400,
    "showWhen": {
      "key": "promotionRelationship",
      "notEquals": [
        "None",
        ""
      ]
    }
  },
  {
    "key": "additionalRequirements",
    "label": "Additional requirements",
    "placeholder": "Add prohibited claims, required wording, legal notes, or other constraints",
    "required": false,
    "type": "textarea",
    "group": "conversion_requirements",
    "groupTitle": "Conversion & Requirements",
    "hint": "Use one place for any remaining factual, editorial, or compliance requirements.",
    "help": {
      "what": "Use one place for any remaining factual, editorial, or compliance requirements.",
      "why": "It captures necessary exceptions without creating several miscellaneous fields.",
      "example": "Add prohibited claims, required wording, legal notes, or other constraints",
      "avoid": "Avoid repeating existing fields, adding unsupported claims, or conflicting instructions."
    },
    "fullWidth": true,
    "maxLength": 2000
  }
];

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
  console.error("Pinterest Pin prompt/form mismatch");
  console.error("Missing fields:", missing.join(", ") || "none");
  console.error("Extra fields:", extra.join(", ") || "none");
  process.exit(1);
}

const payload = {
  slug: "pinterest-pin",
  title: "Pinterest Pin",
  version: 2,
  generatedAt: new Date().toISOString(),
  fieldCount: variables.length,
  requiredKeys: variables.filter((field) => field.required).map((field) => field.key),
  groups,
  variables,
};

fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
console.log("Wrote " + outPath + " - " + variables.length + " fields");
