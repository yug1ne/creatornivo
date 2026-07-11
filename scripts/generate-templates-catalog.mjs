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

/** Full form schemas (all prompt placeholders + UX metadata). */
const FULL_FORM_SCHEMAS = {
  "blog-article": {
    path: path.join(
      root,
      "src",
      "config",
      "template-forms",
      "blog-article-variables.json",
    ),
    buildHint: "node scripts/build-blog-article-form.mjs",
  },
  "cold-email-outreach": {
    path: path.join(
      root,
      "src",
      "config",
      "template-forms",
      "cold-email-outreach-variables.json",
    ),
    buildHint: "node scripts/build-cold-email-outreach-form.mjs",
  },
  "facebook-post": {
    path: path.join(
      root,
      "src",
      "config",
      "template-forms",
      "facebook-post-variables.json",
    ),
    buildHint: "node scripts/build-facebook-post-form.mjs",
  },
  "faq-page": {
    path: path.join(
      root,
      "src",
      "config",
      "template-forms",
      "faq-page-variables.json",
    ),
    buildHint: "node scripts/build-faq-page-form.mjs",
  },
  "google-business-profile-post": {
    path: path.join(
      root,
      "src",
      "config",
      "template-forms",
      "google-business-profile-post-variables.json",
    ),
    buildHint: "node scripts/build-google-business-profile-post-form.mjs",
  },
  "instagram-post": {
    path: path.join(
      root,
      "src",
      "config",
      "template-forms",
      "instagram-post-variables.json",
    ),
    buildHint: "node scripts/build-instagram-post-form.mjs",
  },
  "linkedin-post": {
    path: path.join(
      root,
      "src",
      "config",
      "template-forms",
      "linkedin-post-variables.json",
    ),
    buildHint: "node scripts/build-linkedin-post-form.mjs",
  },
  newsletter: {
    path: path.join(
      root,
      "src",
      "config",
      "template-forms",
      "newsletter-variables.json",
    ),
    buildHint: "node scripts/build-newsletter-form.mjs",
  },
  "product-description": {
    path: path.join(
      root,
      "src",
      "config",
      "template-forms",
      "product-description-variables.json",
    ),
    buildHint: "node scripts/build-product-description-form.mjs",
  },
  "seo-meta-tags": {
    path: path.join(
      root,
      "src",
      "config",
      "template-forms",
      "seo-meta-tags-variables.json",
    ),
    buildHint: "node scripts/build-seo-meta-tags-form.mjs",
  },
  "short-form-video": {
    path: path.join(
      root,
      "src",
      "config",
      "template-forms",
      "short-form-video-variables.json",
    ),
    buildHint: "node scripts/build-short-form-video-form.mjs",
  },
  "threads-post": {
    path: path.join(
      root,
      "src",
      "config",
      "template-forms",
      "threads-post-variables.json",
    ),
    buildHint: "node scripts/build-threads-post-form.mjs",
  },
  "x-thread": {
    path: path.join(
      root,
      "src",
      "config",
      "template-forms",
      "x-thread-variables.json",
    ),
    buildHint: "node scripts/build-x-thread-form.mjs",
  },
  "case-study": {
    path: path.join(
      root,
      "src",
      "config",
      "template-forms",
      "case-study-variables.json",
    ),
    buildHint: "node scripts/build-case-study-form.mjs",
  },
  "landing-page-copy": {
    path: path.join(
      root,
      "src",
      "config",
      "template-forms",
      "landing-page-copy-variables.json",
    ),
    buildHint: "node scripts/build-landing-page-copy-form.mjs",
  },
  "linkedin-carousel": {
    path: path.join(
      root,
      "src",
      "config",
      "template-forms",
      "linkedin-carousel-variables.json",
    ),
    buildHint: "node scripts/build-linkedin-carousel-form.mjs",
  },
  "paid-ad-copy": {
    path: path.join(
      root,
      "src",
      "config",
      "template-forms",
      "paid-ad-copy-variables.json",
    ),
    buildHint: "node scripts/build-paid-ad-copy-form.mjs",
  },
  "youtube-script": {
    path: path.join(
      root,
      "src",
      "config",
      "template-forms",
      "youtube-script-variables.json",
    ),
    buildHint: "node scripts/build-youtube-script-form.mjs",
  },
};

function loadFullFormVariables(slug) {
  const conf = FULL_FORM_SCHEMAS[slug];
  if (!conf) return null;
  if (!fs.existsSync(conf.path)) {
    console.error(`missing form schema for ${slug} — run: ${conf.buildHint}`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(conf.path, "utf8"));
  if (!Array.isArray(data.variables) || data.variables.length === 0) {
    console.error(`${path.basename(conf.path)} has no variables`);
    process.exit(1);
  }
  // Full `help` stays in JSON for the guide page only — keep catalog/DB lean.
  return data.variables.map((v) => {
    const variable = {
      key: v.key,
      label: v.label,
      placeholder: v.placeholder,
      required: Boolean(v.required),
      type: v.type || "text",
      group: v.group,
      groupTitle: v.groupTitle,
      hint: v.hint,
      options: v.options,
      fullWidth: Boolean(v.fullWidth),
      defaultValue: v.defaultValue,
      showWhen: v.showWhen,
    };

    if (slug === "threads-post") {
      variable.format = v.format;
      variable.maxLength = v.maxLength;
      variable.min = v.min;
      variable.max = v.max;
    }

    return variable;
  });
}

const curated = {
  // full-form templates use loadFullFormVariables() via FULL_FORM_SCHEMAS
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
      "Instagram-native post package: caption, format, media, CTAs — no fake engagement or invented stories",
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
      "Permission-aware B2B cold email package: sequence, personalization, compliance, and deliverability checks",
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
      "User-centered FAQ package: real questions, verified policies, plan/region limits, support routes",
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
  const fullForm = loadFullFormVariables(slug);
  if (fullForm) {
    const promptKeys = new Set(extractVars(prompt));
    const filtered = fullForm.filter((v) => promptKeys.has(v.key));
    const missing = [...promptKeys].filter(
      (k) => !filtered.some((v) => v.key === k),
    );
    if (missing.length) {
      console.warn(`${slug} form schema missing keys:`, missing.join(", "));
      for (const key of missing) {
        filtered.push({
          key,
          label: humanize(key),
          placeholder: "Optional — leave blank if unknown",
          required: false,
          type: "text",
          group: "other",
          groupTitle: "Other",
        });
      }
    }
    return filtered;
  }

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
// Apply full form schemas (including templates defined in new-templates-data.mjs)
for (const tpl of all) {
  if (FULL_FORM_SCHEMAS[tpl.slug]) {
    tpl.variables = buildVars(tpl.slug, tpl.prompt);
  }
}
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
