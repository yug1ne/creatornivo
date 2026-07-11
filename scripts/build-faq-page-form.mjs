/**
 * Builds full FAQ Page form schema from the prompt.
 * Does NOT modify the prompt text — only form metadata for UX.
 *
 * Usage: node scripts/build-faq-page-form.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const promptPath = path.join(root, "prisma", "template-prompts", "faq-page.txt");
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "faq-page-variables.json",
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

function mapVarsToSections(prompt) {
  const lines = prompt.split(/\r?\n/);
  let section = "other";
  const map = {};
  const sectionRe = /^([A-Z][A-Z0-9 /&,-]{3,})$/;
  const varRe = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  for (const line of lines) {
    const t = line.trim();
    if (sectionRe.test(t) && !t.includes("{{")) section = t;
    let m;
    while ((m = varRe.exec(line))) {
      if (!map[m[1]]) map[m[1]] = section;
    }
  }
  return map;
}

const GROUP_META = {
  essentials: {
    id: "essentials",
    title: "Essentials",
    description: "Minimum inputs for a useful, accurate FAQ draft.",
    defaultOpen: true,
  },
  "FAQ PROJECT INFORMATION": {
    id: "project",
    title: "FAQ project",
    description: "Page type, purpose, length, tone, and ownership.",
    defaultOpen: true,
  },
  "WEBSITE OR PRODUCT INFORMATION": {
    id: "product",
    title: "Website / product",
    description: "What the FAQ is about — stage, platforms, support links.",
    defaultOpen: true,
  },
  "AUDIENCE INFORMATION": {
    id: "audience",
    title: "Audience",
    description: "Who asks these questions and what confuses them.",
    defaultOpen: true,
  },
  "QUESTION SOURCES": {
    id: "question_sources",
    title: "Question sources",
    description: "Where real questions come from — avoid inventing “frequent” asks.",
    defaultOpen: false,
  },
  "FACTUAL INFORMATION": {
    id: "facts",
    title: "Approved facts",
    description: "Only verified product, policy, and support facts.",
    defaultOpen: false,
  },
  "HIGH-STAKES CONTENT": {
    id: "high_stakes",
    title: "High-stakes content",
    description: "Medical, legal, financial, and other regulated FAQ topics.",
    defaultOpen: false,
  },
  "FAQ SEARCH": {
    id: "faq_search",
    title: "FAQ search",
    description: "Search, synonyms, zero-result handling, and privacy.",
    defaultOpen: false,
  },
  "ACCORDION AND DISCLOSURE COMPONENTS": {
    id: "accordion",
    title: "Accordion & format",
    description: "How the FAQ is presented and navigated.",
    defaultOpen: false,
  },
  "PAGE INTRODUCTION": {
    id: "intro",
    title: "Page introduction",
    description: "Support destination used in the intro.",
    defaultOpen: false,
  },
  "SEO INFORMATION": {
    id: "seo",
    title: "SEO",
    description: "Keywords, titles, slug, and cannibalization notes.",
    defaultOpen: false,
  },
  "STRUCTURED DATA": {
    id: "structured_data",
    title: "Structured data",
    description: "FAQ schema only when visible content matches.",
    defaultOpen: false,
  },
  "CONTENT DUPLICATION": {
    id: "duplication",
    title: "Content duplication",
    description: "Canonical page and migration notes.",
    defaultOpen: false,
  },
  "CONTENT GOVERNANCE": {
    id: "governance",
    title: "Content governance",
    description: "Owners, review cadence, and update process.",
    defaultOpen: false,
  },
  FRESHNESS: {
    id: "freshness",
    title: "Freshness",
    description: "Review intervals and change triggers.",
    defaultOpen: false,
  },
  CORRECTIONS: {
    id: "corrections",
    title: "Corrections",
    description: "How incorrect FAQ answers are fixed.",
    defaultOpen: false,
  },
  "LOCALIZATION VARIABLES": {
    id: "localization",
    title: "Localization",
    description: "Locale-specific FAQ variables.",
    defaultOpen: false,
  },
  "PLURALIZATION AND DYNAMIC VALUES": {
    id: "pluralization",
    title: "Pluralization & dynamic values",
    description: "Count-sensitive and dynamic answer fields.",
    defaultOpen: false,
  },
  "PRINT AND EXPORT": {
    id: "print_export",
    title: "Print & export",
    description: "Print and PDF support.",
    defaultOpen: false,
  },
  "VISUAL CONTENT": {
    id: "visuals",
    title: "Visual content",
    description: "Screenshots, captions, alt text, rights.",
    defaultOpen: false,
  },
  "CHATBOT AND FAQ CONNECTION": {
    id: "chatbot",
    title: "Chatbot connection",
    description: "When the FAQ feeds a chatbot.",
    defaultOpen: false,
  },
  ANALYTICS: {
    id: "analytics",
    title: "Analytics",
    description: "Success and guardrail metrics.",
    defaultOpen: false,
  },
  "USER FEEDBACK": {
    id: "feedback",
    title: "User feedback",
    description: "Was this helpful and follow-up process.",
    defaultOpen: false,
  },
  "FAQ MARKETING RESTRICTIONS": {
    id: "marketing_restrictions",
    title: "Marketing restrictions",
    description: "Claims the FAQ must never make.",
    defaultOpen: false,
  },
  other: {
    id: "other",
    title: "Other",
    description: "Additional parameters.",
    defaultOpen: false,
  },
};

const ESSENTIAL_KEYS = [
  "productName",
  "productType",
  "productDescription",
  "audience",
  "language",
  "tone",
  "faqPageType",
  "faqPurpose",
  "primaryUserTask",
  "primaryQuestions",
  "sourceDetails",
  "brandVoice",
  "knownLimitations",
  "supportUrl",
];

const REQUIRED = new Set([
  "productName",
  "productType",
  "productDescription",
  "audience",
  "language",
  "tone",
]);

const FAQ_PAGE_TYPES = [
  "general company FAQ",
  "product FAQ",
  "service FAQ",
  "SaaS FAQ",
  "mobile-app FAQ",
  "technical FAQ",
  "help-center FAQ",
  "onboarding FAQ",
  "account FAQ",
  "billing FAQ",
  "subscription FAQ",
  "pricing FAQ",
  "free-trial FAQ",
  "cancellation FAQ",
  "refund FAQ",
  "shipping FAQ",
  "delivery FAQ",
  "returns FAQ",
  "warranty FAQ",
  "marketplace FAQ",
  "seller FAQ",
  "buyer FAQ",
  "event FAQ",
  "webinar FAQ",
  "course FAQ",
  "membership FAQ",
  "community FAQ",
  "booking FAQ",
  "appointment FAQ",
  "travel FAQ",
  "donation FAQ",
  "nonprofit FAQ",
  "partnership FAQ",
  "affiliate FAQ",
  "security FAQ",
  "privacy FAQ",
  "data-processing FAQ",
  "compliance FAQ",
  "accessibility FAQ",
  "implementation FAQ",
  "integration FAQ",
  "migration FAQ",
  "troubleshooting FAQ",
  "product-launch FAQ",
  "incident FAQ",
  "policy-change FAQ",
  "internal employee FAQ",
  "custom confirmed FAQ type",
];

const PUBLICATION_STATUSES = [
  "research",
  "question collection",
  "internal draft",
  "product review",
  "support review",
  "technical review",
  "legal review",
  "privacy review",
  "security review",
  "accessibility review",
  "localization review",
  "approved",
  "published",
  "updated",
  "archived",
];

const PRODUCT_STAGES = [
  "concept",
  "prototype",
  "alpha",
  "beta",
  "Early Access",
  "limited release",
  "phased rollout",
  "general availability",
  "temporarily unavailable",
  "discontinued",
  "planned",
];

const YES_NO = ["yes", "no", "unknown / not applicable"];

const TEXTAREA_HINTS = [
  "Description",
  "Questions",
  "Concerns",
  "Objections",
  "Misconceptions",
  "Needs",
  "Sources",
  "Tickets",
  "Queries",
  "Data",
  "Information",
  "Facts",
  "Pricing",
  "Details",
  "Limitations",
  "Uncertainties",
  "Claims",
  "Wording",
  "Disclaimers",
  "Definitions",
  "Statistics",
  "Cases",
  "UseCases",
  "Platforms",
  "Devices",
  "Browsers",
  "Regions",
  "Countries",
  "Languages",
  "Merge",
  "Remove",
  "Escalation",
];

function looksLikeTextarea(key, label) {
  if (key.length > 24) return true;
  return TEXTAREA_HINTS.some(
    (h) =>
      key.toLowerCase().includes(h.toLowerCase().replace(/\s/g, "")) ||
      label.includes(h),
  );
}

const CURATED = {
  projectName: {
    placeholder: "Internal — Creatornivo product FAQ refresh",
  },
  faqPageTitle: {
    placeholder: "Creatornivo FAQ",
  },
  faqPageType: {
    type: "select",
    options: FAQ_PAGE_TYPES,
    placeholder: "SaaS FAQ",
    hint: "Pick one confirmed type — do not switch just to make writing easier.",
    what: "Confirmed FAQ page type.",
    why: "Structure and question mix depend on type (billing vs product vs privacy).",
    example: "SaaS FAQ",
    avoid: "Turning a support FAQ into a promotional feature list.",
  },
  faqPurpose: {
    placeholder: "Answer common product and billing questions before support",
    hint: "Primary job of this FAQ page.",
  },
  secondaryPurpose: {
    placeholder: "Reduce avoidable tickets / clarify Early Access limits",
  },
  primaryUserTask: {
    placeholder: "Understand plans, quotas, and how generation works",
  },
  businessGoal: {
    placeholder: "Lower support load without hiding limitations",
  },
  preferredLength: {
    placeholder: "12–20 questions, scannable groups",
  },
  maximumQuestions: { placeholder: "20" },
  minimumQuestions: { placeholder: "8" },
  language: {
    placeholder: "English",
    hint: "Language of questions and answers.",
  },
  targetLocale: { placeholder: "en-US" },
  tone: {
    placeholder: "clear, calm, helpful, no hype",
    hint: "How answers should sound.",
  },
  brandVoice: {
    placeholder: "honest Early Access — real limits, no fake guarantees",
  },
  readingLevel: {
    type: "select",
    options: [
      "plain language",
      "general professional",
      "technical",
      "mixed (define sections)",
    ],
    placeholder: "plain language",
  },
  publicationStatus: {
    type: "select",
    options: PUBLICATION_STATUSES,
    placeholder: "internal draft",
    hint: "Do not mark unreviewed FAQs as final.",
  },
  publicationDate: { placeholder: "YYYY-MM-DD or TBD" },
  contentOwner: { placeholder: "Who owns FAQ content" },
  reviewOwner: { placeholder: "Who reviews before publish" },
  lastReviewedDate: { placeholder: "YYYY-MM-DD" },
  nextReviewDate: { placeholder: "YYYY-MM-DD or +quarter" },
  productName: {
    placeholder: "Creatornivo",
    hint: "Product or site the FAQ is about.",
    what: "Website or product name.",
    why: "Answers must match the real product name and scope.",
    example: "Creatornivo",
    avoid: "Vague “our platform” without naming the product.",
  },
  brandName: { placeholder: "Creatornivo" },
  legalName: { placeholder: "Legal entity if different" },
  websiteUrl: { placeholder: "https://www.creatornivo.com" },
  faqUrl: { placeholder: "https://www.creatornivo.com/…/faq" },
  productType: {
    placeholder: "SaaS content generation tool",
    hint: "What kind of product this is.",
  },
  businessType: { placeholder: "B2B SaaS / creator tools" },
  productDescription: {
    type: "textarea",
    placeholder: "Short accurate description — Early Access status if true",
    hint: "Only real capabilities.",
  },
  primaryUseCase: {
    placeholder: "Generate structured content with templates",
  },
  secondaryUseCases: {
    type: "textarea",
    placeholder: "Other real use cases",
  },
  targetUsers: {
    placeholder: "Founders, marketers, content teams",
  },
  operatingRegions: { placeholder: "English-speaking markets" },
  supportedCountries: { placeholder: "Where the product operates" },
  supportedLanguages: { placeholder: "English UI / generation languages" },
  supportedPlatforms: { placeholder: "Web app" },
  supportedDevices: { placeholder: "Desktop and mobile browsers" },
  supportedBrowsers: { placeholder: "Modern Chrome, Safari, Firefox, Edge" },
  productStage: {
    type: "select",
    options: PRODUCT_STAGES,
    placeholder: "Early Access",
    hint: "Never describe planned features as generally available.",
  },
  availability: { placeholder: "Available now with Free + Pro" },
  businessModel: { placeholder: "Free tier + Pro subscription" },
  contactDestination: {
    placeholder: "support@… or contact form URL",
  },
  helpCenterUrl: { placeholder: "Help center URL if any" },
  supportUrl: {
    placeholder: "Where users contact support",
    hint: "FAQ should not hide support routes.",
  },
  statusPageUrl: { placeholder: "Status page if any" },
  documentationUrl: { placeholder: "Docs URL if any" },
  audience: {
    placeholder: "new and existing Creatornivo users",
    hint: "Primary people reading the FAQ.",
  },
  secondaryAudience: { placeholder: "prospects evaluating the product" },
  audienceSegment: { placeholder: "Free users / Pro / both" },
  knowledgeLevel: {
    type: "select",
    options: ["beginner", "intermediate", "advanced", "mixed"],
    placeholder: "mixed",
  },
  lifecycleStage: {
    type: "select",
    options: [
      "pre-signup",
      "onboarding",
      "active use",
      "billing decision",
      "cancellation consideration",
      "mixed",
    ],
    placeholder: "mixed",
  },
  userStatus: {
    type: "select",
    options: ["new", "existing", "mixed", "unknown"],
    placeholder: "mixed",
  },
  customerStatus: {
    type: "select",
    options: ["prospects", "customers", "mixed"],
    placeholder: "mixed",
  },
  subscriptionStatus: {
    type: "select",
    options: ["free", "pro", "mixed", "not applicable"],
    placeholder: "mixed",
  },
  accountStatus: {
    type: "select",
    options: ["no account", "has account", "mixed"],
    placeholder: "mixed",
  },
  audienceRegion: { placeholder: "Primary region of readers" },
  audienceLanguage: { placeholder: "English" },
  painPoint: {
    placeholder: "Unclear quotas, plans, and what Free includes",
  },
  primaryQuestions: {
    type: "textarea",
    placeholder: "Real questions users ask — one per line",
    hint: "Prefer evidence-based questions, not keyword bait.",
  },
  secondaryQuestions: {
    type: "textarea",
    placeholder: "Secondary questions to cover if space",
  },
  concerns: {
    type: "textarea",
    placeholder: "Privacy, pricing, reliability concerns",
  },
  objections: {
    type: "textarea",
    placeholder: "Why they might not trust or buy",
  },
  misconceptions: {
    type: "textarea",
    placeholder: "e.g. unlimited generations, guaranteed ranking",
  },
  accessibilityNeeds: {
    type: "textarea",
    placeholder: "Plain language, keyboard-friendly accordions, etc.",
  },
  excludedAudience: {
    placeholder: "Who this FAQ is not for",
  },
  questionSources: {
    type: "textarea",
    placeholder: "Support tickets, sales calls, onboarding — list sources",
  },
  supportTickets: {
    type: "textarea",
    placeholder: "Themes from real tickets",
  },
  searchQueries: {
    type: "textarea",
    placeholder: "Real search queries if available",
  },
  siteSearchData: {
    type: "textarea",
    placeholder: "Site search terms if available",
  },
  salesQuestions: {
    type: "textarea",
    placeholder: "Questions from sales conversations",
  },
  onboardingQuestions: {
    type: "textarea",
    placeholder: "New-user questions",
  },
  productQuestions: {
    type: "textarea",
    placeholder: "Product feedback questions",
  },
  communityQuestions: {
    type: "textarea",
    placeholder: "Community / forum questions",
  },
  socialQuestions: {
    type: "textarea",
    placeholder: "Social comments or DMs themes",
  },
  forumQuestions: {
    type: "textarea",
    placeholder: "Forum threads if any",
  },
  reviewQuestions: {
    type: "textarea",
    placeholder: "Questions from reviews",
  },
  interviewQuestions: {
    type: "textarea",
    placeholder: "Customer interview questions",
  },
  chatbotQuestions: {
    type: "textarea",
    placeholder: "Chatbot top intents if any",
  },
  internalQuestions: {
    type: "textarea",
    placeholder: "Questions internal teams get asked",
  },
  legalQuestions: {
    type: "textarea",
    placeholder: "Privacy, refund, terms questions",
  },
  searchQuestionData: {
    type: "textarea",
    placeholder: "SEO question data — only if real",
  },
  competitorFaqs: {
    type: "textarea",
    placeholder: "Competitor FAQ themes for gaps — do not copy",
  },
  existingQuestions: {
    type: "textarea",
    placeholder: "Current live FAQ questions",
  },
  questionsToRemove: {
    type: "textarea",
    placeholder: "Outdated or promotional-only questions",
  },
  questionsToMerge: {
    type: "textarea",
    placeholder: "Duplicates to combine",
  },
  questionsForEscalation: {
    type: "textarea",
    placeholder: "Need product/legal decision before answering",
  },
  sourceDetails: {
    type: "textarea",
    placeholder: "Approved facts the FAQ may state as true",
    hint: "Missing facts → model should mark verify, not invent.",
  },
  productFacts: {
    type: "textarea",
    placeholder: "Confirmed product behavior",
  },
  serviceFacts: {
    type: "textarea",
    placeholder: "Service-level facts if any",
  },
  featureInformation: {
    type: "textarea",
    placeholder: "Feature availability by plan if known",
  },
  approvedPricing: {
    type: "textarea",
    placeholder: "Only current approved prices",
  },
  billingInformation: {
    type: "textarea",
    placeholder: "Billing cycles, taxes — only if confirmed",
  },
  subscriptionInformation: {
    type: "textarea",
    placeholder: "Upgrade, downgrade, renewals — verified only",
  },
  shippingInformation: {
    type: "textarea",
    placeholder: "If physical goods; else leave blank",
  },
  returnsInformation: {
    type: "textarea",
    placeholder: "Returns policy if applicable",
  },
  refundInformation: {
    type: "textarea",
    placeholder: "Refund rules — do not invent",
  },
  warrantyInformation: {
    type: "textarea",
    placeholder: "Warranty if applicable",
  },
  securityInformation: {
    type: "textarea",
    placeholder: "Approved security statements only",
  },
  privacyInformation: {
    type: "textarea",
    placeholder: "Approved privacy / data handling facts",
  },
  accessibilityInformation: {
    type: "textarea",
    placeholder: "Approved a11y facts",
  },
  supportInformation: {
    type: "textarea",
    placeholder: "Channels, hours — only if true",
  },
  legalInformation: {
    type: "textarea",
    placeholder: "Approved legal wording",
  },
  technicalInformation: {
    type: "textarea",
    placeholder: "Technical setup facts",
  },
  approvedDates: { placeholder: "Confirmed policy effective dates" },
  approvedStatistics: {
    type: "textarea",
    placeholder: "Only verified stats with sources",
  },
  approvedDefinitions: {
    type: "textarea",
    placeholder: "Terms that must be defined exactly",
  },
  requiredWording: {
    type: "textarea",
    placeholder: "Legally required phrases",
  },
  requiredDisclaimers: {
    type: "textarea",
    placeholder: "Required disclaimers",
  },
  knownLimitations: {
    type: "textarea",
    placeholder: "Quotas, Beta limits, unsupported use cases",
  },
  uncertainties: {
    type: "textarea",
    placeholder: "Unresolved product decisions",
  },
  conflictingInformation: {
    type: "textarea",
    placeholder: "Where docs disagree",
  },
  unverifiedDetails: {
    type: "textarea",
    placeholder: "Needs verification before publish",
  },
  prohibitedClaims: {
    type: "textarea",
    placeholder: "Claims marketing forbids",
  },
  confidentialInformation: {
    type: "textarea",
    placeholder: "Do not publish",
  },
  sensitiveInformation: {
    type: "textarea",
    placeholder: "Handle carefully / omit",
  },
  highStakesCategory: {
    type: "select",
    options: [
      "none",
      "medical",
      "mental health",
      "legal",
      "financial",
      "tax",
      "insurance",
      "credit",
      "employment",
      "immigration",
      "cybersecurity",
      "personal safety",
      "emergency services",
      "child safety",
      "regulated products",
      "other",
    ],
    placeholder: "none",
  },
  jurisdiction: { placeholder: "US / EU / not applicable" },
  professionalReview: {
    type: "select",
    options: ["yes", "no", "unknown / not applicable"],
    placeholder: "no",
  },
  requiredDisclaimer: {
    type: "textarea",
    placeholder: "Approved disclaimer if high-stakes",
  },
  professionalResources: {
    type: "textarea",
    placeholder: "Approved professional / emergency resources only",
  },
  emergencyInformation: {
    type: "textarea",
    placeholder: "Verified emergency info only — never invent",
  },
  faqSearchAvailable: {
    type: "select",
    options: ["yes", "no", "unknown / not applicable"],
    placeholder: "unknown / not applicable",
  },
  searchImplementation: { placeholder: "Client filter / Algolia / CMS search" },
  searchScope: {
    type: "textarea",
    placeholder: "What is indexed (visible Q&A only)",
  },
  synonymSupport: {
    type: "select",
    options: ["yes", "no", "unknown / not applicable"],
    placeholder: "unknown / not applicable",
  },
  typoTolerance: {
    type: "select",
    options: ["yes", "no", "unknown / not applicable"],
    placeholder: "unknown / not applicable",
  },
  searchAnalytics: {
    type: "textarea",
    placeholder: "What is tracked — avoid sensitive queries",
  },
  zeroResultHandling: {
    type: "textarea",
    placeholder: "Suggested recovery when nothing matches",
  },
  searchPrivacy: {
    type: "textarea",
    placeholder: "Query logging limits / retention",
  },
  faqFormat: {
    type: "select",
    options: [
      "accordion",
      "categorized static page",
      "help-center collection",
      "searchable knowledge base",
      "tabbed categories",
      "sidebar navigation",
      "single-topic FAQ",
      "hybrid page",
    ],
    placeholder: "accordion",
  },
  accordionEnabled: {
    type: "select",
    options: ["yes", "no", "unknown / not applicable"],
    placeholder: "yes",
  },
  multipleOpen: {
    type: "select",
    options: ["yes", "no", "unknown / not applicable"],
    placeholder: "yes",
  },
  deepLinks: {
    type: "select",
    options: ["yes", "no", "unknown / not applicable"],
    placeholder: "yes",
  },
  expandAll: {
    type: "select",
    options: ["yes", "no", "unknown / not applicable"],
    placeholder: "no",
  },
  searchFiltering: {
    type: "select",
    options: ["yes", "no", "unknown / not applicable"],
    placeholder: "unknown / not applicable",
  },
  printView: {
    type: "select",
    options: ["yes", "no", "unknown / not applicable"],
    placeholder: "unknown / not applicable",
  },
  anchorNavigation: {
    type: "select",
    options: ["yes", "no", "unknown / not applicable"],
    placeholder: "yes",
  },
  approvedSupportDestination: {
    placeholder: "support form / email — confirmed only",
    hint: "Used in the page introduction when directing account-specific help.",
  },
  primaryKeyword: { placeholder: "Creatornivo FAQ / billing FAQ" },
  secondaryKeywords: { placeholder: "account, pricing, cancel subscription" },
  questionKeywords: {
    type: "textarea",
    placeholder: "how do I cancel, how many generations",
  },
  relatedEntities: { placeholder: "Free plan, Pro, Paddle, templates" },
  searchIntent: {
    type: "select",
    options: [
      "informational",
      "navigational",
      "commercial investigation",
      "transactional",
      "troubleshooting",
      "mixed",
    ],
    placeholder: "informational",
  },
  topicCluster: { placeholder: "Product help / billing help" },
  rankingPage: { placeholder: "Existing ranking URL if any" },
  cannibalizationRisk: {
    type: "textarea",
    placeholder: "Other pages covering the same queries",
  },
  seoTitleRequired: {
    type: "select",
    options: ["yes", "no"],
    placeholder: "yes",
  },
  metaDescriptionRequired: {
    type: "select",
    options: ["yes", "no"],
    placeholder: "yes",
  },
  slugRequired: {
    type: "select",
    options: ["yes", "no"],
    placeholder: "yes",
  },
  structuredDataRequested: {
    type: "select",
    options: ["yes", "no", "unknown / not applicable"],
    placeholder: "yes",
  },
  structuredDataImplementation: {
    placeholder: "CMS / developer / none",
  },
  schemaSupport: {
    type: "textarea",
    placeholder: "What the site can emit for FAQ schema",
  },
  visibleContentConfirmed: {
    type: "select",
    options: ["yes", "no", "unknown / not applicable"],
    placeholder: "yes",
  },
  searchEngineReview: {
    type: "select",
    options: ["yes", "no", "unknown / not applicable"],
    placeholder: "unknown / not applicable",
  },
  faqOwner: { placeholder: "Content owner for the FAQ page" },
  categoryOwners: {
    type: "textarea",
    placeholder: "Billing: X · Product: Y · Privacy: Z",
  },
  reviewInterval: { placeholder: "quarterly / on release" },
  updateProcess: {
    type: "textarea",
    placeholder: "How answers are updated and approved",
  },
  correctionProcess: {
    type: "textarea",
    placeholder: "How wrong answers are fixed",
  },
  archivingProcess: {
    type: "textarea",
    placeholder: "How obsolete answers are retired",
  },
  emergencyUpdateProcess: {
    type: "textarea",
    placeholder: "Incident / outage FAQ update process",
  },
  primaryMetric: { placeholder: "deflection rate / successful self-service" },
  secondaryMetrics: { placeholder: "search success, feedback score" },
  guardrailMetrics: {
    type: "textarea",
    placeholder: "unresolved queries, outdated-answer reports",
  },
  feedbackEnabled: {
    type: "select",
    options: ["yes", "no", "unknown / not applicable"],
    placeholder: "unknown / not applicable",
  },
  chatbotUsesFaq: {
    type: "select",
    options: ["yes", "no", "unknown / not applicable"],
    placeholder: "no",
  },
};

function defaultHelp(key, label, section) {
  return {
    what: `${label} — a parameter from the FAQ Page brief (${section}).`,
    why: `When provided, the model uses this instead of inventing product behavior, policies, or “frequent” questions. Empty fields stay unset ([${key}]).`,
    example: `A short, factual value for ${label.toLowerCase()} you can defend with product or support evidence.`,
    avoid: `Invented prices, guarantees, response times, or promotional fake FAQs for ${label.toLowerCase()}.`,
  };
}

function resolveGroupMeta(sectionName) {
  if (GROUP_META[sectionName]) return GROUP_META[sectionName];
  if (!sectionName || sectionName === "other") return GROUP_META.other;
  const id = sectionName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
  return {
    id: id || "other",
    title: sectionName
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    description: "Parameters from this prompt section.",
    defaultOpen: false,
  };
}

function buildField(key, sectionName) {
  const curated = CURATED[key] || {};
  const label = curated.label || humanize(key);
  const groupMeta = resolveGroupMeta(sectionName);

  let type = curated.type || "text";
  if (!curated.type && looksLikeTextarea(key, label)) type = "textarea";

  const options = curated.options;

  const helpBase = defaultHelp(key, label, groupMeta.title);
  const help = {
    what: curated.what || helpBase.what,
    why: curated.why || helpBase.why,
    example: curated.example || curated.placeholder || helpBase.example,
    avoid: curated.avoid || helpBase.avoid,
  };

  return {
    key,
    label,
    placeholder:
      curated.placeholder || "Optional — leave blank if unknown",
    required: REQUIRED.has(key),
    type,
    group: groupMeta.id,
    groupTitle: groupMeta.title,
    hint: curated.hint || help.what,
    help,
    options,
    fullWidth: type === "textarea" || Boolean(curated.fullWidth),
  };
}

function main() {
  const prompt = fs.readFileSync(promptPath, "utf8");
  const keys = extractVars(prompt);
  const sectionMap = mapVarsToSections(prompt);

  if (keys.length === 0) {
    console.error("No variables found in prompt");
    process.exit(1);
  }

  const essentialsSet = new Set(
    ESSENTIAL_KEYS.filter((k) => keys.includes(k)),
  );
  const fields = [];

  for (const key of ESSENTIAL_KEYS) {
    if (!keys.includes(key)) continue;
    const field = buildField(
      key,
      sectionMap[key] || "FAQ PROJECT INFORMATION",
    );
    field.group = "essentials";
    field.groupTitle = GROUP_META.essentials.title;
    fields.push(field);
  }

  const sectionOrder = Object.keys(GROUP_META).filter(
    (k) => k !== "essentials" && k !== "other",
  );
  const remaining = keys.filter((k) => !essentialsSet.has(k));

  for (const section of sectionOrder) {
    const sectionKeys = remaining
      .filter((k) => sectionMap[k] === section)
      .sort((a, b) => a.localeCompare(b));
    for (const key of sectionKeys) {
      fields.push(buildField(key, section));
    }
  }

  const unsectioned = remaining.filter(
    (k) => !sectionOrder.includes(sectionMap[k]),
  );
  for (const key of unsectioned.sort()) {
    fields.push(buildField(key, sectionMap[key] || "other"));
  }

  const seen = new Set(fields.map((f) => f.key));
  for (const key of keys) {
    if (!seen.has(key)) {
      fields.push(buildField(key, sectionMap[key] || "other"));
    }
  }

  const groupById = new Map();
  for (const f of fields) {
    if (!groupById.has(f.group)) {
      const meta = resolveGroupMeta(
        Object.entries(GROUP_META).find(([, g]) => g.id === f.group)?.[0] ||
          f.groupTitle ||
          f.group,
      );
      // Prefer metadata already stamped on the field
      groupById.set(f.group, {
        id: f.group,
        title: f.groupTitle || meta.title,
        description: meta.description,
        defaultOpen: Boolean(
          GROUP_META[
            Object.keys(GROUP_META).find((k) => GROUP_META[k].id === f.group)
          ]?.defaultOpen,
        ),
      });
    }
  }

  // Preserve essentials-first order, then section order, then remaining
  const preferredOrder = [
    "essentials",
    ...sectionOrder.map((s) => resolveGroupMeta(s).id),
    "other",
  ];
  const filteredGroups = [];
  const seenG = new Set();
  for (const id of preferredOrder) {
    if (groupById.has(id) && !seenG.has(id)) {
      filteredGroups.push(groupById.get(id));
      seenG.add(id);
    }
  }
  for (const [id, g] of groupById) {
    if (!seenG.has(id)) filteredGroups.push(g);
  }

  const payload = {
    slug: "faq-page",
    title: "FAQ Page",
    version: 2,
    generatedAt: new Date().toISOString(),
    fieldCount: fields.length,
    requiredKeys: [...REQUIRED].filter((k) => keys.includes(k)),
    groups: filteredGroups,
    variables: fields,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(
    `Wrote ${outPath} — ${fields.length} fields, ${filteredGroups.length} groups, required: ${payload.requiredKeys.join(", ")}`,
  );
}

main();
