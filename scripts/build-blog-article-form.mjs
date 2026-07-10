/**
 * Builds full Blog Article form schema (variables + help) from the prompt.
 * Does NOT modify the prompt text — only form metadata for UX.
 *
 * Usage: node scripts/build-blog-article-form.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const promptPath = path.join(root, "prisma", "template-prompts", "blog-article.txt");
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "blog-article-variables.json",
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
    description: "Fill these first — enough for a solid draft.",
    defaultOpen: true,
  },
  "ARTICLE INFORMATION": {
    id: "article",
    title: "Article information",
    description: "Type, goals, length, tone, and publication context.",
    defaultOpen: true,
  },
  "WEBSITE INFORMATION": {
    id: "website",
    title: "Website & brand",
    description: "Where the article will live and how the site converts.",
    defaultOpen: false,
  },
  "AUTHOR AND EXPERT INFORMATION": {
    id: "author",
    title: "Author & experts",
    description: "Only real people and credentials you can verify.",
    defaultOpen: false,
  },
  "AUDIENCE INFORMATION": {
    id: "audience",
    title: "Audience",
    description: "Who reads this, what they need, and what confuses them.",
    defaultOpen: true,
  },
  "SEARCH INTENT": {
    id: "search_intent",
    title: "Search intent",
    description: "What the reader expects after searching.",
    defaultOpen: true,
  },
  "KEYWORD INFORMATION": {
    id: "keywords",
    title: "Keywords & SEO inputs",
    description: "Use real keyword data only — never invent metrics.",
    defaultOpen: false,
  },
  "SERP AND COMPETITIVE CONTEXT": {
    id: "serp",
    title: "SERP & competition",
    description: "What already ranks and how you will differ.",
    defaultOpen: false,
  },
  "SOURCE INFORMATION": {
    id: "sources",
    title: "Sources",
    description: "Approved materials the model may cite.",
    defaultOpen: false,
  },
  "RESEARCH REQUIREMENTS": {
    id: "research",
    title: "Research requirements",
    description: "What must be verified before publishing.",
    defaultOpen: false,
  },
  "FACTS AND CLAIMS": {
    id: "facts",
    title: "Facts & claims",
    description: "Approved facts only — leave blank if unknown.",
    defaultOpen: false,
  },
  MONETIZATION: {
    id: "monetization",
    title: "Monetization & disclosure",
    description: "Affiliate, sponsor, and commercial relationships.",
    defaultOpen: false,
  },
  "CALL TO ACTION": {
    id: "cta",
    title: "Calls to action",
    description: "Primary and secondary next steps for the reader.",
    defaultOpen: false,
  },
  "YMYL AND HIGH-STAKES CONTENT": {
    id: "high_stakes",
    title: "High-stakes / YMYL",
    description: "Medical, legal, financial, or safety-sensitive topics.",
    defaultOpen: false,
  },
  "VISUAL CONTENT": {
    id: "visuals",
    title: "Visuals",
    description: "Images, charts, and licensing constraints.",
    defaultOpen: false,
  },
  "RIGHT-TO-LEFT CONTENT": {
    id: "localization_extra",
    title: "RTL & localization extras",
    description: "Right-to-left and locale-specific notes.",
    defaultOpen: false,
  },
  FRESHNESS: {
    id: "freshness",
    title: "Freshness & updates",
    description: "Review dates and changeable information.",
    defaultOpen: false,
  },
  "CANONICALIZATION AND DUPLICATION": {
    id: "canonical",
    title: "Canonical & syndication",
    description: "Duplicate pages and republishing plans.",
    defaultOpen: false,
  },
  "STRUCTURED DATA": {
    id: "structured_data",
    title: "Structured data",
    description: "Schema recommendations only — not code unless requested.",
    defaultOpen: false,
  },
  "CONTENT PERFORMANCE": {
    id: "performance",
    title: "Performance metrics",
    description: "How you will measure success after publish.",
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
  "topic",
  "primaryKeyword",
  "audience",
  "language",
  "articleType",
  "searchIntent",
  "tone",
  "brandVoice",
  "primaryQuestion",
  "painPoint",
  "preferredLength",
  "sources",
  "sourceDetails",
];

const REQUIRED = new Set([
  "topic",
  "primaryKeyword",
  "audience",
  "language",
]);

const ARTICLE_TYPES = [
  "informational article",
  "educational article",
  "how-to guide",
  "step-by-step tutorial",
  "beginner’s guide",
  "advanced guide",
  "ultimate guide",
  "pillar page",
  "supporting cluster article",
  "list article",
  "checklist",
  "comparison article",
  "alternatives article",
  "product review",
  "service review",
  "buying guide",
  "recommendation article",
  "case study",
  "original research article",
  "data analysis",
  "trend analysis",
  "news article",
  "news analysis",
  "opinion article",
  "thought-leadership article",
  "interview article",
  "expert roundup",
  "FAQ article",
  "glossary article",
  "definition article",
  "troubleshooting guide",
  "template article",
  "resource collection",
  "industry report",
  "event recap",
  "company blog update",
  "customer-education article",
  "product-led educational article",
  "sponsored article",
  "affiliate article",
  "custom confirmed type",
];

const SEARCH_INTENTS = [
  "informational",
  "navigational",
  "commercial investigation",
  "transactional",
  "local",
  "troubleshooting",
  "comparison",
  "educational",
  "news or freshness-driven",
  "mixed intent",
];

const YES_NO = ["yes", "no", "unknown / not applicable"];

const YES_NO_KEYS = new Set([
  "expertReview",
  "medicalReview",
  "legalReview",
  "financialReview",
  "researchRequired",
  "internetAccess",
  "currentCheckRequired",
  "dataAnalysisRequired",
  "expertInterviewRequired",
  "productTestingRequired",
  "legalVerificationRequired",
  "medicalVerificationRequired",
  "financialVerificationRequired",
  "regionalVerificationRequired",
  "immediateAnswerRequired",
  "decisionSupportRequired",
  "commercialInvestigation",
  "transactionalSupport",
  "localIntent",
  "affiliateLinks",
  "sponsoredContent",
  "ownedProduct",
  "displayAdvertising",
  "paidPlacement",
  "paywalledSources",
  "archiveLinks",
  "stockImagesAllowed",
  "aiImagesAllowed",
  "rtlSupport",
  "structuredDataRequested",
  "professionalReviewRequired",
  "syndication",
]);

const TEXTAREA_KEYS = new Set([
  "websiteDescription",
  "brandPositioning",
  "editorialStandards",
  "styleGuide",
  "existingArticles",
  "topicCluster",
  "websiteExpertise",
  "excludedTopics",
  "authorBio",
  "authorCredentials",
  "authorExperience",
  "authorRelationship",
  "personalExperience",
  "expertCredentials",
  "secondaryPainPoints",
  "secondaryQuestions",
  "concerns",
  "objections",
  "misconceptions",
  "culturalContext",
  "accessibilityNeeds",
  "sources",
  "requiredSources",
  "primarySources",
  "governmentSources",
  "academicSources",
  "industrySources",
  "companyDocumentation",
  "productDocumentation",
  "booksReports",
  "interviews",
  "approvedQuotes",
  "approvedStatistics",
  "approvedDefinitions",
  "approvedCaseStudies",
  "approvedExamples",
  "prohibitedSources",
  "sourceDetails",
  "approvedClaims",
  "approvedComparisons",
  "approvedFeedback",
  "approvedTestimonials",
  "approvedMedicalInformation",
  "approvedFinancialInformation",
  "approvedRegulations",
  "productFacts",
  "unverifiedDetails",
  "uncertainties",
  "conflictingEvidence",
  "requiredDisclaimers",
  "restrictions",
  "confidentialInformation",
  "competitorArticles",
  "competitorStrengths",
  "competitorWeaknesses",
  "contentGaps",
  "differentiation",
  "uniqueInformation",
  "originalData",
  "firstHandEvidence",
  "paaData",
  "relatedSearches",
  "searchConsoleData",
  "rankingData",
  "commercialDisclosure",
  "ctaRestrictions",
  "emergencyInformation",
  "safetyWording",
  "professionalResources",
  "visualRestrictions",
  "imageLicensing",
  "changeableInformation",
  "analyticsLimitations",
  "cmsLimitations",
]);

/** Curated UX metadata: placeholder, short hint, full help. */
const CURATED = {
  topic: {
    placeholder: "How solo founders build a weekly content system",
    hint: "The subject the article is about — the reader’s real problem or question.",
    what: "Working topic for the article.",
    why: "Anchors the whole piece so the model answers one clear subject.",
    example: "How solo founders build a weekly content system without a marketing team",
    avoid: "Vague topics like “content marketing” or multiple unrelated themes.",
  },
  workingTitle: {
    placeholder: "How to build a content system as a solo founder",
    hint: "Draft title — may be refined in the package output.",
    what: "A working title, not necessarily final SEO title.",
    why: "Guides framing and H1 suggestions.",
    example: "How to Build a Content System as a Solo Founder",
    avoid: "Clickbait or keyword stuffing in the working title.",
  },
  articleType: {
    type: "select",
    options: ARTICLE_TYPES,
    placeholder: "how-to guide",
    hint: "Pick one confirmed format from the list.",
    what: "The editorial format of the piece.",
    why: "Structure and depth depend on type (how-to vs comparison vs news).",
    example: "how-to guide",
    avoid: "Changing type only because another format “ranks better.”",
  },
  articleGoal: {
    placeholder: "Help readers set up a repeatable weekly content workflow",
    hint: "What success looks like for this article.",
    what: "Business or editorial goal of the article.",
    why: "Shapes CTAs and depth without forcing a sale.",
    example: "Educate free users so they publish consistently",
    avoid: "Goals that only make sense if the reader buys something.",
  },
  readerOutcome: {
    placeholder: "A simple checklist they can run every Monday",
    hint: "Primary change for the reader after reading.",
    what: "Main reader outcome.",
    why: "Keeps the article useful even without conversion.",
    example: "They can run a 60-minute weekly content block",
    avoid: "Outcomes you cannot support with the facts you provide.",
  },
  secondaryOutcome: {
    placeholder: "Know when to upgrade tooling vs process",
    hint: "Optional secondary benefit.",
  },
  preferredLength: {
    placeholder: "1500–2000 words",
    hint: "Target length; model should not pad with filler.",
  },
  minimumLength: { placeholder: "1200 words" },
  maximumLength: { placeholder: "2500 words" },
  language: {
    placeholder: "English",
    hint: "Language of the article body.",
    what: "Output language.",
    why: "All copy and metadata should match this language.",
    example: "English",
    avoid: "Mixing languages unless localization is intentional.",
  },
  targetLocale: {
    placeholder: "en-US",
    hint: "Locale for spelling, dates, currency (e.g. en-US, en-GB).",
  },
  tone: {
    placeholder: "clear, practical, honest",
    hint: "How the writing should sound.",
  },
  brandVoice: {
    placeholder: "honest Early Access product voice — no hype",
    hint: "Brand personality constraints.",
  },
  readingLevel: {
    type: "select",
    options: [
      "plain language (grade 6–8)",
      "general professional",
      "expert / technical",
      "mixed (define sections)",
    ],
    placeholder: "general professional",
  },
  pointOfView: {
    type: "select",
    options: ["first person", "second person", "third person", "mixed (define)"],
    placeholder: "second person",
  },
  publicationStatus: {
    type: "select",
    options: [
      "internal draft",
      "ready for editorial review",
      "ready for expert review",
      "scheduled",
      "published",
    ],
    placeholder: "internal draft",
  },
  publicationDate: { placeholder: "2026-07-15 or TBD" },
  contentOwner: { placeholder: "Content lead / your name" },
  updateFrequency: {
    type: "select",
    options: [
      "one-time",
      "quarterly review",
      "when product changes",
      "when regulations change",
      "continuous evergreen",
    ],
    placeholder: "quarterly review",
  },
  websiteName: { placeholder: "Creatornivo" },
  websiteUrl: { placeholder: "https://www.creatornivo.com" },
  websiteType: {
    placeholder: "SaaS product blog / content marketing site",
  },
  websiteDescription: {
    type: "textarea",
    placeholder: "AI templates for creators and marketers — Early Access, honest limits",
  },
  websiteTopic: { placeholder: "content generation workflows for indie founders" },
  websiteCategories: { placeholder: "Guides, Product, Productivity" },
  businessModel: { placeholder: "subscription SaaS (Free + Pro)" },
  websiteGoal: { placeholder: "start free account / understand product fit" },
  secondaryWebsiteGoal: { placeholder: "subscribe to product updates" },
  market: { placeholder: "English-speaking solo founders and marketers" },
  targetCountries: { placeholder: "US, UK, EU (English)" },
  brandPositioning: {
    type: "textarea",
    placeholder: "Honest Early Access tool — real limits, no fake social proof",
  },
  editorialStandards: {
    type: "textarea",
    placeholder: "No invented stats; disclose Beta status; people-first SEO",
  },
  styleGuide: {
    type: "textarea",
    placeholder: "Active voice, short paragraphs, no AI clichés",
  },
  cms: { placeholder: "Next.js blog / Webflow / WordPress" },
  cmsLimitations: {
    type: "textarea",
    placeholder: "No custom schema fields; H2/H3 only",
  },
  existingArticles: {
    type: "textarea",
    placeholder: "List URLs or titles of related posts already live",
  },
  categoryPage: { placeholder: "URL of the category this belongs to" },
  pillarPage: { placeholder: "URL of the pillar page if any" },
  topicCluster: {
    type: "textarea",
    placeholder: "Pillar + supporting cluster map",
  },
  websiteExpertise: {
    type: "textarea",
    placeholder: "What the site is genuinely known for",
  },
  excludedTopics: {
    type: "textarea",
    placeholder: "Topics you will not cover (e.g. medical advice)",
  },
  authorName: {
    placeholder: "Only a real author name you control",
    hint: "Leave blank rather than inventing an author.",
  },
  authorRole: { placeholder: "Founder / Content lead" },
  authorBio: {
    type: "textarea",
    placeholder: "Short true bio — no invented credentials",
  },
  authorCredentials: {
    type: "textarea",
    placeholder: "Only verifiable credentials",
  },
  authorExperience: {
    type: "textarea",
    placeholder: "Relevant real experience with the topic",
  },
  authorRelationship: {
    type: "textarea",
    placeholder: "e.g. product founder writing about own workflow",
  },
  personalExperience: {
    type: "textarea",
    placeholder: "Approved first-hand experience only — or leave blank",
    hint: "Model must not invent personal stories.",
  },
  expertName: { placeholder: "Real SME name or leave blank" },
  expertTitle: { placeholder: "Title if expert review is real" },
  expertCredentials: { type: "textarea", placeholder: "Verifiable only" },
  expertReview: {
    type: "select",
    options: YES_NO,
    placeholder: "no",
  },
  medicalReview: { type: "select", options: YES_NO, placeholder: "no" },
  legalReview: { type: "select", options: YES_NO, placeholder: "no" },
  financialReview: { type: "select", options: YES_NO, placeholder: "no" },
  editorialReviewer: { placeholder: "Name if known" },
  factChecker: { placeholder: "Name if known" },
  authorProfileUrl: { placeholder: "https://…" },
  editorialPolicyUrl: { placeholder: "https://…/editorial-policy" },
  correctionPolicyUrl: { placeholder: "https://…/corrections" },
  audience: {
    placeholder: "solo founders publishing weekly without a content team",
    hint: "Primary reader — be specific.",
    what: "Primary audience description.",
    why: "Tone, depth, and examples depend on who reads.",
    example: "Solo SaaS founders who write their own marketing",
    avoid: "Everyone / general audience without constraints.",
  },
  secondaryAudience: { placeholder: "freelance marketers supporting founders" },
  audienceLocation: { placeholder: "Remote / US & Europe" },
  audienceLanguage: { placeholder: "English" },
  audienceAge: { placeholder: "25–45 (optional)" },
  knowledgeLevel: {
    type: "select",
    options: [
      "beginner",
      "intermediate",
      "advanced",
      "mixed beginner–intermediate",
      "mixed intermediate–advanced",
    ],
    placeholder: "beginner to intermediate",
  },
  awarenessStage: {
    type: "select",
    options: [
      "unaware",
      "problem-aware",
      "solution-aware",
      "product-aware",
      "most aware",
    ],
    placeholder: "problem-aware",
  },
  purchaseStage: {
    type: "select",
    options: [
      "not shopping",
      "awareness",
      "consideration",
      "decision",
      "post-purchase education",
    ],
    placeholder: "not shopping",
  },
  audienceRole: { placeholder: "founder, marketer, creator" },
  painPoint: {
    placeholder: "staring at a blank page every week",
    hint: "Main problem the article helps with.",
  },
  secondaryPainPoints: {
    type: "textarea",
    placeholder: "Other related frustrations",
  },
  primaryQuestion: {
    placeholder: "How do I publish consistently without a team?",
    hint: "The question the article should answer early.",
  },
  secondaryQuestions: {
    type: "textarea",
    placeholder: "Follow-up questions to cover",
  },
  desiredOutcome: {
    placeholder: "A weekly system they can stick to",
  },
  concerns: { type: "textarea", placeholder: "Fears or doubts they have" },
  objections: {
    type: "textarea",
    placeholder: "Why they might reject advice or tools",
  },
  misconceptions: {
    type: "textarea",
    placeholder: "Common wrong beliefs to correct carefully",
  },
  accessibilityNeeds: {
    type: "textarea",
    placeholder: "e.g. plain language, no color-only cues",
  },
  culturalContext: {
    type: "textarea",
    placeholder: "Region-specific norms if relevant",
  },
  excludedAudience: {
    placeholder: "Who this is NOT for",
  },
  searchIntent: {
    type: "select",
    options: SEARCH_INTENTS,
    placeholder: "informational",
    hint: "Primary intent — do not force a sale on pure info queries.",
    what: "Primary search intent.",
    why: "Controls whether the article teaches, compares, or transacts.",
    example: "informational",
    avoid: "Treating every query as a chance to sell.",
  },
  secondarySearchIntent: {
    type: "select",
    options: SEARCH_INTENTS,
    placeholder: "educational",
  },
  searchJourneyStage: {
    type: "select",
    options: [
      "discover problem",
      "learn basics",
      "compare approaches",
      "choose a tool",
      "implement / troubleshoot",
    ],
    placeholder: "learn basics",
  },
  expectedReaderAction: {
    placeholder: "try a simple weekly content checklist",
  },
  immediateAnswerRequired: {
    type: "select",
    options: YES_NO,
    placeholder: "yes",
  },
  decisionSupportRequired: {
    type: "select",
    options: YES_NO,
    placeholder: "no",
  },
  commercialInvestigation: {
    type: "select",
    options: YES_NO,
    placeholder: "no",
  },
  transactionalSupport: {
    type: "select",
    options: YES_NO,
    placeholder: "no",
  },
  localIntent: { type: "select", options: YES_NO, placeholder: "no" },
  freshnessSensitivity: {
    type: "select",
    options: ["low", "medium", "high", "news-critical"],
    placeholder: "medium",
  },
  primaryKeyword: {
    placeholder: "content system for solo founders",
    hint: "Main keyword — use naturally, no stuffing.",
    what: "Primary target keyword or phrase.",
    why: "Guides title, H1, and topical focus without keyword stuffing.",
    example: "content system for solo founders",
    avoid: "Invented search volume or ranking claims.",
  },
  secondaryKeywords: {
    placeholder: "weekly content workflow, founder content plan",
  },
  longTailKeywords: {
    placeholder: "how to plan content as a solo founder",
  },
  questionKeywords: {
    placeholder: "how often should founders publish?",
  },
  relatedEntities: { placeholder: "LinkedIn, newsletter, SEO, CMS" },
  requiredTerminology: {
    placeholder: "Terms that must appear exactly as written",
  },
  synonyms: { placeholder: "content system, publishing routine" },
  industryTerminology: { placeholder: "ICP, CAC only if audience knows them" },
  localizedKeywords: { placeholder: "locale variants if any" },
  keywordsToAvoid: {
    placeholder: "Words or competitor brands to skip",
  },
  brandKeywords: { placeholder: "Creatornivo (if appropriate)" },
  competitorKeywords: {
    placeholder: "Only if comparison is intentional and fair",
  },
  targetTopicCluster: { placeholder: "Founder content systems" },
  searchVolumeData: {
    placeholder: "Only real measured data — or leave blank",
    hint: "Do not invent volumes.",
  },
  keywordDifficultyData: {
    placeholder: "Only real KD data — or leave blank",
  },
  serpFeatures: { placeholder: "PAA, featured snippet, video, etc." },
  paaData: {
    type: "textarea",
    placeholder: "Real People Also Ask questions only",
  },
  relatedSearches: {
    type: "textarea",
    placeholder: "Real related searches only",
  },
  searchConsoleData: {
    type: "textarea",
    placeholder: "GSC queries/positions if available",
  },
  rankingData: {
    type: "textarea",
    placeholder: "Current rankings if known — no inventions",
  },
  cannibalizationConcerns: {
    type: "textarea",
    placeholder: "Other pages targeting the same keyword",
  },
  targetSerp: { placeholder: "Google US desktop / mobile" },
  competitorArticles: {
    type: "textarea",
    placeholder: "URLs of competing articles you reviewed",
  },
  competitorStrengths: {
    type: "textarea",
    placeholder: "What they do well for the reader",
  },
  competitorWeaknesses: {
    type: "textarea",
    placeholder: "Gaps you can fill honestly",
  },
  contentGaps: {
    type: "textarea",
    placeholder: "Missing angles, examples, or steps",
  },
  serpFormat: {
    placeholder: "long how-to with checklist + FAQ",
  },
  serpLength: { placeholder: "~1800 words average" },
  serpIntent: { placeholder: "informational how-to" },
  differentiation: {
    type: "textarea",
    placeholder: "Your unique angle without inventing proof",
  },
  uniqueInformation: {
    type: "textarea",
    placeholder: "Original insights you actually have",
  },
  originalData: {
    type: "textarea",
    placeholder: "Datasets or numbers you own — only if real",
  },
  firstHandEvidence: {
    type: "textarea",
    placeholder: "Tests or experience you can stand behind",
  },
  sources: {
    type: "textarea",
    placeholder: "Title + URL for each approved source",
    hint: "Only sources the model may use.",
    what: "Approved sources list.",
    why: "Prevents invented citations and weak references.",
    example: "Google Search Central — Creating helpful content — https://…",
    avoid: "Vague “studies show” without a real source.",
  },
  requiredSources: { type: "textarea", placeholder: "Must-include sources" },
  primarySources: { type: "textarea", placeholder: "Primary / original sources" },
  governmentSources: { type: "textarea", placeholder: "Official gov sources" },
  academicSources: { type: "textarea", placeholder: "Peer-reviewed if any" },
  industrySources: { type: "textarea", placeholder: "Industry reports" },
  companyDocumentation: { type: "textarea", placeholder: "Your product docs" },
  productDocumentation: { type: "textarea", placeholder: "Feature docs / changelog" },
  booksReports: { type: "textarea", placeholder: "Books or long reports" },
  interviews: { type: "textarea", placeholder: "Approved interview notes" },
  approvedQuotes: { type: "textarea", placeholder: "Exact quotes + attribution" },
  approvedStatistics: {
    type: "textarea",
    placeholder: "Numbers + source + date only if verified",
  },
  approvedDefinitions: { type: "textarea", placeholder: "Official definitions" },
  approvedCaseStudies: { type: "textarea", placeholder: "Real case studies only" },
  approvedExamples: { type: "textarea", placeholder: "Approved examples" },
  prohibitedSources: {
    type: "textarea",
    placeholder: "Sources that must not be used",
  },
  sourceDateRequirements: {
    placeholder: "e.g. prefer sources after 2024",
  },
  citationStyle: {
    type: "select",
    options: [
      "inline links",
      "APA-style references",
      "numbered footnotes",
      "end list of sources",
      "publisher house style",
    ],
    placeholder: "inline links",
  },
  externalLinkPolicy: {
    placeholder: "nofollow affiliates / open in new tab / etc.",
  },
  maximumSourceAge: { placeholder: "2 years for stats; evergreen OK for concepts" },
  paywalledSources: { type: "select", options: YES_NO, placeholder: "no" },
  archiveLinks: { type: "select", options: YES_NO, placeholder: "unknown / not applicable" },
  researchRequired: { type: "select", options: YES_NO, placeholder: "no" },
  internetAccess: {
    type: "select",
    options: YES_NO,
    placeholder: "no",
    hint: "If no, model must mark current claims as needing verification.",
  },
  currentCheckRequired: { type: "select", options: YES_NO, placeholder: "yes" },
  dataAnalysisRequired: { type: "select", options: YES_NO, placeholder: "no" },
  expertInterviewRequired: { type: "select", options: YES_NO, placeholder: "no" },
  productTestingRequired: { type: "select", options: YES_NO, placeholder: "no" },
  legalVerificationRequired: { type: "select", options: YES_NO, placeholder: "no" },
  medicalVerificationRequired: { type: "select", options: YES_NO, placeholder: "no" },
  financialVerificationRequired: { type: "select", options: YES_NO, placeholder: "no" },
  regionalVerificationRequired: { type: "select", options: YES_NO, placeholder: "no" },
  sourceDetails: {
    type: "textarea",
    placeholder: "Approved facts the model may state as true",
    hint: "Facts only — no guesses.",
  },
  approvedClaims: { type: "textarea", placeholder: "Claims you authorize" },
  productFacts: { type: "textarea", placeholder: "Real product facts" },
  approvedPricing: { placeholder: "Prices only if current and approved" },
  approvedDates: { placeholder: "Confirmed dates" },
  approvedOutcomes: {
    type: "textarea",
    placeholder: "Real outcomes only — no invented case results",
  },
  approvedComparisons: {
    type: "textarea",
    placeholder: "Fair comparison points you verified",
  },
  approvedFeedback: { type: "textarea", placeholder: "Real customer feedback" },
  approvedTestimonials: {
    type: "textarea",
    placeholder: "Only real, approved testimonials",
  },
  unverifiedDetails: {
    type: "textarea",
    placeholder: "Items that need fact-check before publish",
  },
  uncertainties: {
    type: "textarea",
    placeholder: "Known unknowns to disclose",
  },
  conflictingEvidence: {
    type: "textarea",
    placeholder: "Where sources disagree",
  },
  requiredDisclaimers: {
    type: "textarea",
    placeholder: "Required legal/medical/financial disclaimers",
  },
  restrictions: {
    type: "textarea",
    placeholder: "Claims marketing forbids",
  },
  confidentialInformation: {
    type: "textarea",
    placeholder: "Do not publish — keep out of the article",
  },
  monetizationModel: {
    placeholder: "subscription / affiliate / ads / none",
  },
  affiliateLinks: { type: "select", options: YES_NO, placeholder: "no" },
  affiliatePartners: { placeholder: "Partner names if any" },
  sponsoredContent: { type: "select", options: YES_NO, placeholder: "no" },
  sponsorName: { placeholder: "Sponsor if applicable" },
  ownedProduct: { type: "select", options: YES_NO, placeholder: "yes" },
  leadGenerationGoal: { placeholder: "newsletter / demo / none" },
  displayAdvertising: { type: "select", options: YES_NO, placeholder: "no" },
  paidPlacement: { type: "select", options: YES_NO, placeholder: "no" },
  commissionStructure: { placeholder: "Only if relevant and true" },
  commercialDisclosure: {
    type: "textarea",
    placeholder: "Disclosure text if affiliate/sponsor/ownership exists",
  },
  primaryCta: {
    placeholder: "Try the free plan",
    hint: "Must not withhold the main answer to force the CTA.",
  },
  secondaryCta: { placeholder: "Read related guide" },
  ctaDestination: { placeholder: "https://www.creatornivo.com/register" },
  leadMagnet: { placeholder: "Checklist PDF if real" },
  newsletter: { placeholder: "Product updates list if real" },
  productCta: { placeholder: "Open Blog Article template" },
  consultationCta: { placeholder: "Book a call — only if offered" },
  ctaRestrictions: {
    type: "textarea",
    placeholder: "What CTAs are not allowed",
  },
  highStakesCategory: {
    type: "select",
    options: [
      "none",
      "medical / health",
      "legal",
      "financial",
      "safety",
      "other regulated",
    ],
    placeholder: "none",
  },
  professionalReviewRequired: {
    type: "select",
    options: YES_NO,
    placeholder: "no",
  },
  jurisdiction: { placeholder: "e.g. US / EU / not applicable" },
  emergencyInformation: {
    type: "textarea",
    placeholder: "Emergency resources if YMYL",
  },
  safetyWording: {
    type: "textarea",
    placeholder: "Required safety language",
  },
  professionalResources: {
    type: "textarea",
    placeholder: "Links to licensed professionals / hotlines",
  },
  heroImage: { placeholder: "Available asset or “required”" },
  articleImages: { type: "textarea", placeholder: "List available images" },
  screenshots: { type: "textarea", placeholder: "Product screenshots available?" },
  diagrams: { type: "textarea", placeholder: "Diagram needs" },
  charts: { type: "textarea", placeholder: "Chart data sources if any" },
  video: { placeholder: "Embed or none" },
  originalPhotography: { type: "textarea", placeholder: "Original photos available?" },
  stockImagesAllowed: { type: "select", options: YES_NO, placeholder: "yes" },
  aiImagesAllowed: { type: "select", options: YES_NO, placeholder: "unknown / not applicable" },
  imageLicensing: {
    type: "textarea",
    placeholder: "License status for each asset",
  },
  visualStyle: { placeholder: "simple diagrams, no stock clichés" },
  visualRestrictions: {
    type: "textarea",
    placeholder: "Do not use logos / faces / etc.",
  },
  imageCredits: { type: "textarea", placeholder: "Credit lines" },
  rtlSupport: { type: "select", options: YES_NO, placeholder: "no" },
  lastReviewedDate: { placeholder: "YYYY-MM-DD" },
  nextReviewDate: { placeholder: "YYYY-MM-DD or +3 months" },
  changeableInformation: {
    type: "textarea",
    placeholder: "Prices, laws, product features that age fast",
  },
  updateOwner: { placeholder: "Who owns updates" },
  archivePolicy: { placeholder: "What happens when outdated" },
  canonicalUrl: { placeholder: "https://…/final-slug" },
  duplicatePages: {
    type: "textarea",
    placeholder: "Other URLs that cover the same topic",
  },
  syndication: { type: "select", options: YES_NO, placeholder: "no" },
  republishingPartners: { placeholder: "Partners if any" },
  canonicalPolicy: {
    placeholder: "Original on this site; nofollow syndicated copies",
  },
  structuredDataRequested: {
    type: "select",
    options: YES_NO,
    placeholder: "yes",
  },
  schemaTypes: {
    placeholder: "Article / BlogPosting / FAQPage / none",
  },
  schemaImplementation: {
    placeholder: "CMS field / GTM / developer ticket",
  },
  schemaSupport: {
    placeholder: "What the CMS can actually emit",
  },
  primaryMetric: { placeholder: "organic clicks / time on page / saves" },
  secondaryMetrics: { placeholder: "scroll depth, newsletter signups" },
  conversionMetric: { placeholder: "register starts from article CTA" },
  engagementMetrics: { placeholder: "comments, shares if tracked" },
  searchMetrics: { placeholder: "impressions, average position" },
  businessMetrics: { placeholder: "qualified signups attributed" },
  guardrailMetrics: {
    placeholder: "bounce, support tickets, refunds from claims",
  },
  measurementPeriod: { placeholder: "30 / 90 days post-publish" },
  analyticsLimitations: {
    type: "textarea",
    placeholder: "Attribution gaps, cookie limits, etc.",
  },
};

function defaultHelp(key, label, section) {
  const lower = label.toLowerCase();
  return {
    what: `${label} — a parameter from the Blog Article brief (${section}).`,
    why: `When provided, the model uses this instead of guessing. Empty fields stay unset ([${key}]) so nothing is invented.`,
    example: `A short, factual value for ${lower} that you can defend if asked.`,
    avoid: `Invented data, competitor copy, or details you cannot verify for ${lower}.`,
  };
}

function buildField(key, sectionName) {
  const curated = CURATED[key] || {};
  const label = curated.label || humanize(key);
  const groupMeta = GROUP_META[sectionName] || GROUP_META.other;

  let type = curated.type || "text";
  if (!curated.type) {
    if (YES_NO_KEYS.has(key)) type = "select";
    else if (TEXTAREA_KEYS.has(key)) type = "textarea";
  }

  const options =
    curated.options ||
    (type === "select" && YES_NO_KEYS.has(key) ? YES_NO : undefined);

  const help = {
    what: curated.what || defaultHelp(key, label, groupMeta.title).what,
    why: curated.why || defaultHelp(key, label, groupMeta.title).why,
    example:
      curated.example ||
      curated.placeholder ||
      defaultHelp(key, label, groupMeta.title).example,
    avoid: curated.avoid || defaultHelp(key, label, groupMeta.title).avoid,
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

  const essentialsSet = new Set(ESSENTIAL_KEYS.filter((k) => keys.includes(k)));
  const fields = [];

  // Essentials first (subset of keys, preferred order)
  for (const key of ESSENTIAL_KEYS) {
    if (!keys.includes(key)) continue;
    const field = buildField(key, sectionMap[key] || "ARTICLE INFORMATION");
    field.group = "essentials";
    field.groupTitle = GROUP_META.essentials.title;
    fields.push(field);
  }

  // Remaining keys in section order
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

  // Ensure every prompt var is present exactly once
  const seen = new Set(fields.map((f) => f.key));
  for (const key of keys) {
    if (!seen.has(key)) {
      fields.push(buildField(key, sectionMap[key] || "other"));
    }
  }

  const groups = [
    GROUP_META.essentials,
    ...sectionOrder.map((s) => GROUP_META[s]),
    GROUP_META.other,
  ].map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

  // Drop empty groups
  const usedGroups = new Set(fields.map((f) => f.group));
  const filteredGroups = groups.filter((g) => usedGroups.has(g.id));

  const payload = {
    slug: "blog-article",
    title: "Blog Article",
    version: 1,
    generatedAt: new Date().toISOString(),
    fieldCount: fields.length,
    requiredKeys: [...REQUIRED],
    groups: filteredGroups,
    variables: fields,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(
    `Wrote ${outPath} — ${fields.length} fields, ${filteredGroups.length} groups, required: ${[...REQUIRED].join(", ")}`,
  );
}

main();
