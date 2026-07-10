import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const promptsDir = path.join(root, "prisma", "template-prompts");

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

const curated = {
  "blog-article": {
    required: ["topic", "primaryKeyword", "audience", "language"],
    optional: [
      "workingTitle",
      "articleType",
      "secondaryKeywords",
      "knowledgeLevel",
      "searchIntent",
      "brandVoice",
      "tone",
      "preferredLength",
      "painPoint",
      "primaryQuestion",
      "expectedReaderAction",
      "sources",
      "sourceDetails",
      "market",
    ],
  },
  "cold-email-outreach": {
    required: ["recipientRole", "yourOffer", "painPoint", "tone"],
    optional: [
      "recipientName",
      "companyName",
      "industry",
      "specificObservation",
      "specificBenefit",
      "desiredNextStep",
      "proof",
      "senderName",
      "language",
    ],
  },
  "faq-page": {
    required: ["productName", "productType", "audience", "productDescription"],
    optional: [
      "useCases",
      "features",
      "pricing",
      "freeTrial",
      "commonObjections",
      "limitations",
      "supportOptions",
      "tone",
      "language",
    ],
  },
  "instagram-post": {
    required: ["topic", "tone", "audience"],
    optional: [
      "mainMessage",
      "postGoal",
      "brandVoice",
      "desiredAction",
      "visualContext",
      "sourceDetails",
      "language",
    ],
  },
  "linkedin-post": {
    required: ["topic", "tone", "goal"],
    optional: [
      "mainMessage",
      "audience",
      "authorRole",
      "brandVoice",
      "sourceDetails",
      "desiredAction",
      "language",
    ],
  },
  newsletter: {
    required: ["topic", "brand", "goal", "tone"],
    optional: [
      "audience",
      "mainMessage",
      "brandVoice",
      "desiredAction",
      "offer",
      "sourceDetails",
      "language",
    ],
  },
  "seo-meta-tags": {
    required: ["topic", "keyword", "brand", "intent"],
    optional: [
      "audience",
      "pageSummary",
      "primaryValue",
      "secondaryKeywords",
      "language",
      "market",
    ],
  },
  "x-thread": {
    required: ["topic", "tone", "audience"],
    optional: [
      "mainMessage",
      "goal",
      "tweetCount",
      "authorRole",
      "sourceDetails",
      "desiredAction",
      "language",
    ],
  },
  "case-study": {
    required: [
      "clientName",
      "clientIndustry",
      "productName",
      "challenge",
      "result",
      "tone",
    ],
    optional: [
      "productDescription",
      "implementation",
      "verifiedMetrics",
      "targetAudience",
      "desiredAction",
      "language",
    ],
  },
  "landing-page-copy": {
    required: ["productName", "productTagline", "audience", "painPoint", "tone"],
    optional: [
      "productDescription",
      "desiredOutcome",
      "confirmedBenefits",
      "differentiator",
      "desiredAction",
      "pageGoal",
      "language",
    ],
  },
  "linkedin-carousel": {
    required: ["topic", "tone", "audience"],
    optional: [
      "mainMessage",
      "goal",
      "slideCount",
      "sourceDetails",
      "desiredAction",
      "brandVoice",
      "language",
    ],
  },
  "paid-ad-copy": {
    required: ["offer", "platform", "audience", "goal"],
    optional: [
      "productName",
      "painPoint",
      "primaryBenefit",
      "tone",
      "desiredAction",
      "landingPageMessage",
      "language",
    ],
  },
  "product-description": {
    required: ["productName", "benefits", "buyer"],
    optional: [
      "productDescription",
      "features",
      "painPoint",
      "desiredOutcome",
      "tone",
      "price",
      "language",
    ],
  },
  "short-form-video": {
    required: ["topic", "platform", "duration", "tone"],
    optional: [
      "audience",
      "mainMessage",
      "goal",
      "desiredAction",
      "sourceDetails",
      "language",
    ],
  },
  "youtube-script": {
    required: ["topic", "duration", "tone"],
    optional: [
      "audience",
      "mainMessage",
      "goal",
      "videoFormat",
      "desiredAction",
      "sourceDetails",
      "channelNiche",
      "language",
    ],
  },
};

const meta = {
  "x-thread": {
    title: "X Thread",
    description:
      "Coherent numbered thread with a strong hook, useful development, and a single clear CTA",
    category: "x_thread",
    requiredPlan: "free",
  },
  "linkedin-post": {
    title: "LinkedIn Post",
    description:
      "Professional thought-leadership post with a credible hook, one clear idea, and engagement-minded close",
    category: "linkedin_post",
    requiredPlan: "free",
  },
  "instagram-post": {
    title: "Instagram Post",
    description:
      "Caption with a scroll-stopping opener, useful body, and intentional CTA",
    category: "instagram_post",
    requiredPlan: "free",
  },
  newsletter: {
    title: "Newsletter",
    description:
      "Subject, preview, and value-driven email body with one primary CTA",
    category: "newsletter",
    requiredPlan: "free",
  },
  "cold-email-outreach": {
    title: "Cold Email Outreach",
    description:
      "Concise B2B outreach under 120 words with a low-friction ask",
    category: "email",
    requiredPlan: "free",
  },
  "blog-article": {
    title: "Blog Article",
    description:
      "Publication-ready blog package: article, SEO metadata, citations, CTAs, and editorial checklist",
    category: "blog",
    requiredPlan: "free",
  },
  "seo-meta-tags": {
    title: "SEO Meta Tags",
    description:
      "Accurate title tag and meta description tuned to search intent",
    category: "seo",
    requiredPlan: "free",
  },
  "faq-page": {
    title: "FAQ Page",
    description:
      "Useful FAQ answers that reduce support load and cover real objections",
    category: "seo",
    requiredPlan: "free",
  },
  "youtube-script": {
    title: "YouTube Script",
    description:
      "Full spoken script with hook, timed sections, visuals, and production notes",
    category: "youtube",
    requiredPlan: "pro",
  },
  "short-form-video": {
    title: "Short-Form Video Script",
    description:
      "Hook-first script for TikTok, Reels, or Shorts with on-screen text cues",
    category: "youtube",
    requiredPlan: "free",
  },
  "product-description": {
    title: "Product Description",
    description:
      "Conversion-focused product copy with benefits, clarity, and honest claims",
    category: "product",
    requiredPlan: "free",
  },
  "landing-page-copy": {
    title: "Landing Page Copy",
    description:
      "Full landing page sections from hero to final CTA with conversion structure",
    category: "marketing",
    requiredPlan: "pro",
  },
  "paid-ad-copy": {
    title: "Paid Ad Copy",
    description:
      "Performance ad variants with compliant claims and clear CTAs",
    category: "marketing",
    requiredPlan: "pro",
  },
  "case-study": {
    title: "Case Study",
    description:
      "Evidence-based customer story with challenge, solution, and verified results",
    category: "marketing",
    requiredPlan: "pro",
  },
  "linkedin-carousel": {
    title: "LinkedIn Carousel",
    description:
      "Slide-by-slide carousel copy plus caption for professional swipe content",
    category: "linkedin_post",
    requiredPlan: "pro",
  },
};

const placeholders = {
  topic: "Lessons from year one of building a SaaS",
  tone: "professional, clear, human",
  audience: "solo founders and marketers",
  goal: "spark discussion and profile visits",
  language: "English",
  brand: "Creatornivo",
  brandVoice: "honest, practical, Early Access product",
  brand_voice: "honest, practical, Early Access product",
  mainMessage: "Distribution beats features early on",
  desiredAction: "comment with their biggest launch lesson",
  desired_action: "subscribe to the newsletter",
  sourceDetails: "Only use facts supplied here; do not invent metrics",
  tweetCount: "7",
  duration: "10",
  platform: "Instagram Reels",
  productName: "Creatornivo",
  productType: "AI content generation platform",
  productDescription: "Structured AI templates for creators and marketers",
  productTagline: "Structured AI templates for consistent publishing",
  painPoint: "staring at a blank page every week",
  benefits: "100 generations per month, all templates, export to .md",
  buyer: "content creators publishing weekly",
  offer: "Creatornivo Pro monthly plan",
  keyword: "AI content tools",
  primary_keyword: "content system for solo founders",
  primaryKeyword: "content system for solo founders",
  secondaryKeywords: "content workflow, solo founder marketing",
  workingTitle: "How to build a content system as a solo founder",
  articleType: "how-to guide",
  knowledgeLevel: "beginner to intermediate",
  searchIntent: "informational",
  preferredLength: "1500–2000 words",
  primaryQuestion: "How do I publish consistently without a team?",
  expectedReaderAction: "try a simple weekly content checklist",
  sources: "Only cite sources listed here; do not invent links",
  market: "US / English-speaking SaaS founders",
  intent: "informational — how-to and comparison",
  recipientRole: "Head of Marketing at a B2B SaaS startup",
  yourOffer: "AI-powered content workflow audit",
  clientName: "Acme Growth Co.",
  clientIndustry: "B2B SaaS marketing",
  challenge: "scaling content output without hiring",
  result: "3x content output in 60 days",
  slideCount: "8",
};

function buildVars(slug, prompt) {
  const c = curated[slug];
  if (!c) return [];
  const allKeys = extractVars(prompt);
  const order = [
    ...c.required,
    ...c.optional.filter((k) => !c.required.includes(k)),
  ];
  return order
    .filter((k) => allKeys.includes(k))
    .map((key) => ({
      key,
      label: humanize(key),
      placeholder: placeholders[key] || "Optional — leave blank if unknown",
      required: c.required.includes(key),
    }));
}

const existing = [];
for (const slug of Object.keys(meta)) {
  const promptPath = path.join(promptsDir, `${slug}.txt`);
  if (!fs.existsSync(promptPath)) {
    console.error("missing prompt file:", slug);
    process.exit(1);
  }
  const prompt = fs.readFileSync(promptPath, "utf8").trim();
  existing.push({
    slug,
    ...meta[slug],
    prompt,
    variables: buildVars(slug, prompt),
  });
}

function v(key, label, required, placeholder) {
  return { key, label, required: !!required, placeholder: placeholder || "" };
}

function t(def) {
  return {
    slug: def.slug,
    title: def.title,
    description: def.description,
    category: def.category,
    requiredPlan: def.requiredPlan,
    prompt: def.prompt.trim(),
    variables: def.variables,
  };
}

/** @type {ReturnType<typeof t>[]} */
const newTemplates = [];

// Loaded from separate module file to keep this manageable
const newModulePath = pathToFileURL(
  path.join(__dirname, "new-templates-data.mjs"),
).href;
const { getNewTemplates } = await import(newModulePath);
newTemplates.push(...getNewTemplates({ t, v }));

const all = [...existing, ...newTemplates];
all.sort((a, b) => {
  if (a.requiredPlan !== b.requiredPlan) {
    return a.requiredPlan === "free" ? -1 : 1;
  }
  return a.title.localeCompare(b.title);
});

const free = all.filter((x) => x.requiredPlan === "free").length;
const pro = all.filter((x) => x.requiredPlan === "pro").length;
console.log(`Total ${all.length} | Free ${free} | Pro ${pro}`);

const catalogPath = path.join(root, "prisma", "templates-catalog.json");
fs.writeFileSync(catalogPath, JSON.stringify(all, null, 2), "utf8");
console.log(
  "Wrote",
  catalogPath,
  `${(fs.statSync(catalogPath).size / 1024).toFixed(1)} KB`,
);

const summary = all.map((x) => ({
  slug: x.slug,
  title: x.title,
  category: x.category,
  plan: x.requiredPlan,
  vars: x.variables.length,
}));
fs.writeFileSync(
  path.join(root, "prisma", "templates-summary.json"),
  JSON.stringify(summary, null, 2),
);
for (const s of summary) {
  console.log(`${s.plan.toUpperCase().padEnd(4)} ${s.slug}`);
}
