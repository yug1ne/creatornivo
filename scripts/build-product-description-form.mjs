/**
 * Builds Product Description form schema from the prompt.
 * Does NOT modify the prompt text — only form metadata for UX.
 *
 * Usage: node scripts/build-product-description-form.mjs
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
  "product-description.txt",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "product-description-variables.json",
);

function humanize(key) {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

function extractVars(prompt) {
  const set = new Set();
  const re = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  let m;
  while ((m = re.exec(prompt))) set.add(m[1]);
  return [...set];
}

const PRODUCT_TYPES = [
  "Physical product",
  "Digital product",
  "Software or application",
  "Handmade product",
  "Clothing or accessories",
  "Beauty or personal care",
  "Food product",
  "Furniture or home product",
  "Electronics",
  "Subscription product",
  "Other confirmed type",
];

const PLATFORMS = [
  "E-commerce product page",
  "Online marketplace",
  "Amazon-style listing",
  "Etsy-style listing",
  "Shopify store",
  "WooCommerce store",
  "Product catalog",
  "Landing page",
  "Social commerce page",
  "Mobile shopping application",
  "B2B product page",
  "Digital product marketplace",
  "App or software directory",
  "Subscription product page",
];

const LENGTH_OPTIONS = [
  "short",
  "medium",
  "long",
];

const REQUIRED = new Set([
  "product_name",
  "product_category",
  "brand_name",
  "product_type",
  "target_audience",
  "customer_problem",
  "main_purpose",
  "platform",
  "tone",
  "language",
]);

const FIELD_META = {
  product_name: {
    group: "essentials",
    groupTitle: "Essentials",
    type: "text",
    placeholder: "Creatornivo Pro — content generation for marketers",
    hint: "Exact product name customers will see.",
    what: "Product name.",
    why: "Anchors titles, opening, and SEO without inventing a different product.",
    example: "Creatornivo Free plan",
    avoid: "Generic names like “Amazing Product” or unconfirmed model numbers.",
  },
  product_category: {
    group: "essentials",
    groupTitle: "Essentials",
    type: "text",
    placeholder: "AI writing tools / content templates",
    hint: "Category for positioning and structure.",
    what: "Product category.",
    why: "Shapes benefit hierarchy and which specs matter most.",
    example: "SaaS content generation software",
    avoid: "Vague categories that do not match how you sell it.",
  },
  brand_name: {
    group: "essentials",
    groupTitle: "Essentials",
    type: "text",
    placeholder: "Creatornivo",
    hint: "Brand as shown on the listing.",
    what: "Brand name.",
    why: "Used in brand-oriented titles and consistent voice.",
    example: "Creatornivo",
    avoid: "Invented brands or multiple conflicting brand names.",
  },
  product_type: {
    group: "essentials",
    groupTitle: "Essentials",
    type: "select",
    options: PRODUCT_TYPES,
    placeholder: "Software or application",
    hint: "Physical, digital, software, etc. — unlocks type-specific rules.",
    what: "Product type.",
    why: "Digital vs physical vs food require different specs and claims caution.",
    example: "Software or application",
    avoid: "Choosing a type that does not match how the product is delivered.",
  },
  target_audience: {
    group: "essentials",
    groupTitle: "Essentials",
    type: "text",
    placeholder: "small-team marketers and founders who publish content",
    hint: "Who this product is for.",
    what: "Target audience.",
    why: "Adjusts terminology, depth, and use cases.",
    example: "Early-stage B2B founders and content leads",
    avoid: "Assuming every shopper is an expert or a buyer of everything.",
  },
  customer_problem: {
    group: "essentials",
    groupTitle: "Essentials",
    type: "textarea",
    fullWidth: true,
    placeholder: "Hard to write trustworthy product or social copy without inventing claims",
    hint: "Primary need or problem the product addresses.",
    what: "Primary customer need or problem.",
    why: "Opens the description with real relevance, not empty praise.",
    example: "Need structured content templates without fake social proof",
    avoid: "Invented pain points the product does not address.",
  },
  main_purpose: {
    group: "essentials",
    groupTitle: "Essentials",
    type: "textarea",
    fullWidth: true,
    placeholder: "Generate structured marketing copy from confirmed product facts",
    hint: "What the product is mainly for.",
    what: "Main product purpose.",
    why: "First paragraph must state purpose clearly.",
    example: "Help teams draft platform-ready copy from real inputs",
    avoid: "Vague purpose like “improve your life”.",
  },
  platform: {
    group: "essentials",
    groupTitle: "Essentials",
    type: "select",
    options: PLATFORMS,
    placeholder: "E-commerce product page",
    hint: "Where this description will be published.",
    what: "Sales platform or destination.",
    why: "Marketplace vs brand store vs B2B need different structures.",
    example: "Shopify store",
    avoid: "Using one generic structure for every platform.",
  },
  tone: {
    group: "essentials",
    groupTitle: "Essentials",
    type: "text",
    placeholder: "clear, specific, helpful, no hype",
    hint: "How the description should sound.",
    what: "Tone of voice.",
    why: "Keeps copy persuasive without exaggerated ad language.",
    example: "professional, concrete, trustworthy",
    avoid: "Revolutionary / game-changing / must-have fluff.",
  },
  language: {
    group: "essentials",
    groupTitle: "Essentials",
    type: "text",
    placeholder: "English",
    hint: "Language of the full package.",
    what: "Language.",
    why: "Titles, bullets, and SEO elements should match this language.",
    example: "English",
    avoid: "Mixing languages without stating so.",
  },
  key_features: {
    group: "benefits",
    groupTitle: "Features & benefits",
    type: "textarea",
    fullWidth: true,
    placeholder: "Feature 1…\nFeature 2…\n(only confirmed features)",
    hint: "Facts about what the product has or does.",
    what: "Key features.",
    why: "Each important feature should map to a practical benefit.",
    example: "45 structured templates; Free 5/day; Pro 100/month",
    avoid: "Unreleased features described as available.",
  },
  key_benefits: {
    group: "benefits",
    groupTitle: "Features & benefits",
    type: "textarea",
    fullWidth: true,
    placeholder: "Benefit 1…\nBenefit 2…\n(outcomes customers can expect)",
    hint: "Customer outcomes — not just feature names.",
    what: "Key benefits.",
    why: "Benefit hierarchy drives bullets and opening value.",
    example: "Faster first drafts; clearer structure; fewer invented claims",
    avoid: "Guaranteed results without evidence.",
  },
  unique_selling_points: {
    group: "benefits",
    groupTitle: "Features & benefits",
    type: "textarea",
    fullWidth: true,
    placeholder: "What is distinct — only if true and specific",
    hint: "Differentiators you can defend.",
    what: "Unique selling points.",
    why: "Supports positioning without unsupported superlatives.",
    example: "Honest Early Access messaging; no fake testimonials",
    avoid: 'Claims like "only product that..." without proof.',
  },
  competitive_advantages: {
    group: "benefits",
    groupTitle: "Features & benefits",
    type: "textarea",
    fullWidth: true,
    placeholder: "Compared to alternatives — only fair, confirmed points",
    hint: "Optional. Do not invent competitor weaknesses.",
    what: "Competitive advantages.",
    why: "Helps positioning when differences are real.",
    example: "Template-first workflow with transparent quotas",
    avoid: "False comparisons or invented competitor flaws.",
  },
  customer_objections: {
    group: "benefits",
    groupTitle: "Features & benefits",
    type: "textarea",
    fullWidth: true,
    placeholder: "Is it hard to learn? Will it invent claims? Pricing?",
    hint: "Concerns to address only with confirmed answers.",
    what: "Customer objections or concerns.",
    why: "Enables honest objection handling without fake reassurance.",
    example: "Worried AI will invent stats — we only use supplied facts",
    avoid: "Making up answers you cannot verify.",
  },
  product_limitations: {
    group: "benefits",
    groupTitle: "Features & benefits",
    type: "textarea",
    fullWidth: true,
    placeholder: "What the product does not do or does not include",
    hint: "Honest limits improve trust.",
    what: "Product limitations.",
    why: "Copy must not hide relevant limitations.",
    example: "Does not auto-publish to marketplaces; facts must be supplied",
    avoid: "Hiding limits to sound more complete.",
  },
  materials_or_ingredients: {
    group: "specs",
    groupTitle: "Specs & package",
    type: "textarea",
    fullWidth: true,
    placeholder: "Only confirmed materials or ingredients",
    what: "Materials or ingredients.",
    why: "Required for physical, beauty, food, handmade listings when real.",
    example: "100% cotton / leave blank for software",
    avoid: "Guessing composition or allergen status.",
  },
  technical_specifications: {
    group: "specs",
    groupTitle: "Specs & package",
    type: "textarea",
    fullWidth: true,
    placeholder: "Model, power, OS, file format, capacity…",
    what: "Technical specifications.",
    why: "Marketplace and technical buyers need scannable facts.",
    example: "Web app; English UI; Free and Pro plans",
    avoid: "Invented measurements or system requirements.",
  },
  dimensions: {
    group: "specs",
    groupTitle: "Specs & package",
    type: "text",
    placeholder: "e.g. 30 × 20 × 10 cm — only if confirmed",
    what: "Dimensions.",
    why: "Fit and shipping decisions depend on real sizes.",
    example: "Leave blank if not a physical product",
    avoid: "Approximate guesses presented as exact.",
  },
  weight: {
    group: "specs",
    groupTitle: "Specs & package",
    type: "text",
    placeholder: "e.g. 450 g — only if confirmed",
    what: "Weight.",
    why: "Shipping and usability context.",
    avoid: "Invented weight.",
  },
  available_sizes: {
    group: "specs",
    groupTitle: "Specs & package",
    type: "text",
    placeholder: "S, M, L / One size / N/A",
    what: "Available sizes.",
    why: "Clothing and similar products need size clarity.",
    avoid: "Guessing fit charts.",
  },
  available_variants: {
    group: "specs",
    groupTitle: "Specs & package",
    type: "text",
    placeholder: "Colors, finishes, formats — confirmed only",
    what: "Available colors or variants.",
    why: "Helps customers choose the right option.",
    avoid: "Listing variants that are not sellable.",
  },
  compatibility: {
    group: "specs",
    groupTitle: "Specs & package",
    type: "textarea",
    fullWidth: true,
    placeholder: "Devices, OS, software, accessories — confirmed only",
    what: "Compatibility.",
    why: "Reduces returns and support friction.",
    example: "Modern browsers; account required",
    avoid: "Assuming cables, adapters, or OS support.",
  },
  package_contents: {
    group: "specs",
    groupTitle: "Specs & package",
    type: "textarea",
    fullWidth: true,
    placeholder: "What is in the box / what the purchase includes",
    what: "What is included.",
    why: "Answers “what do I get?” with confirmed items only.",
    avoid: "Assuming accessories are included.",
  },
  how_to_use: {
    group: "usage",
    groupTitle: "Usage & policies",
    type: "textarea",
    fullWidth: true,
    placeholder: "Step-by-step usage when known",
    what: "How to use.",
    why: "Supports How to Use section when instructions exist.",
    avoid: "Unsafe or invented instructions.",
  },
  care_instructions: {
    group: "usage",
    groupTitle: "Usage & policies",
    type: "textarea",
    fullWidth: true,
    placeholder: "Wash, store, maintain — only if confirmed",
    what: "Care or maintenance instructions.",
    why: "Physical and textile products need accurate care notes.",
    avoid: "Generic care advice that may damage the product.",
  },
  safety_information: {
    group: "usage",
    groupTitle: "Usage & policies",
    type: "textarea",
    fullWidth: true,
    placeholder: "Warnings, age limits, hazards — confirmed only",
    what: "Safety information or warnings.",
    why: "High-stakes categories need supplied warnings only.",
    avoid: "Inventing medical/safety claims or disclaimers.",
  },
  certifications: {
    group: "usage",
    groupTitle: "Usage & policies",
    type: "textarea",
    fullWidth: true,
    placeholder: "CE, organic, ISO… only if verified",
    what: "Certifications or standards.",
    why: "Trust signals only when real.",
    avoid: "Claiming approval without confirmation.",
  },
  warranty: {
    group: "usage",
    groupTitle: "Usage & policies",
    type: "text",
    placeholder: "e.g. 12-month limited warranty — or leave blank",
    what: "Warranty.",
    why: "Purchase confidence from confirmed terms.",
    avoid: "Invented warranty periods.",
  },
  shipping_information: {
    group: "usage",
    groupTitle: "Usage & policies",
    type: "textarea",
    fullWidth: true,
    placeholder: "Delivery method, regions, times — confirmed only",
    what: "Shipping or delivery information.",
    why: "Physical and digital delivery differ — only state what is true.",
    avoid: "Fake delivery promises; digital products as shipped goods.",
  },
  returns_information: {
    group: "usage",
    groupTitle: "Usage & policies",
    type: "textarea",
    fullWidth: true,
    placeholder: "Return window and conditions if known",
    what: "Returns information.",
    why: "Addresses a common objection with real policy text.",
    avoid: "Invented return rights.",
  },
  price: {
    group: "offer",
    groupTitle: "Offer & platform",
    type: "text",
    placeholder: "e.g. Free tier; Pro $X/month — confirmed only",
    what: "Price or price range.",
    why: "Purchase context when pricing is public and correct.",
    avoid: "Guessed prices or fake discounts.",
  },
  offer: {
    group: "offer",
    groupTitle: "Offer & platform",
    type: "text",
    placeholder: "Only confirmed promo — no fake scarcity",
    what: "Discount or special offer.",
    why: "Includes offer only when real; no invented deadlines.",
    avoid: "False urgency or limited stock claims.",
  },
  call_to_action: {
    group: "offer",
    groupTitle: "Offer & platform",
    type: "text",
    placeholder: "Add to cart / View plans / Choose your option",
    hint: "One primary CTA — not aggressive scarcity.",
    what: "Primary call to action.",
    why: "Ends the package with one clear next step for the platform.",
    example: "View plans and start generating",
    avoid: "Buy now before it’s too late / Do not miss out.",
  },
  seo_keywords: {
    group: "offer",
    groupTitle: "Offer & platform",
    type: "text",
    placeholder: "primary keyword; secondary, secondary…",
    hint: "Natural SEO only — no stuffing.",
    what: "SEO keywords.",
    why: "Optional natural inclusion in titles and meta; readability first.",
    example: "AI product description generator; ecommerce copy",
    avoid: "Irrelevant keywords or unsupported claims for SEO.",
  },
  length: {
    group: "style",
    groupTitle: "Style",
    type: "select",
    options: LENGTH_OPTIONS,
    placeholder: "medium",
    hint: "Editorial depth for the main description.",
    what: "Desired description length.",
    why: "Controls depth without padding a simple product.",
    avoid: "Making a simple item artificially long.",
  },
  additional_context: {
    group: "style",
    groupTitle: "Style",
    type: "textarea",
    fullWidth: true,
    placeholder: "Restrictions, must-avoid claims, brand rules, legal notes…",
    hint: "Anything else the model must respect.",
    what: "Additional context, restrictions, or requirements.",
    why: "Captures claim bans and brand rules so copy stays accurate.",
    example: "Do not invent reviews or ratings. No medical claims.",
    avoid: "Leaving critical restrictions only in your head.",
  },
};

const GROUPS = [
  {
    id: "essentials",
    title: "Essentials",
    description: "Minimum inputs for a trustworthy product description.",
    defaultOpen: true,
  },
  {
    id: "benefits",
    title: "Features & benefits",
    description: "Confirmed features, benefits, USPs, objections, limits.",
    defaultOpen: true,
  },
  {
    id: "specs",
    title: "Specs & package",
    description: "Measurements, materials, variants, package contents.",
    defaultOpen: false,
  },
  {
    id: "usage",
    title: "Usage & policies",
    description: "How to use, care, safety, warranty, shipping, returns.",
    defaultOpen: false,
  },
  {
    id: "offer",
    title: "Offer & platform",
    description: "Price, offer, CTA, SEO keywords.",
    defaultOpen: true,
  },
  {
    id: "style",
    title: "Style",
    description: "Length and extra constraints.",
    defaultOpen: false,
  },
];

const FIELD_ORDER = [
  "product_name",
  "product_category",
  "brand_name",
  "product_type",
  "target_audience",
  "customer_problem",
  "main_purpose",
  "platform",
  "tone",
  "language",
  "key_features",
  "key_benefits",
  "unique_selling_points",
  "competitive_advantages",
  "customer_objections",
  "product_limitations",
  "materials_or_ingredients",
  "technical_specifications",
  "dimensions",
  "weight",
  "available_sizes",
  "available_variants",
  "compatibility",
  "package_contents",
  "how_to_use",
  "care_instructions",
  "safety_information",
  "certifications",
  "warranty",
  "shipping_information",
  "returns_information",
  "price",
  "offer",
  "call_to_action",
  "seo_keywords",
  "length",
  "additional_context",
];

function defaultHelp(key, label) {
  return {
    what: `${label} for this product description.`,
    why: `When provided, the model uses this instead of inventing facts. Empty fields stay unset ([${key}]).`,
    example: `A short, factual value for ${label.toLowerCase()}.`,
    avoid: `Invented specs, reviews, certifications, scarcity, or performance claims for ${label.toLowerCase()}.`,
  };
}

function buildField(key) {
  const meta = FIELD_META[key] || {};
  const label = meta.label || humanize(key);
  const type = meta.type || "text";
  const helpBase = defaultHelp(key, label);
  const help = {
    what: meta.what || helpBase.what,
    why: meta.why || helpBase.why,
    example: meta.example || meta.placeholder || helpBase.example,
    avoid: meta.avoid || helpBase.avoid,
  };

  return {
    key,
    label,
    placeholder: meta.placeholder || "Optional — leave blank if unknown",
    required: REQUIRED.has(key),
    type,
    group: meta.group || "style",
    groupTitle: meta.groupTitle || "Style",
    hint: meta.hint || help.what,
    help,
    options: meta.options,
    fullWidth: Boolean(meta.fullWidth || type === "textarea"),
  };
}

function main() {
  const prompt = fs.readFileSync(promptPath, "utf8");
  const keys = extractVars(prompt);

  if (keys.length === 0) {
    console.error("No variables found in prompt");
    process.exit(1);
  }

  const keySet = new Set(keys);
  const fields = [];

  for (const key of FIELD_ORDER) {
    if (!keySet.has(key)) continue;
    fields.push(buildField(key));
  }

  for (const key of keys.sort()) {
    if (fields.some((f) => f.key === key)) continue;
    fields.push(buildField(key));
  }

  const usedGroups = new Set(fields.map((f) => f.group));
  const groups = GROUPS.filter((g) => usedGroups.has(g.id));

  const payload = {
    slug: "product-description",
    title: "Product Description",
    version: 1,
    generatedAt: new Date().toISOString(),
    fieldCount: fields.length,
    requiredKeys: [...REQUIRED].filter((k) => keySet.has(k)),
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
