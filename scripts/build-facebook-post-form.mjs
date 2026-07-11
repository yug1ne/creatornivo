/**
 * Builds full Facebook Post form schema from the prompt.
 * Does NOT modify the prompt text — only form metadata for UX.
 *
 * Usage: node scripts/build-facebook-post-form.mjs
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
  "facebook-post.txt",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "facebook-post-variables.json",
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
    description: "Minimum inputs for a Facebook-ready draft.",
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
    description: "Page, Group, Event, or profile — and what features exist.",
    defaultOpen: true,
  },
  "ORGANIZATION OR CREATOR INFORMATION": {
    id: "organization",
    title: "Organization / creator",
    description: "Real brand or creator details only.",
    defaultOpen: false,
  },
  "AUDIENCE INFORMATION": {
    id: "audience",
    title: "Audience",
    description: "Who sees this and what they need.",
    defaultOpen: true,
  },
  "CONTENT OBJECTIVE": {
    id: "objectives",
    title: "Objectives",
    description: "One dominant goal per post.",
    defaultOpen: false,
  },
  "TOPIC AND FACTUAL INFORMATION": {
    id: "facts",
    title: "Topic & facts",
    description: "Only supplied, verified claims.",
    defaultOpen: false,
  },
  "PRODUCT OR SERVICE INFORMATION": {
    id: "product",
    title: "Product / service",
    description: "Current stage and real features — no vaporware.",
    defaultOpen: false,
  },
  "OFFER INFORMATION": {
    id: "offer",
    title: "Offer",
    description: "Prices, codes, and deadlines only if confirmed.",
    defaultOpen: false,
  },
  "EVENT INFORMATION": {
    id: "event",
    title: "Event",
    description: "Absolute dates and real event details.",
    defaultOpen: false,
  },
  "PERSONAL STORY INFORMATION": {
    id: "personal_story",
    title: "Personal story",
    description: "Only approved experiences — never invent “I…” stories.",
    defaultOpen: false,
  },
  "CUSTOMER STORY AND TESTIMONIAL INFORMATION": {
    id: "customer_story",
    title: "Customer story & testimonials",
    description: "Permissioned quotes and results only.",
    defaultOpen: false,
  },
  "PARTNERSHIP OR SPONSORED CONTENT": {
    id: "partnership",
    title: "Partnership / sponsored",
    description: "Disclosures and partner approval.",
    defaultOpen: false,
  },
  "NEWS OR CURRENT UPDATE INFORMATION": {
    id: "news",
    title: "News / current update",
    description: "Time-sensitive facts with sources.",
    defaultOpen: false,
  },
  "LINK INFORMATION": {
    id: "links",
    title: "Links",
    description: "Destination URLs and preview notes.",
    defaultOpen: false,
  },
  "MEDIA INFORMATION": {
    id: "media",
    title: "Media",
    description: "Images, video, rights, and alt text needs.",
    defaultOpen: false,
  },
  "AI-GENERATED OR SYNTHETIC MEDIA": {
    id: "synthetic_media",
    title: "AI / synthetic media",
    description: "Disclosure when synthetic media is used.",
    defaultOpen: false,
  },
  "POSTING FORMAT": {
    id: "format",
    title: "Posting format",
    description: "Text, carousel, Reel, Live, etc.",
    defaultOpen: false,
  },
  "MENTIONS AND TAGGING": {
    id: "mentions",
    title: "Mentions & tagging",
    description: "Only tag with permission.",
    defaultOpen: false,
  },
  HASHTAGS: {
    id: "hashtags",
    title: "Hashtags",
    description: "Relevant tags — no stuffing.",
    defaultOpen: false,
  },
  "CALL TO ACTION": {
    id: "cta",
    title: "Call to action",
    description: "One clear next step.",
    defaultOpen: false,
  },
  "ENGAGEMENT PROMPT": {
    id: "engagement",
    title: "Engagement prompt",
    description: "Real questions — no engagement bait.",
    defaultOpen: false,
  },
  "COMMUNITY MANAGEMENT": {
    id: "community",
    title: "Community management",
    description: "Moderation and reply ownership.",
    defaultOpen: false,
  },
  "SENSITIVE AND HIGH-STAKES TOPICS": {
    id: "sensitive",
    title: "Sensitive topics",
    description: "Extra care for high-stakes content.",
    defaultOpen: false,
  },
  "POLITICAL AND CIVIC CONTENT": {
    id: "political",
    title: "Political / civic",
    description: "Only when intentional and reviewed.",
    defaultOpen: false,
  },
  "REGULATED PRODUCTS AND SERVICES": {
    id: "regulated",
    title: "Regulated products",
    description: "Ads and claims restrictions.",
    defaultOpen: false,
  },
  "CORRECTIONS AND UPDATES": {
    id: "corrections",
    title: "Corrections & updates",
    description: "What is being corrected and why.",
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
  "A/B TESTING": {
    id: "ab_testing",
    title: "A/B testing",
    description: "One variable at a time if testing.",
    defaultOpen: false,
  },
  "ORGANIC AND PAID SEPARATION": {
    id: "organic_paid",
    title: "Organic vs paid",
    description: "Keep organic copy honest when ads are separate.",
    defaultOpen: false,
  },
  METRICS: {
    id: "metrics",
    title: "Metrics",
    description: "How success will be measured.",
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
  "publishingDestination",
  "pageName",
  "brandVoice",
  "sourceDetails",
  "preferredLength",
  "productName",
  "painPoint",
];

const REQUIRED = new Set([
  "topic",
  "postType",
  "audience",
  "tone",
  "language",
]);

const POST_TYPES = [
  "educational post",
  "informational post",
  "how-to post",
  "practical tip",
  "checklist",
  "opinion post",
  "thought-leadership post",
  "personal story",
  "founder story",
  "behind-the-scenes post",
  "build-in-public update",
  "company update",
  "project update",
  "community update",
  "product announcement",
  "feature announcement",
  "product launch",
  "service announcement",
  "promotional post",
  "limited-time offer",
  "event announcement",
  "event reminder",
  "event recap",
  "Facebook Live announcement",
  "webinar announcement",
  "article promotion",
  "video promotion",
  "podcast promotion",
  "newsletter promotion",
  "lead-magnet promotion",
  "case study",
  "customer story",
  "testimonial post",
  "milestone post",
  "hiring post",
  "partnership announcement",
  "media mention",
  "award announcement",
  "poll",
  "question post",
  "discussion prompt",
  "feedback request",
  "contest",
  "giveaway",
  "fundraising post",
  "nonprofit update",
  "volunteer recruitment",
  "public-service information",
  "crisis communication",
  "service interruption",
  "correction",
  "clarification",
  "apology or accountability post",
  "group discussion post",
  "group announcement",
  "event-page post",
  "custom confirmed type",
];

const POST_STATUSES = [
  "concept",
  "internal draft",
  "fact review",
  "legal review",
  "partner review",
  "community review",
  "approved",
  "scheduled",
  "published",
  "updated",
  "corrected",
  "archived",
];

const DESTINATIONS = [
  "business Page",
  "organization Page",
  "creator Page",
  "public personal profile",
  "private personal profile",
  "public Facebook Group",
  "private Facebook Group",
  "customer community",
  "membership community",
  "Facebook Event",
  "fundraiser page",
  "local-business Page",
  "internal employee group",
  "other confirmed destination",
];

const YES_NO = ["yes", "no", "unknown / not applicable"];

const YES_NO_KEYS = new Set([
  "crossposting",
  "boostPlanned",
  "paidPromotion",
  "brandedContentRequirement",
  "partnershipDisclosure",
  "registrationRequired",
  "anonymizationRequired",
  "storyPermission",
  "customerPermission",
  "logoPermission",
  "customerImagePermission",
  "customerDisclosure",
  "partnerApproval",
  "freeProduct",
  "affiliateRelationship",
  "automaticRenewal",
  "livestreamAvailability",
  "replayAvailability",
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
  postName: {
    placeholder: "Internal label — e.g. July feature update",
  },
  topic: {
    placeholder: "How we ship content with templates as a small team",
    hint: "What the post is about — specific to Facebook context.",
    what: "Post topic.",
    why: "Keeps the Facebook post focused on one idea.",
    example: "Announcing a new free Blog Article template",
    avoid: "Generic multi-platform blurbs or several unrelated topics.",
  },
  postType: {
    type: "select",
    options: POST_TYPES,
    placeholder: "product announcement",
    hint: "Pick one confirmed type — do not switch just to sell harder.",
    what: "Confirmed Facebook post type.",
    why: "Structure and CTA depend on type (update vs offer vs discussion).",
    example: "educational post",
    avoid: "Turning every post into a promotional post without basis.",
  },
  primaryObjective: {
    placeholder: "inform / educate / announce / start discussion",
    hint: "One dominant objective.",
  },
  secondaryObjective: {
    placeholder: "Optional secondary goal — keep light",
  },
  mainMessage: {
    type: "textarea",
    placeholder: "One clear point the reader should take away",
    hint: "Lead with this — avoid burying it.",
  },
  desiredAction: {
    placeholder: "Comment with their biggest publishing blocker",
    hint: "One clear next step.",
  },
  secondaryAction: {
    placeholder: "Optional — save for later / share with a teammate",
  },
  postStatus: {
    type: "select",
    options: POST_STATUSES,
    placeholder: "internal draft",
    hint: "Do not call unapproved drafts “ready to publish.”",
  },
  preferredLength: {
    placeholder: "short (2–4 short paragraphs) / medium",
  },
  language: {
    placeholder: "English",
    hint: "Language of the post body.",
  },
  targetLocale: { placeholder: "en-US" },
  tone: {
    placeholder: "friendly, clear, human",
    hint: "How the post should sound on Facebook.",
  },
  brandVoice: {
    placeholder: "honest Early Access product — no fake social proof",
  },
  pointOfView: {
    type: "select",
    options: ["first person", "second person", "third person", "brand we"],
    placeholder: "brand we",
  },
  publishDate: { placeholder: "2026-07-15" },
  publishTime: { placeholder: "10:00" },
  publishTimeZone: { placeholder: "America/New_York" },
  campaignStartDate: { placeholder: "YYYY-MM-DD if part of a campaign" },
  campaignEndDate: { placeholder: "YYYY-MM-DD if part of a campaign" },
  publishingDestination: {
    type: "select",
    options: DESTINATIONS,
    placeholder: "business Page",
    hint: "Where this will actually be published.",
  },
  pageName: { placeholder: "Creatornivo" },
  groupName: { placeholder: "Only if posting in a Group" },
  eventName: { placeholder: "Only if Event page post" },
  profileName: { placeholder: "Creator name if profile post" },
  accountRelationship: {
    type: "textarea",
    placeholder: "Official brand Page for the product",
  },
  pageCategory: { placeholder: "Software / Product/service" },
  groupType: { placeholder: "public / private / customer community" },
  groupPrivacy: {
    type: "select",
    options: ["public", "private", "secret", "not a group"],
    placeholder: "not a group",
  },
  groupRules: {
    type: "textarea",
    placeholder: "Relevant group rules about promo / self-promo",
  },
  groupCulture: {
    type: "textarea",
    placeholder: "What this community values",
  },
  audienceExpectations: {
    type: "textarea",
    placeholder: "What followers expect from this Page",
  },
  facebookUrl: { placeholder: "https://facebook.com/…" },
  crossposting: { type: "select", options: YES_NO, placeholder: "no" },
  otherChannels: { placeholder: "Instagram / LinkedIn — if any" },
  boostPlanned: { type: "select", options: YES_NO, placeholder: "no" },
  paidPromotion: { type: "select", options: YES_NO, placeholder: "no" },
  brandedContentRequirement: {
    type: "select",
    options: YES_NO,
    placeholder: "no",
  },
  partnershipDisclosure: {
    type: "select",
    options: YES_NO,
    placeholder: "no",
  },
  featureAvailability: {
    type: "textarea",
    placeholder: "Polls / scheduling / branded content — confirm for this account",
  },
  organizationName: { placeholder: "Creatornivo" },
  brandName: { placeholder: "Creatornivo" },
  organizationType: { placeholder: "SaaS product / Early Access" },
  organizationDescription: {
    type: "textarea",
    placeholder: "Short true description",
  },
  creatorDescription: {
    type: "textarea",
    placeholder: "If creator-led Page",
  },
  industry: { placeholder: "Content tools / marketing software" },
  websiteUrl: { placeholder: "https://www.creatornivo.com" },
  contactUrl: { placeholder: "Support or contact URL" },
  businessLocation: { placeholder: "Public location if relevant" },
  operatingRegions: { placeholder: "English-speaking markets" },
  productsServices: {
    type: "textarea",
    placeholder: "Main products or services",
  },
  mission: { type: "textarea", placeholder: "Approved mission if any" },
  positioning: {
    type: "textarea",
    placeholder: "Approved positioning — honest Early Access",
  },
  credentials: {
    type: "textarea",
    placeholder: "Only real credentials",
  },
  achievements: {
    type: "textarea",
    placeholder: "Only verified achievements",
  },
  brandTerminology: {
    type: "textarea",
    placeholder: "Preferred product names / terms",
  },
  brandRestrictions: {
    type: "textarea",
    placeholder: "Words and claims to avoid",
  },
  audience: {
    placeholder: "small-business owners and marketers who use Facebook",
    hint: "Primary Facebook audience for this post.",
  },
  secondaryAudience: { placeholder: "Optional secondary segment" },
  audienceSegment: { placeholder: "e.g. existing customers vs cold" },
  audienceLocation: { placeholder: "Where most readers are" },
  audienceLanguage: { placeholder: "English" },
  audienceAge: { placeholder: "Optional broad range only" },
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
      "existing community",
    ],
    placeholder: "product-aware",
  },
  audienceRelationship: {
    placeholder: "followers / customers / group members",
  },
  audienceStatus: {
    type: "select",
    options: ["existing followers", "new audience", "mixed", "group members"],
    placeholder: "existing followers",
  },
  customerStatus: {
    type: "select",
    options: ["not customers", "mixed", "customers only", "unknown"],
    placeholder: "mixed",
  },
  communityStatus: {
    type: "select",
    options: ["public audience", "community members", "mixed"],
    placeholder: "public audience",
  },
  painPoint: {
    placeholder: "Hard to write posts that feel native to Facebook",
  },
  secondaryPainPoints: {
    type: "textarea",
    placeholder: "Related frustrations",
  },
  audienceGoals: {
    type: "textarea",
    placeholder: "What they want to achieve",
  },
  concerns: { type: "textarea", placeholder: "Doubts they may have" },
  objections: { type: "textarea", placeholder: "Objections to address carefully" },
  misconceptions: {
    type: "textarea",
    placeholder: "Myths to correct without attacking",
  },
  culturalContext: {
    type: "textarea",
    placeholder: "Locale-specific norms if relevant",
  },
  excludedAudience: {
    placeholder: "Who this post is not for",
  },
  contentGoal: { placeholder: "educate / announce / discuss" },
  businessGoal: { placeholder: "qualified interest / none this post" },
  communityGoal: { placeholder: "useful comments / group discussion" },
  educationalGoal: { placeholder: "teach one practical idea" },
  conversionGoal: { placeholder: "only if this post should convert" },
  trustGoal: { placeholder: "show honest product status" },
  desiredEmotion: { placeholder: "clarity / curiosity / confidence" },
  practicalOutcome: {
    placeholder: "They know what to do next",
  },
  expectedNextStep: {
    placeholder: "Comment / click / save / register",
  },
  campaignRole: {
    placeholder: "standalone / launch teaser / reminder",
  },
  relatedCampaign: { placeholder: "Campaign name if any" },
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
    placeholder: "Approved facts only — leave blank if none",
    hint: "Model will not invent statistics or testimonials.",
  },
  approvedStatistics: {
    type: "textarea",
    placeholder: "Numbers + source + date only if verified",
  },
  approvedDates: { placeholder: "Confirmed dates" },
  approvedDefinitions: {
    type: "textarea",
    placeholder: "Terms that must be defined correctly",
  },
  approvedQuotes: {
    type: "textarea",
    placeholder: "Exact quotes + attribution",
  },
  approvedExamples: {
    type: "textarea",
    placeholder: "Approved examples",
  },
  approvedCustomerInformation: {
    type: "textarea",
    placeholder: "Permissioned customer details only",
  },
  productFacts: {
    type: "textarea",
    placeholder: "Real product facts for this post",
  },
  marketFacts: {
    type: "textarea",
    placeholder: "Only verified market facts",
  },
  approvedResearch: {
    type: "textarea",
    placeholder: "Research you may cite",
  },
  uncertainties: {
    type: "textarea",
    placeholder: "What is still unknown",
  },
  conflictingInformation: {
    type: "textarea",
    placeholder: "Where sources disagree",
  },
  unverifiedDetails: {
    type: "textarea",
    placeholder: "Needs fact-check before publish",
  },
  requiredAttribution: {
    type: "textarea",
    placeholder: "Required credit lines",
  },
  approvedSources: {
    type: "textarea",
    placeholder: "Sources that may be linked",
  },
  prohibitedSources: {
    type: "textarea",
    placeholder: "Sources not to use",
  },
  productName: { placeholder: "Creatornivo" },
  productCategory: { placeholder: "AI content templates" },
  productDescription: {
    type: "textarea",
    placeholder: "Short accurate product description",
  },
  primaryUseCase: {
    placeholder: "Structured Facebook posts from a brief",
  },
  targetCustomer: { placeholder: "Marketers and founders" },
  problemAddressed: {
    placeholder: "Generic social copy that ignores Facebook context",
  },
  features: { type: "textarea", placeholder: "Confirmed features only" },
  benefits: { type: "textarea", placeholder: "Confirmed benefits only" },
  differentiator: {
    type: "textarea",
    placeholder: "Real differentiator",
  },
  productStage: {
    type: "select",
    options: [
      "concept",
      "prototype",
      "alpha",
      "beta",
      "Early Access",
      "limited availability",
      "phased rollout",
      "generally available",
      "temporarily unavailable",
      "planned",
    ],
    placeholder: "Early Access",
  },
  availability: { placeholder: "Available now / waitlist" },
  supportedRegions: { placeholder: "Where it works" },
  supportedLanguages: { placeholder: "English" },
  supportedPlatforms: { placeholder: "Web" },
  compatibility: {
    type: "textarea",
    placeholder: "Requirements if any",
  },
  requirements: {
    type: "textarea",
    placeholder: "Account / subscription needs",
  },
  limitations: {
    type: "textarea",
    placeholder: "Honest limits",
  },
  includedItems: { type: "textarea", placeholder: "What is included" },
  excludedItems: { type: "textarea", placeholder: "What is not included" },
  productUrl: { placeholder: "https://www.creatornivo.com" },
  offerName: { placeholder: "Only if this post promotes an offer" },
  offerDescription: { type: "textarea", placeholder: "Real offer details" },
  price: { placeholder: "Only confirmed current price" },
  currency: { placeholder: "USD" },
  discount: { placeholder: "Only if real and enforced" },
  previousPrice: { placeholder: "Only if true" },
  promoCode: { placeholder: "Only real codes" },
  offerStartDate: { placeholder: "YYYY-MM-DD" },
  offerExpirationDate: { placeholder: "YYYY-MM-DD + time zone" },
  offerTimeZone: { placeholder: "UTC" },
  offerEligibility: { type: "textarea", placeholder: "Who can use the offer" },
  offerExclusions: { type: "textarea", placeholder: "Exclusions" },
  minimumPurchase: { placeholder: "If any" },
  capacity: { placeholder: "Only if operationally true" },
  offerAvailability: { placeholder: "while supplies last — only if true" },
  trialDetails: { type: "textarea", placeholder: "Real trial terms" },
  subscriptionDetails: {
    type: "textarea",
    placeholder: "Billing reality if mentioned",
  },
  automaticRenewal: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },
  shippingTerms: { type: "textarea", placeholder: "If physical goods" },
  taxDetails: { type: "textarea", placeholder: "Taxes/fees if disclosed" },
  refundTerms: { type: "textarea", placeholder: "If mentioned" },
  offerUrl: { placeholder: "https://…" },
  eventType: { placeholder: "webinar / meetup / Live" },
  eventDescription: { type: "textarea", placeholder: "What the event is" },
  eventDate: { placeholder: "YYYY-MM-DD absolute date" },
  eventStartTime: { placeholder: "HH:MM" },
  eventEndTime: { placeholder: "HH:MM" },
  eventTimeZone: { placeholder: "America/New_York" },
  eventLocation: { placeholder: "City or online" },
  eventFormat: {
    type: "select",
    options: ["online", "in-person", "hybrid"],
    placeholder: "online",
  },
  eventHost: { placeholder: "Host name" },
  eventSpeakers: {
    type: "textarea",
    placeholder: "Confirmed speakers only",
  },
  eventParticipants: {
    type: "textarea",
    placeholder: "Confirmed participants if public",
  },
  eventAudience: { placeholder: "Who should attend" },
  registrationRequired: {
    type: "select",
    options: YES_NO,
    placeholder: "yes",
  },
  registrationDeadline: { placeholder: "YYYY-MM-DD" },
  ticketPrice: { placeholder: "Free / amount" },
  eventCapacity: { placeholder: "Only if known" },
  eventEligibility: { type: "textarea", placeholder: "Who may attend" },
  eventPreparation: {
    type: "textarea",
    placeholder: "What attendees should prepare",
  },
  livestreamAvailability: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },
  replayAvailability: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },
  eventPageUrl: { placeholder: "Facebook Event URL" },
  registrationUrl: { placeholder: "Registration URL" },
  personalExperience: {
    type: "textarea",
    placeholder: "Approved first-hand experience only — or leave blank",
    hint: "Never invent personal stories.",
  },
  storyPermission: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },
  anonymizationRequired: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },
  customerPermission: {
    type: "select",
    options: YES_NO,
    placeholder: "no",
  },
  customerQuote: {
    type: "textarea",
    placeholder: "Exact approved quote only",
  },
  customerResult: {
    type: "textarea",
    placeholder: "Approved result with conditions — not typical claims",
  },
  commercialDisclosure: {
    type: "textarea",
    placeholder: "Required partnership / affiliate wording",
  },
  partnerApproval: {
    type: "select",
    options: YES_NO,
    placeholder: "no",
  },
  affiliateRelationship: {
    type: "select",
    options: YES_NO,
    placeholder: "no",
  },
  freeProduct: {
    type: "select",
    options: YES_NO,
    placeholder: "no",
  },
};

function defaultHelp(key, label, section) {
  return {
    what: `${label} — a parameter from the Facebook Post brief (${section}).`,
    why: `When provided, the model uses this instead of inventing facts, offers, stories, or engagement tricks. Empty fields stay unset ([${key}]).`,
    example: `A short, factual value for ${label.toLowerCase()} you can verify before publishing.`,
    avoid: `Invented social proof, fake urgency, unverified product claims, or private details for ${label.toLowerCase()}.`,
  };
}

function buildField(key, sectionName) {
  const curated = CURATED[key] || {};
  const label = curated.label || humanize(key);
  const groupMeta = GROUP_META[sectionName] || GROUP_META.other;

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

  const usedGroups = new Set(fields.map((f) => f.group));
  const filteredGroups = groups.filter((g) => usedGroups.has(g.id));

  const payload = {
    slug: "facebook-post",
    title: "Facebook Post",
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
