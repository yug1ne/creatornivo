/**
 * Builds full LinkedIn Post form schema from the prompt.
 * Does NOT modify the prompt text — only form metadata for UX.
 *
 * Usage: node scripts/build-linkedin-post-form.mjs
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
  "linkedin-post.txt",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "linkedin-post-variables.json",
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
    description: "Minimum inputs for a LinkedIn-ready draft.",
    defaultOpen: true,
  },
  "ACCOUNT AND PUBLISHING INFORMATION": {
    id: "account",
    title: "Account & publishing",
    description: "Profile or Page, features, and brand context.",
    defaultOpen: true,
  },
  "POST INFORMATION": {
    id: "post",
    title: "Post information",
    description: "Type, message, length, tone, and schedule context.",
    defaultOpen: true,
  },
  "PUBLISHING CONTEXT": {
    id: "publishing",
    title: "Publishing context",
    description: "Who speaks for whom — personal vs company authorization.",
    defaultOpen: true,
  },
  "AUDIENCE INFORMATION": {
    id: "audience",
    title: "Audience",
    description: "Professional readers — not every visitor is a buyer.",
    defaultOpen: true,
  },
  "CONTENT OBJECTIVE": {
    id: "objectives",
    title: "Objectives",
    description: "One dominant goal per post.",
    defaultOpen: false,
  },
  "FACTUAL INFORMATION": {
    id: "facts",
    title: "Facts & claims",
    description: "Only supplied, verified claims.",
    defaultOpen: false,
  },
  "AUTHOR INFORMATION": {
    id: "author",
    title: "Author",
    description: "Real role and experience only — never invent credentials.",
    defaultOpen: false,
  },
  "PERSONAL EXPERIENCE": {
    id: "personal_experience",
    title: "Personal experience",
    description: "Approved stories only — no fake vulnerability.",
    defaultOpen: false,
  },
  "ORGANIZATION INFORMATION": {
    id: "organization",
    title: "Organization",
    description: "Approved company facts only.",
    defaultOpen: false,
  },
  "PRODUCT OR SERVICE INFORMATION": {
    id: "product",
    title: "Product / service",
    description: "Current stage and real availability — no vaporware.",
    defaultOpen: false,
  },
  "OFFER AND COMMERCIAL INFORMATION": {
    id: "offer",
    title: "Offer & commercial",
    description: "Prices, codes, and terms only if confirmed.",
    defaultOpen: false,
  },
  "EVENT INFORMATION": {
    id: "event",
    title: "Event",
    description: "Absolute dates, time zone, and real event details.",
    defaultOpen: false,
  },
  "CUSTOMER STORY AND CASE STUDY INFORMATION": {
    id: "customer_story",
    title: "Customer story & case study",
    description: "Permissioned quotes and measured results only.",
    defaultOpen: false,
  },
  "PARTNERSHIP INFORMATION": {
    id: "partnership",
    title: "Partnership",
    description: "Disclosures and partner approval.",
    defaultOpen: false,
  },
  "FUNDING AND TRANSACTION INFORMATION": {
    id: "funding",
    title: "Funding & transactions",
    description: "Public, approved financial facts only.",
    defaultOpen: false,
  },
  "RESEARCH AND DATA INFORMATION": {
    id: "research",
    title: "Research & data",
    description: "Sourced research with methodology limits.",
    defaultOpen: false,
  },
  "JOB AND HIRING INFORMATION": {
    id: "hiring",
    title: "Job & hiring",
    description: "Open roles with real requirements and process.",
    defaultOpen: false,
  },
  "EMPLOYER-BRAND INFORMATION": {
    id: "employer_brand",
    title: "Employer brand",
    description: "Culture and workplace claims you can stand behind.",
    defaultOpen: false,
  },
  "EMPLOYEE ADVOCACY": {
    id: "employee_advocacy",
    title: "Employee advocacy",
    description: "Employee-shared posts — clear personal vs official.",
    defaultOpen: false,
  },
  "MEDIA, ARTICLE, AND NEWSLETTER INFORMATION": {
    id: "longform_media",
    title: "Article / newsletter / long-form",
    description: "Article and newsletter context when used.",
    defaultOpen: false,
  },
  "LINK INFORMATION": {
    id: "links",
    title: "Links",
    description: "Destination URLs and preview notes.",
    defaultOpen: false,
  },
  "CALL TO ACTION": {
    id: "cta",
    title: "Call to action",
    description: "One clear professional next step.",
    defaultOpen: false,
  },
  "ENGAGEMENT PROMPT": {
    id: "engagement",
    title: "Engagement prompt",
    description: "Real questions — no engagement bait.",
    defaultOpen: false,
  },
  "POST FORMAT INFORMATION": {
    id: "format",
    title: "Post format",
    description: "Text, image, document, video, poll — verify limits in app.",
    defaultOpen: true,
  },
  "VIDEO SCRIPT INFORMATION": {
    id: "video",
    title: "Video script",
    description: "Native video details when video is the format.",
    defaultOpen: false,
  },
  POLL: {
    id: "poll",
    title: "Poll",
    description: "Neutral options — not for impression gaming.",
    defaultOpen: false,
  },
  CORRECTIONS: {
    id: "corrections",
    title: "Corrections",
    description: "What is wrong and what is correct.",
    defaultOpen: false,
  },
  "MEDIA INFORMATION": {
    id: "media",
    title: "Media assets",
    description: "Images, charts, rights, and alt text.",
    defaultOpen: false,
  },
  "USER-GENERATED CONTENT": {
    id: "ugc",
    title: "User-generated content",
    description: "Permissioned UGC only.",
    defaultOpen: false,
  },
  "AI-GENERATED OR SYNTHETIC MEDIA": {
    id: "synthetic_media",
    title: "AI / synthetic media",
    description: "Disclose when synthetic media is used.",
    defaultOpen: false,
  },
  "MENTIONS AND TAGGING": {
    id: "mentions",
    title: "Mentions & tagging",
    description: "Only tag people and Pages with permission.",
    defaultOpen: false,
  },
  HASHTAGS: {
    id: "hashtags",
    title: "Hashtags",
    description: "Relevant professional tags — no stuffing.",
    defaultOpen: false,
  },
  EMOJIS: {
    id: "emojis",
    title: "Emojis",
    description: "Use sparingly and on-brand.",
    defaultOpen: false,
  },
  "COMMERCIAL DISCLOSURE": {
    id: "commercial_disclosure",
    title: "Commercial disclosure",
    description: "Partnership, affiliate, and paid relationship wording.",
    defaultOpen: false,
  },
  "EMPLOYMENT AND INSIDER INFORMATION": {
    id: "insider",
    title: "Employment & insider info",
    description: "Confidential and MNPI boundaries.",
    defaultOpen: false,
  },
  "HIGH-STAKES AND REGULATED CONTENT": {
    id: "regulated",
    title: "High-stakes & regulated",
    description: "Extra care for legal, financial, medical claims.",
    defaultOpen: false,
  },
  "POLITICAL AND CIVIC CONTENT": {
    id: "political",
    title: "Political / civic",
    description: "Only when intentional and reviewed.",
    defaultOpen: false,
  },
  "COMMUNITY MANAGEMENT": {
    id: "community",
    title: "Community management",
    description: "Comment ownership and moderation.",
    defaultOpen: false,
  },
  "DIRECT-MESSAGE MANAGEMENT": {
    id: "dms",
    title: "Direct messages",
    description: "DM ownership and sensitive-data limits.",
    defaultOpen: false,
  },
  "TIMING AND SCHEDULING": {
    id: "timing",
    title: "Timing & scheduling",
    description: "When to publish and why.",
    defaultOpen: false,
  },
  "POST FREQUENCY": {
    id: "frequency",
    title: "Post frequency",
    description: "Cadence context for this account.",
    defaultOpen: false,
  },
  "CROSS-PLATFORM ADAPTATION": {
    id: "cross_platform",
    title: "Cross-platform",
    description: "Do not paste generic multi-platform copy.",
    defaultOpen: false,
  },
  "PAID PROMOTION": {
    id: "paid",
    title: "Paid promotion",
    description: "Keep organic copy honest when ads are separate.",
    defaultOpen: false,
  },
  "A/B TESTING": {
    id: "ab_testing",
    title: "A/B testing",
    description: "One variable at a time if testing.",
    defaultOpen: false,
  },
  METRICS: {
    id: "metrics",
    title: "Metrics",
    description: "How success will be measured.",
    defaultOpen: false,
  },
  "CURRENT INFORMATION AND FRESHNESS": {
    id: "freshness",
    title: "Freshness & currency",
    description: "Dates and what may go stale.",
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
  "postType",
  "audience",
  "tone",
  "language",
  "mainMessage",
  "desiredAction",
  "primaryObjective",
  "postFormat",
  "accountType",
  "brandVoice",
  "sourceDetails",
  "preferredLength",
  "painPoint",
  "accountName",
];

const REQUIRED = new Set([
  "topic",
  "postType",
  "audience",
  "tone",
  "language",
]);

const ACCOUNT_TYPES = [
  "personal professional profile",
  "founder profile",
  "executive profile",
  "subject-matter expert profile",
  "employee profile",
  "recruiter profile",
  "creator profile",
  "consultant profile",
  "freelancer profile",
  "company Page",
  "product Page",
  "nonprofit Page",
  "educational organization Page",
  "employer-brand Page",
  "local-business Page",
  "community or association Page",
  "other confirmed type",
];

const POST_TYPES = [
  "educational post",
  "informational post",
  "practical professional tip",
  "how-to post",
  "checklist",
  "framework post",
  "industry insight",
  "trend analysis",
  "opinion post",
  "thought-leadership post",
  "executive perspective",
  "founder story",
  "professional personal story",
  "career story",
  "lesson learned",
  "behind-the-scenes post",
  "build-in-public update",
  "company update",
  "project update",
  "product announcement",
  "product launch",
  "feature announcement",
  "service announcement",
  "partnership announcement",
  "funding announcement",
  "acquisition or merger announcement",
  "research or data post",
  "report promotion",
  "article promotion",
  "newsletter promotion",
  "podcast promotion",
  "video promotion",
  "event announcement",
  "event reminder",
  "event recap",
  "webinar promotion",
  "case study",
  "customer story",
  "testimonial post",
  "portfolio post",
  "milestone post",
  "employer-brand post",
  "hiring post",
  "job announcement",
  "employee spotlight",
  "team update",
  "workplace-culture post",
  "employee-advocacy post",
  "award or certification announcement",
  "media mention",
  "poll",
  "discussion prompt",
  "feedback request",
  "lead-generation post",
  "commercial offer",
  "consultation offer",
  "document or carousel post",
  "native video post",
  "public-service update",
  "crisis communication",
  "service interruption",
  "correction",
  "clarification",
  "apology or accountability post",
  "custom confirmed type",
];

const POST_STATUSES = [
  "concept",
  "internal draft",
  "fact review",
  "executive review",
  "employee review",
  "customer review",
  "partner review",
  "legal review",
  "compliance review",
  "visual review",
  "approved",
  "scheduled",
  "published",
  "updated",
  "corrected",
  "archived",
];

const POST_FORMATS = [
  "text-only post",
  "single-image post",
  "multi-image post",
  "native video",
  "document or PDF carousel",
  "poll",
  "link post",
  "article",
  "newsletter issue",
  "event post",
  "job announcement",
  "company Page update",
  "other confirmed format",
];

const YES_NO = ["yes", "no", "unknown / not applicable"];

const YES_NO_KEYS = new Set([
  "accountAccess",
  "aiDisclosure",
  "altTextRequired",
  "analyticsAvailable",
  "anonymizationRequired",
  "articleFeatureAvailable",
  "automaticCrossposting",
  "automaticRenewal",
  "automationDisclosure",
  "bRoll",
  "boostPlanned",
  "captionsAvailable",
  "companyAuthorization",
  "companyPageAvailable",
  "crossposting",
  "customerLogoPermission",
  "customerPermission",
  "customerTagPermission",
  "documentPostAvailable",
  "editingAvailable",
  "embargo",
  "employeeAdvocacy",
  "employeeDisclosure",
  "employeePermission",
  "eventFeatureAvailable",
  "executiveApproval",
  "financialDisclosure",
  "financialLegalApproval",
  "leadGenAvailable",
  "legalApproval",
  "loginRequired",
  "musicUsed",
  "nativeVideoAvailable",
  "newsletterAvailable",
  "paidPromotion",
  "partnerApproval",
  "partnerTagPermission",
  "partnershipDisclosure",
  "personalOpinionDisclaimer",
  "politicalAuthorization",
  "politicalDisclosure",
  "politicalPaidPromotion",
  "pollAvailable",
  "pollFollowUp",
  "realEventRepresentation",
  "registrationRequired",
  "regulatoryApproval",
  "schedulingAvailable",
  "screenRecording",
  "showcasePageAvailable",
  "syntheticVoice",
  "tagPermission",
  "thirdPartyPermission",
  "thumbnailAvailable",
  "transcriptAvailable",
  "ugcEditPermission",
  "ugcPermission",
  "voiceover",
  "workAuthorization",
]);

const TEXTAREA_HINTS = [
  "Description",
  "Rules",
  "Culture",
  "Expectations",
  "Mission",
  "Positioning",
  "Credentials",
  "Achievements",
  "Restrictions",
  "Terminology",
  "Points",
  "Details",
  "Statistics",
  "Definitions",
  "Quotes",
  "Examples",
  "Information",
  "Research",
  "Uncertainties",
  "Sources",
  "Features",
  "Benefits",
  "Differentiator",
  "Limitations",
  "Requirements",
  "Eligibility",
  "Exclusions",
  "Terms",
  "Experience",
  "Tension",
  "Observation",
  "Insight",
  "Situation",
  "Performed",
  "Conditions",
  "Disclosure",
  "Relationship",
  "Collaboration",
  "Settings",
  "Agenda",
  "Preparation",
  "Misconceptions",
  "Concerns",
  "Objections",
  "Context",
  "Goals",
  "Problems",
  "Story",
  "Media",
  "Captions",
  "Transcript",
  "Alt",
  "Rights",
  "Licensing",
  "Hashtags",
  "Mentions",
  "Prompt",
  "Moderation",
  "Escalation",
  "Notes",
  "Bio",
  "Policy",
  "Responsibilities",
  "Vocabulary",
  "Facts",
  "Claim",
  "Message",
  "Outcome",
  "Lesson",
  "Challenge",
  "Decision",
  "History",
  "Methodology",
  "Findings",
  "Summary",
  "Script",
  "Segment",
  "Options",
];

function looksLikeTextarea(key, label) {
  if (key.length > 26) return true;
  return TEXTAREA_HINTS.some(
    (h) =>
      key.toLowerCase().includes(h.toLowerCase().replace(/\s/g, "")) ||
      label.includes(h),
  );
}

const CURATED = {
  contentName: {
    placeholder: "Internal label — e.g. July LinkedIn thought piece",
    hint: "For your library only — not shown on LinkedIn.",
  },
  accountName: {
    placeholder: "Display name on LinkedIn",
    hint: "Exact publishing account name.",
  },
  accountUrl: { placeholder: "https://www.linkedin.com/in/… or /company/…" },
  accountIdentifier: { placeholder: "public identifier / vanity URL slug" },
  accountType: {
    type: "select",
    options: ACCOUNT_TYPES,
    placeholder: "founder profile",
    hint: "Personal profile vs company Page changes voice and features.",
    what: "Confirmed LinkedIn account type.",
    why: "Copy, disclosures, and available formats depend on profile vs Page.",
    example: "founder profile",
    avoid: "Assuming a personal profile has company Page features.",
  },
  accountOwner: { placeholder: "Who owns this account" },
  brandName: { placeholder: "Creatornivo" },
  legalName: { placeholder: "Legal entity if different from brand" },
  accountCategory: { placeholder: "Software / Professional services" },
  industry: { placeholder: "Content tools / marketing software" },
  professionalNiche: { placeholder: "AI writing tools for operators" },
  market: { placeholder: "English-speaking B2B marketers" },
  operatingRegions: { placeholder: "Global English markets" },
  accountDescription: {
    type: "textarea",
    placeholder: "Short true About description",
  },
  websiteUrl: { placeholder: "https://www.creatornivo.com" },
  contactDestination: { placeholder: "Support email or contact URL" },
  newsletterAvailable: { type: "select", options: YES_NO, placeholder: "no" },
  companyPageAvailable: { type: "select", options: YES_NO, placeholder: "yes" },
  showcasePageAvailable: {
    type: "select",
    options: YES_NO,
    placeholder: "no",
  },
  eventFeatureAvailable: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },
  articleFeatureAvailable: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },
  documentPostAvailable: {
    type: "select",
    options: YES_NO,
    placeholder: "yes",
  },
  pollAvailable: { type: "select", options: YES_NO, placeholder: "yes" },
  nativeVideoAvailable: { type: "select", options: YES_NO, placeholder: "yes" },
  leadGenAvailable: { type: "select", options: YES_NO, placeholder: "no" },
  paidPromotion: { type: "select", options: YES_NO, placeholder: "no" },
  employeeAdvocacy: { type: "select", options: YES_NO, placeholder: "no" },
  accountAccess: { type: "select", options: YES_NO, placeholder: "yes" },

  postName: {
    placeholder: "Internal post name — e.g. EA honesty post #3",
  },
  topic: {
    placeholder: "How small teams ship useful content with templates",
    hint: "What the post is about — specific to LinkedIn.",
    what: "Post topic.",
    why: "Keeps the LinkedIn post focused on one professional idea.",
    example: "Why we publish Early Access status without fake social proof",
    avoid: "Generic multi-platform blurbs or several unrelated topics.",
  },
  postType: {
    type: "select",
    options: POST_TYPES,
    placeholder: "educational post",
    hint: "Pick one confirmed type — do not switch just to sell harder.",
    what: "Confirmed LinkedIn post type.",
    why: "Structure, tone, and CTA depend on type.",
    example: "thought-leadership post",
    avoid: "Turning every post into a lead-generation post without basis.",
  },
  primaryObjective: {
    placeholder: "educate / share opinion / announce / invite discussion",
    hint: "One dominant objective.",
  },
  secondaryObjective: {
    placeholder: "Optional secondary goal — keep light",
  },
  mainMessage: {
    type: "textarea",
    placeholder: "One clear professional point the reader should take away",
    hint: "Lead with this — avoid burying it.",
  },
  desiredAction: {
    placeholder: "Comment with their biggest content bottleneck",
    hint: "One clear next step — not five CTAs.",
  },
  secondaryAction: {
    placeholder: "Optional — save for later / visit a resource",
  },
  postStatus: {
    type: "select",
    options: POST_STATUSES,
    placeholder: "internal draft",
    hint: "Do not call unapproved drafts “ready to publish.”",
  },
  campaignRole: { placeholder: "standalone / launch teaser / reminder" },
  relatedCampaign: { placeholder: "Campaign name if any" },
  preferredLength: {
    placeholder: "standard professional (100–300 words) / brief / longer",
  },
  characterLimit: {
    placeholder: "Verify current LinkedIn limit before publishing",
    hint: "Do not assume limits — check the app.",
  },
  language: {
    placeholder: "English",
    hint: "Language of the post body.",
  },
  targetLocale: { placeholder: "en-US" },
  tone: {
    placeholder: "clear, credible, conversational professional",
    hint: "How the post should sound on LinkedIn.",
  },
  brandVoice: {
    placeholder: "honest Early Access product — no fake social proof",
  },
  pointOfView: {
    type: "select",
    options: [
      "first person",
      "second person",
      "third person",
      "brand we",
      "mixed (approved)",
    ],
    placeholder: "first person",
  },
  publishDate: { placeholder: "2026-07-15" },
  publishTime: { placeholder: "09:00" },
  publishTimeZone: { placeholder: "America/New_York" },
  campaignStartDate: { placeholder: "YYYY-MM-DD if part of a campaign" },
  campaignEndDate: { placeholder: "YYYY-MM-DD if part of a campaign" },
  replacementDate: { placeholder: "When this post should be updated/archived" },

  publishingDestination: {
    placeholder: "personal profile / company Page / showcase Page",
    hint: "Where this will actually be published.",
  },
  profileOwner: { placeholder: "Name on the personal profile" },
  companyPage: { placeholder: "Company Page name if any" },
  showcasePage: { placeholder: "Showcase Page if any" },
  associatedProduct: { placeholder: "Product name if relevant" },
  associatedEmployer: { placeholder: "Employer name if relevant" },
  authorRelationship: {
    type: "textarea",
    placeholder: "founder / employee / consultant / independent expert",
  },
  authorTopicRelationship: {
    type: "textarea",
    placeholder: "How the author is connected to this topic",
  },
  authorProductRelationship: {
    type: "textarea",
    placeholder: "builder / user / partner / none",
  },
  authorCustomerRelationship: {
    type: "textarea",
    placeholder: "if discussing a customer — relationship and permission",
  },
  employmentStatus: {
    placeholder: "current employee / former / founder / independent",
  },
  companyAuthorization: {
    type: "select",
    options: YES_NO,
    placeholder: "no",
    hint: "Required if this sounds like an official company statement.",
  },
  personalOpinionDisclaimer: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },
  executiveApproval: { type: "select", options: YES_NO, placeholder: "no" },
  employeePolicy: {
    type: "textarea",
    placeholder: "Relevant employee social policy limits",
  },
  socialMediaPolicy: {
    type: "textarea",
    placeholder: "Relevant social-media policy",
  },
  confidentialityRestrictions: {
    type: "textarea",
    placeholder: "What must not appear publicly",
  },
  insiderRestrictions: {
    type: "textarea",
    placeholder: "MNPI / trading-window limits if any",
  },
  embargo: { type: "select", options: YES_NO, placeholder: "no" },
  embargoExpiration: { placeholder: "Date/time when embargo lifts" },

  audience: {
    placeholder: "operators and marketers who publish professional content",
    hint: "Primary LinkedIn audience for this post.",
    what: "Primary professional audience.",
    why: "Shapes language, depth, and CTA relevance.",
    example: "Founders and content leads at early-stage B2B products",
    avoid: "Assuming every reader is a buyer, executive, or hiring manager.",
  },
  secondaryAudience: { placeholder: "Optional secondary segment" },
  audienceSegment: { placeholder: "e.g. existing network vs cold" },
  audienceIndustries: { placeholder: "SaaS, agencies, professional services" },
  audienceRoles: { placeholder: "founders, PMM, content leads" },
  audienceSeniority: { placeholder: "IC / manager / executive / mixed" },
  audienceLocation: { placeholder: "Where most readers are" },
  audienceLanguage: { placeholder: "English" },
  audienceCompanySize: { placeholder: "1–50 / 50–200 / enterprise / mixed" },
  knowledgeLevel: {
    type: "select",
    options: ["beginner", "intermediate", "advanced", "mixed"],
    placeholder: "mixed",
  },
  awarenessStage: {
    type: "select",
    options: [
      "unaware",
      "problem-aware",
      "solution-aware",
      "product-aware",
      "existing network",
    ],
    placeholder: "problem-aware",
  },
  purchaseStage: {
    type: "select",
    options: [
      "not buying",
      "researching",
      "evaluating",
      "existing customer",
      "not applicable",
    ],
    placeholder: "not applicable",
  },
  audienceRelationship: {
    placeholder: "connections / followers / cold / customers / candidates",
  },
  networkStatus: {
    type: "select",
    options: ["existing network", "new audience", "mixed"],
    placeholder: "existing network",
  },
  customerStatus: {
    type: "select",
    options: ["not customers", "mixed", "customers only", "unknown"],
    placeholder: "mixed",
  },
  candidateStatus: {
    type: "select",
    options: ["not candidates", "mixed", "candidates only", "unknown"],
    placeholder: "not candidates",
  },
  partnerStatus: {
    type: "select",
    options: ["not partners", "mixed", "partners only", "unknown"],
    placeholder: "not partners",
  },
  investorStatus: {
    type: "select",
    options: ["not investors", "mixed", "investors only", "unknown"],
    placeholder: "not investors",
  },
  painPoint: {
    placeholder: "Hard to write LinkedIn posts that feel honest and useful",
  },
  secondaryPainPoints: {
    type: "textarea",
    placeholder: "Related professional frustrations",
  },
  audienceGoals: {
    type: "textarea",
    placeholder: "What they want to achieve at work",
  },
  concerns: { type: "textarea", placeholder: "Doubts they may have" },
  objections: {
    type: "textarea",
    placeholder: "Objections to address carefully",
  },
  misconceptions: {
    type: "textarea",
    placeholder: "Myths to correct without attacking",
  },
  desiredProfessionalResponse: {
    placeholder: "They rethink one workflow / share a comparable example",
  },
  practicalOutcome: {
    placeholder: "They know one concrete next step",
  },
  accessibilityNeeds: {
    type: "textarea",
    placeholder: "Alt text, captions, plain language, etc.",
  },
  culturalContext: {
    type: "textarea",
    placeholder: "Locale-specific professional norms if relevant",
  },
  excludedAudience: {
    placeholder: "Who this post is not for",
  },

  contentGoal: { placeholder: "educate / clarify / announce" },
  businessGoal: { placeholder: "qualified interest / none this post" },
  professionalGoal: { placeholder: "credibility / useful discussion" },
  brandAwarenessGoal: { placeholder: "honest product positioning" },
  employerBrandGoal: { placeholder: "only if this is employer-brand" },
  educationalGoal: { placeholder: "teach one practical idea" },
  communityGoal: { placeholder: "qualified comments" },
  conversionGoal: { placeholder: "only if this post should convert" },
  recruitingGoal: { placeholder: "only for real open roles" },
  partnershipGoal: { placeholder: "only if partnership is real" },
  trustGoal: { placeholder: "show honest product status" },
  expectedNextStep: {
    placeholder: "Comment / click resource / apply / none",
  },
  funnelRole: {
    placeholder: "awareness / consideration / retention / not in funnel",
  },
  primaryMetric: { placeholder: "meaningful comments / qualified DMs" },
  secondaryMetrics: {
    type: "textarea",
    placeholder: "Saves, profile visits — secondary only",
  },
  guardrailMetrics: {
    type: "textarea",
    placeholder: "unfollows, hides, spam reports, irrelevant inquiries",
  },

  coreTopic: { placeholder: "Same as topic or tighter angle" },
  primaryClaim: {
    type: "textarea",
    placeholder: "Main claim — only if true and approved",
  },
  supportingPoints: {
    type: "textarea",
    placeholder: "2–4 supporting points you can stand behind",
  },
  sourceDetails: {
    type: "textarea",
    placeholder: "Approved facts, examples, or observations only",
    hint: "Model will not invent experience or stats.",
    what: "Approved facts and source material.",
    why: "Every material claim must be supplied — empty fields stay empty.",
    example: "We ship 45 structured templates; Free is 5 generations/day UTC.",
    avoid: "Plausible but unverified revenue, customers, or case results.",
  },
  approvedStatistics: {
    type: "textarea",
    placeholder: "Only verified numbers with context",
  },
  approvedDates: { type: "textarea", placeholder: "Dates you can prove" },
  approvedDefinitions: {
    type: "textarea",
    placeholder: "Terms defined for this post",
  },
  approvedQuotes: {
    type: "textarea",
    placeholder: "Exact approved quotations only",
  },
  approvedExamples: {
    type: "textarea",
    placeholder: "Real examples approved for public use",
  },
  approvedResearch: {
    type: "textarea",
    placeholder: "Research with source and date",
  },
  companyFacts: {
    type: "textarea",
    placeholder: "Approved company facts only",
  },
  productFacts: {
    type: "textarea",
    placeholder: "Approved product facts only",
  },
  marketFacts: {
    type: "textarea",
    placeholder: "Approved market facts only",
  },
  employmentFacts: {
    type: "textarea",
    placeholder: "Approved employment facts only",
  },
  personalExperience: {
    type: "textarea",
    placeholder: "Approved first-hand experience — or leave blank",
    hint: "Never invent personal stories.",
  },
  customerInformation: {
    type: "textarea",
    placeholder: "Permissioned customer details only",
  },
  partnerInformation: {
    type: "textarea",
    placeholder: "Approved partner details only",
  },
  knownLimitations: {
    type: "textarea",
    placeholder: "What the post must not overclaim",
  },
  uncertainties: {
    type: "textarea",
    placeholder: "What is still unknown",
  },
  conflictingInformation: {
    type: "textarea",
    placeholder: "Conflicts that need a company decision",
  },
  unverifiedDetails: {
    type: "textarea",
    placeholder: "Items to mark [VERIFY BEFORE PUBLISHING]",
  },
  requiredAttribution: {
    type: "textarea",
    placeholder: "Required source credits",
  },
  requiredDisclaimer: {
    type: "textarea",
    placeholder: "Required legal or opinion disclaimer",
  },
  restrictions: {
    type: "textarea",
    placeholder: "Claims, words, or topics to avoid",
  },
  confidentialInformation: {
    type: "textarea",
    placeholder: "Must never appear in the post",
  },
  sensitiveInformation: {
    type: "textarea",
    placeholder: "Handle carefully or omit",
  },

  authorName: { placeholder: "Full name as on LinkedIn" },
  authorRole: { placeholder: "Founder / Content lead / Consultant" },
  authorOrganization: { placeholder: "Creatornivo" },
  authorBio: {
    type: "textarea",
    placeholder: "Short approved bio",
  },
  authorCredentials: {
    type: "textarea",
    placeholder: "Only real credentials",
  },
  authorExperience: {
    type: "textarea",
    placeholder: "Approved professional experience",
  },
  authorTopicExperience: {
    type: "textarea",
    placeholder: "Experience specifically with this topic",
  },
  authorResponsibilities: {
    type: "textarea",
    placeholder: "Current responsibilities",
  },
  authorAchievements: {
    type: "textarea",
    placeholder: "Only verified achievements",
  },
  authorProfileUrl: { placeholder: "https://www.linkedin.com/in/…" },
  authorAudienceRelationship: {
    placeholder: "peer / vendor / employer / independent expert",
  },
  authorWritingStyle: {
    type: "textarea",
    placeholder: "direct, plain language, short paragraphs",
  },
  authorVocabulary: {
    type: "textarea",
    placeholder: "Preferred terms",
  },
  authorRestrictions: {
    type: "textarea",
    placeholder: "Phrases and claims the author will not use",
  },

  personalEvent: {
    type: "textarea",
    placeholder: "Approved personal event only — or leave blank",
  },
  eventPeriod: { placeholder: "When it happened" },
  eventLocation: { placeholder: "Only if public and relevant" },
  peopleInvolved: {
    type: "textarea",
    placeholder: "Only people who approved mention",
  },
  publicDetails: {
    type: "textarea",
    placeholder: "Details approved for publication",
  },
  privateDetails: {
    type: "textarea",
    placeholder: "Must remain private",
  },
  centralChallenge: {
    type: "textarea",
    placeholder: "Real challenge — not invented hardship",
  },
  decisionMade: { type: "textarea", placeholder: "What was decided" },
  personalOutcome: {
    type: "textarea",
    placeholder: "Verified outcome only",
  },
  personalLesson: {
    type: "textarea",
    placeholder: "Proportionate lesson",
  },
  personalUncertainty: {
    type: "textarea",
    placeholder: "What remains unclear",
  },
  thirdPartyPermission: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },
  anonymizationRequired: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },

  organizationName: { placeholder: "Creatornivo" },
  organizationLegalName: { placeholder: "Legal entity name" },
  organizationDescription: {
    type: "textarea",
    placeholder: "Short true description",
  },
  organizationType: { placeholder: "SaaS product / Early Access" },
  organizationIndustry: { placeholder: "Content tools" },
  foundedDate: { placeholder: "Only if approved" },
  headquarters: { placeholder: "Only if public and relevant" },
  organizationRegions: { placeholder: "Operating regions" },
  employeeCount: { placeholder: "Only verified range" },
  customerCount: { placeholder: "Only verified figure" },
  revenue: { placeholder: "Only if approved for public use" },
  funding: { placeholder: "Only public approved funding facts" },
  valuation: { placeholder: "Only if public and approved" },
  productsServices: {
    type: "textarea",
    placeholder: "Main products or services",
  },
  mission: { type: "textarea", placeholder: "Approved mission if any" },
  positioning: {
    type: "textarea",
    placeholder: "Approved positioning — honest Early Access",
  },
  organizationCredentials: {
    type: "textarea",
    placeholder: "Only real credentials",
  },
  certifications: {
    type: "textarea",
    placeholder: "Only verified certifications",
  },
  awards: { type: "textarea", placeholder: "Only verified awards" },
  companyHistory: {
    type: "textarea",
    placeholder: "Approved history points",
  },
  organizationWebsite: { placeholder: "https://www.creatornivo.com" },
  newsroomUrl: { placeholder: "Newsroom URL if any" },

  productName: { placeholder: "Creatornivo" },
  productCategory: { placeholder: "AI content templates" },
  productDescription: {
    type: "textarea",
    placeholder: "What the product actually does today",
  },
  primaryUseCase: {
    type: "textarea",
    placeholder: "Main use case",
  },
  targetCustomer: { placeholder: "Who it is for" },
  problemAddressed: {
    type: "textarea",
    placeholder: "Problem it addresses",
  },
  features: {
    type: "textarea",
    placeholder: "Confirmed features only",
  },
  benefits: {
    type: "textarea",
    placeholder: "Confirmed benefits — no invented ROI",
  },
  differentiator: {
    type: "textarea",
    placeholder: "Real differentiator",
  },
  productStage: {
    placeholder: "Early Access / beta / general availability",
    hint: "Do not describe planned features as available.",
  },
  availability: { placeholder: "Public Early Access / waitlist / GA" },
  supportedRegions: { placeholder: "Where available" },
  supportedLanguages: { placeholder: "UI / content languages" },
  supportedPlatforms: { placeholder: "Web / etc." },
  compatibility: { type: "textarea", placeholder: "Integrations if real" },
  requirements: {
    type: "textarea",
    placeholder: "Account or subscription requirements",
  },
  limitations: {
    type: "textarea",
    placeholder: "Known product limits",
  },
  includedItems: { type: "textarea", placeholder: "What is included" },
  excludedItems: { type: "textarea", placeholder: "What is not included" },
  implementationRequirements: {
    type: "textarea",
    placeholder: "Setup needs",
  },
  productUrl: { placeholder: "https://www.creatornivo.com" },

  offerName: { placeholder: "Only if a real offer exists" },
  offerDescription: {
    type: "textarea",
    placeholder: "Offer details",
  },
  price: { placeholder: "Confirmed price only" },
  currency: { placeholder: "USD" },
  billingModel: { placeholder: "monthly / annual / one-time" },
  discount: { placeholder: "Only confirmed discount" },
  previousPrice: { placeholder: "Only if true" },
  promoCode: { placeholder: "Real code only" },
  offerStartDate: { placeholder: "YYYY-MM-DD" },
  offerEndDate: { placeholder: "YYYY-MM-DD" },
  offerTimeZone: { placeholder: "UTC" },
  offerEligibility: {
    type: "textarea",
    placeholder: "Who can use this offer",
  },
  excludedUsers: {
    type: "textarea",
    placeholder: "Who is excluded",
  },
  eligibleItems: {
    type: "textarea",
    placeholder: "Eligible products/services",
  },
  minimumCommitment: { placeholder: "If any" },
  contractTerm: { placeholder: "If any" },
  trialDetails: {
    type: "textarea",
    placeholder: "Trial terms if real",
  },
  automaticRenewal: { type: "select", options: YES_NO, placeholder: "no" },
  implementationFees: { placeholder: "If any" },
  taxDetails: { placeholder: "Taxes / fees if material" },

  discussionQuestion: {
    type: "textarea",
    placeholder: "Specific professional question readers can answer",
    hint: "Avoid “Thoughts?” / “Agree?”",
  },
  feedbackQuestion: {
    type: "textarea",
    placeholder: "Focused feedback request if any",
  },
  pollQuestion: {
    placeholder: "Neutral poll question if format is poll",
  },
  pollOptions: {
    type: "textarea",
    placeholder: "Option A; Option B; Option C; Other — comment",
  },
  commentPrompt: {
    type: "textarea",
    placeholder: "What kind of comment is useful",
  },
  participationGoal: {
    placeholder: "qualified discussion / research input",
  },
  responseUse: {
    type: "textarea",
    placeholder: "How comments will be used",
  },
  sensitiveResponseRisk: {
    type: "textarea",
    placeholder: "Risk of confidential or sensitive replies",
  },

  postFormat: {
    type: "select",
    options: POST_FORMATS,
    placeholder: "text-only post",
    hint: "Primary LinkedIn format for this package.",
    what: "Confirmed primary post format.",
    why: "Package structure (text, document pages, video script) depends on format.",
    example: "text-only post",
    avoid: "Assuming document/video features without checking the account.",
  },
  secondaryFormat: {
    type: "select",
    options: POST_FORMATS,
    placeholder: "other confirmed format",
  },
  documentPageLimit: { placeholder: "Verify current LinkedIn document limits" },
  fileSizeLimit: { placeholder: "Verify current file-size limit" },
  videoRequirements: {
    type: "textarea",
    placeholder: "Current video length/orientation notes",
  },
  pollRequirements: {
    type: "textarea",
    placeholder: "Current poll option/duration limits",
  },
  articleRequirements: {
    type: "textarea",
    placeholder: "Article publishing notes for this account",
  },
  newsletterRequirements: {
    type: "textarea",
    placeholder: "Newsletter feature notes if used",
  },
  platformRestrictions: {
    type: "textarea",
    placeholder: "Known platform or policy limits",
  },
  schedulingAvailable: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },
  editingAvailable: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },
  analyticsAvailable: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },

  videoDuration: { placeholder: "e.g. 45–90 seconds — only if known" },
  videoOrientation: {
    type: "select",
    options: ["vertical", "horizontal", "square", "unknown"],
    placeholder: "vertical",
  },
  videoSpeaker: { placeholder: "Speaker name" },
  speakerTitle: { placeholder: "Speaker title" },
  filmingLocation: { placeholder: "Only if relevant and public" },
  voiceover: { type: "select", options: YES_NO, placeholder: "no" },
  onCameraDelivery: { type: "select", options: YES_NO, placeholder: "yes" },
  bRoll: { type: "select", options: YES_NO, placeholder: "no" },
  screenRecording: { type: "select", options: YES_NO, placeholder: "no" },
  captionsAvailable: { type: "select", options: YES_NO, placeholder: "yes" },
  transcriptAvailable: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },
  musicUsed: { type: "select", options: YES_NO, placeholder: "no" },
  musicRights: {
    type: "textarea",
    placeholder: "License status if music is used",
  },
  thumbnailAvailable: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },

  pollDuration: { placeholder: "e.g. 1 week — confirm in LinkedIn" },
  pollPurpose: {
    type: "textarea",
    placeholder: "Why this poll exists",
  },
  pollResultUse: {
    type: "textarea",
    placeholder: "How results will be used",
  },
  pollFollowUp: { type: "select", options: YES_NO, placeholder: "no" },
  pollLimitations: {
    type: "textarea",
    placeholder: "Not representative research unless designed as such",
  },

  primaryCta: {
    placeholder: "One primary action",
  },
  ctaWording: {
    type: "textarea",
    placeholder: "Exact CTA wording if preferred",
  },
  ctaDestination: { placeholder: "URL or in-platform action" },
  ctaAudienceFit: {
    type: "textarea",
    placeholder: "Who should take this action",
  },
};

function resolveGroupMeta(sectionName) {
  if (GROUP_META[sectionName]) return GROUP_META[sectionName];
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
    description: "Parameters from this section of the brief.",
    defaultOpen: false,
  };
}

function defaultHelp(key, label, section) {
  return {
    what: `${label} — a parameter from the LinkedIn Post brief (${section}).`,
    why: `When provided, the model uses this instead of inventing facts, stories, credentials, or engagement tricks. Empty fields stay unset ([${key}]).`,
    example: `A short, factual value for ${label.toLowerCase()} you can verify before publishing on LinkedIn.`,
    avoid: `Invented social proof, fake vulnerability, unverified claims, or private details for ${label.toLowerCase()}.`,
  };
}

function buildField(key, sectionName) {
  const curated = CURATED[key] || {};
  const label = curated.label || humanize(key);
  const groupMeta = resolveGroupMeta(sectionName);

  let type = curated.type || "text";
  if (!curated.type) {
    if (YES_NO_KEYS.has(key)) type = "select";
    else if (looksLikeTextarea(key, label)) type = "textarea";
  }

  const options =
    curated.options ||
    (type === "select" && YES_NO_KEYS.has(key) ? YES_NO : undefined);

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
    const field = buildField(key, sectionMap[key] || "POST INFORMATION");
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
      groupById.set(f.group, {
        id: f.group,
        title: f.groupTitle || humanize(f.group),
        description:
          Object.values(GROUP_META).find((g) => g.id === f.group)
            ?.description || "Parameters from this section.",
        defaultOpen: Boolean(
          Object.values(GROUP_META).find((g) => g.id === f.group)
            ?.defaultOpen,
        ),
      });
    }
  }

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
    slug: "linkedin-post",
    title: "LinkedIn Post",
    version: 1,
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
