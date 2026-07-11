/**
 * Builds full Instagram Post form schema from the prompt.
 * Does NOT modify the prompt text — only form metadata for UX.
 *
 * Usage: node scripts/build-instagram-post-form.mjs
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
  "instagram-post.txt",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "instagram-post-variables.json",
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

function sectionToId(sectionName) {
  return sectionName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

function sectionToTitle(sectionName) {
  return sectionName.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const GROUP_META = {
  essentials: {
    id: "essentials",
    title: "Essentials",
    description: "Minimum inputs for an Instagram-ready package.",
    defaultOpen: true,
  },
  "ACCOUNT INFORMATION": {
    id: "account",
    title: "Account",
    description: "Instagram account type and available features.",
    defaultOpen: true,
  },
  "POST INFORMATION": {
    id: "post",
    title: "Post information",
    description: "Type, message, tone, schedule, objectives.",
    defaultOpen: true,
  },
  "POST FORMAT": {
    id: "format",
    title: "Post format",
    description: "Photo, carousel, Reel — verify limits in the app.",
    defaultOpen: true,
  },
  "AUDIENCE INFORMATION": {
    id: "audience",
    title: "Audience",
    description: "Who this post is for.",
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
    description: "Only verified facts — no invented specifics.",
    defaultOpen: false,
  },
  "PRODUCT OR SERVICE INFORMATION": {
    id: "product",
    title: "Product / service",
    description: "Stage and real availability only.",
    defaultOpen: false,
  },
  "OFFER INFORMATION": {
    id: "offer",
    title: "Offer",
    description: "Prices and deadlines only if real.",
    defaultOpen: false,
  },
  "EVENT INFORMATION": {
    id: "event",
    title: "Event",
    description: "Absolute dates and confirmed details.",
    defaultOpen: false,
  },
  "PERSONAL STORY INFORMATION": {
    id: "personal_story",
    title: "Personal story",
    description: "Approved experiences only — never invent “I…”.",
    defaultOpen: false,
  },
  "CUSTOMER STORY AND TESTIMONIAL INFORMATION": {
    id: "customer_story",
    title: "Customer story",
    description: "Permissioned quotes and results only.",
    defaultOpen: false,
  },
  "PARTNERSHIP, SPONSORSHIP, AND AFFILIATE INFORMATION": {
    id: "partnership",
    title: "Partnership / affiliate",
    description: "Disclosures and partner approval.",
    defaultOpen: false,
  },
  "NEWS OR CURRENT UPDATE INFORMATION": {
    id: "news",
    title: "News / update",
    description: "Time-sensitive facts with sources.",
    defaultOpen: false,
  },
  "LINK AND DESTINATION INFORMATION": {
    id: "links",
    title: "Links & destinations",
    description: "Bio link, destinations, UTM if used.",
    defaultOpen: false,
  },
  "CTA INFORMATION": {
    id: "cta",
    title: "Call to action",
    description: "One clear next step.",
    defaultOpen: false,
  },
  "COMMENT-KEYWORD AUTOMATION": {
    id: "comment_automation",
    title: "Comment-keyword automation",
    description: "Keywords and DM automation rules.",
    defaultOpen: false,
  },
  "ENGAGEMENT PROMPT": {
    id: "engagement",
    title: "Engagement prompt",
    description: "Real questions — no engagement bait.",
    defaultOpen: false,
  },
  "MEDIA INFORMATION": {
    id: "media",
    title: "Media",
    description: "Visuals, rights, alt text, captions.",
    defaultOpen: false,
  },
  "USER-GENERATED CONTENT": {
    id: "ugc",
    title: "User-generated content",
    description: "Permission and editing rights for UGC.",
    defaultOpen: false,
  },
  "AI-GENERATED OR SYNTHETIC MEDIA": {
    id: "synthetic_media",
    title: "AI / synthetic media",
    description: "Disclosure when synthetic media is used.",
    defaultOpen: false,
  },
  "BEFORE-AND-AFTER CONTENT": {
    id: "before_after",
    title: "Before & after",
    description: "Honest comparisons only.",
    defaultOpen: false,
  },
  "MUSIC AND AUDIO": {
    id: "audio",
    title: "Music & audio",
    description: "Licensed audio only.",
    defaultOpen: false,
  },
  EMOJIS: {
    id: "emojis",
    title: "Emojis",
    description: "Emoji policy for this account.",
    defaultOpen: false,
  },
  "HASHTAG STRATEGY": {
    id: "hashtags",
    title: "Hashtags",
    description: "Relevant tags — no stuffing.",
    defaultOpen: false,
  },
  "KEYWORD AND DISCOVERABILITY STRATEGY": {
    id: "discoverability",
    title: "Keywords & discoverability",
    description: "Natural keywords — not spam.",
    defaultOpen: false,
  },
  "MENTIONS AND TAGGING": {
    id: "mentions",
    title: "Mentions & tagging",
    description: "Only tag with permission.",
    defaultOpen: false,
  },
  "COMMUNITY MANAGEMENT": {
    id: "community",
    title: "Community management",
    description: "Comment moderation and ownership.",
    defaultOpen: false,
  },
  "DIRECT-MESSAGE MANAGEMENT": {
    id: "dms",
    title: "Direct messages",
    description: "DM ownership and automation limits.",
    defaultOpen: false,
  },
  "HIGH-STAKES CONTENT": {
    id: "high_stakes",
    title: "High-stakes content",
    description: "Medical, legal, financial, safety topics.",
    defaultOpen: false,
  },
  "REGULATED CONTENT": {
    id: "regulated",
    title: "Regulated content",
    description: "Alcohol, gambling, adult, weapons, etc.",
    defaultOpen: false,
  },
  "POLITICAL AND CIVIC CONTENT": {
    id: "political",
    title: "Political / civic",
    description: "Only when intentional and reviewed.",
    defaultOpen: false,
  },
  "TIMING AND SCHEDULING": {
    id: "timing",
    title: "Timing & scheduling",
    description: "When to publish.",
    defaultOpen: false,
  },
  "POST FREQUENCY": {
    id: "frequency",
    title: "Post frequency",
    description: "Cadence context.",
    defaultOpen: false,
  },
  "CROSS-PLATFORM ADAPTATION": {
    id: "cross_platform",
    title: "Cross-platform",
    description: "Adaptations — do not paste generic copy.",
    defaultOpen: false,
  },
  "PAID PROMOTION": {
    id: "paid",
    title: "Paid promotion",
    description: "Boost / ads separation.",
    defaultOpen: false,
  },
  "A/B TESTING": {
    id: "ab_testing",
    title: "A/B testing",
    description: "One variable at a time.",
    defaultOpen: false,
  },
  METRICS: {
    id: "metrics",
    title: "Metrics",
    description: "How success will be measured.",
    defaultOpen: false,
  },
  "CORRECTIONS AND UPDATES": {
    id: "corrections",
    title: "Corrections",
    description: "What is being corrected.",
    defaultOpen: false,
  },
  "SEO AND SEARCH DISCOVERABILITY": {
    id: "seo",
    title: "SEO / search",
    description: "Caption and keyword discoverability.",
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
  "postFormat",
  "accountName",
  "brandVoice",
  "sourceDetails",
  "primaryObjective",
  "instagramUsername",
  "productName",
];

const REQUIRED = new Set([
  "topic",
  "postType",
  "audience",
  "tone",
  "language",
]);

const ACCOUNT_TYPES = [
  "personal account",
  "creator account",
  "business account",
  "brand account",
  "company account",
  "nonprofit account",
  "community account",
  "local-business account",
  "media account",
  "educational account",
  "professional account",
  "other confirmed type",
];

const POST_TYPES = [
  "educational post",
  "informational post",
  "practical tip",
  "how-to post",
  "checklist",
  "myth-versus-fact post",
  "opinion post",
  "thought-leadership post",
  "personal story",
  "founder story",
  "creator story",
  "behind-the-scenes post",
  "build-in-public update",
  "project update",
  "company update",
  "product announcement",
  "product launch",
  "feature announcement",
  "service announcement",
  "promotional post",
  "special offer",
  "seasonal offer",
  "event announcement",
  "event reminder",
  "event recap",
  "article promotion",
  "newsletter promotion",
  "podcast promotion",
  "video promotion",
  "case study",
  "customer story",
  "testimonial post",
  "user-generated-content post",
  "milestone post",
  "partnership announcement",
  "collaboration post",
  "sponsored post",
  "affiliate post",
  "media mention",
  "award announcement",
  "hiring post",
  "community post",
  "feedback request",
  "discussion post",
  "contest",
  "giveaway",
  "fundraiser",
  "nonprofit update",
  "public-service information",
  "operational update",
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
  "visual review",
  "legal review",
  "partner review",
  "creator approval",
  "customer approval",
  "approved",
  "scheduled",
  "published",
  "updated",
  "corrected",
  "archived",
];

const POST_FORMATS = [
  "single photo",
  "single graphic",
  "single illustration",
  "carousel",
  "infographic carousel",
  "photo carousel",
  "mixed-media carousel",
  "Reel",
  "short video",
  "long-form video",
  "product post",
  "collaboration post",
  "user-generated-content post",
  "text-led graphic",
  "before-and-after post",
  "other confirmed format",
];

const YES_NO = ["yes", "no", "unknown / not applicable"];

const YES_NO_KEYS = new Set([
  "accountAccess",
  "professionalDashboard",
  "shopAvailable",
  "productTaggingAvailable",
  "collabAvailable",
  "subscriptionsAvailable",
  "broadcastChannelAvailable",
  "schedulingAvailable",
  "editingAvailable",
  "musicAvailable",
  "trendingAudioAllowed",
  "coverAvailable",
  "altTextAvailable",
  "locationTaggingAvailable",
  "registrationRequired",
  "anonymizationRequired",
  "storyPermission",
  "automaticRenewal",
  "livestreamAvailability",
  "replayAvailability",
]);

const TEXTAREA_HINTS = [
  "Description",
  "Details",
  "Information",
  "Experience",
  "Points",
  "Statistics",
  "Definitions",
  "Quotes",
  "Examples",
  "Research",
  "Facts",
  "Features",
  "Benefits",
  "Limitations",
  "Requirements",
  "Restrictions",
  "Disclaimer",
  "Attribution",
  "Uncertainties",
  "Concerns",
  "Objections",
  "Misconceptions",
  "Goals",
  "Problems",
  "Context",
  "Needs",
  "Metrics",
  "Terms",
  "Conditions",
  "Speakers",
  "Participants",
  "Eligibility",
  "Preparation",
  "Accessibility",
  "Disclosure",
  "Message",
  "Observation",
  "Insight",
  "Conflict",
  "Story",
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
  accountName: { placeholder: "Creatornivo" },
  instagramUsername: { placeholder: "@creatornivo" },
  accountUrl: { placeholder: "https://instagram.com/…" },
  accountType: {
    type: "select",
    options: ACCOUNT_TYPES,
    placeholder: "business account",
  },
  accountCategory: { placeholder: "Software / Education / Creator" },
  accountOwner: { placeholder: "Who owns this Instagram account" },
  brandName: { placeholder: "Creatornivo" },
  legalName: { placeholder: "Legal entity if different" },
  accountDescription: {
    type: "textarea",
    placeholder: "Short public bio description",
  },
  industry: { placeholder: "Content tools / marketing" },
  market: { placeholder: "English-speaking creators and marketers" },
  operatingRegions: { placeholder: "Where the brand operates" },
  websiteUrl: { placeholder: "https://www.creatornivo.com" },
  bioLink: { placeholder: "Current link-in-bio destination" },
  contactDestination: { placeholder: "DM / email / form" },
  businessAddress: { placeholder: "Only if public and needed" },
  contactDetails: { type: "textarea", placeholder: "Public contact only" },
  verificationStatus: {
    type: "select",
    options: ["verified", "not verified", "unknown"],
    placeholder: "not verified",
  },
  accountAccess: {
    type: "select",
    options: YES_NO,
    placeholder: "yes",
  },
  professionalDashboard: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },
  shopAvailable: {
    type: "select",
    options: YES_NO,
    placeholder: "no",
  },
  productTaggingAvailable: {
    type: "select",
    options: YES_NO,
    placeholder: "no",
  },
  collabAvailable: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },
  subscriptionsAvailable: {
    type: "select",
    options: YES_NO,
    placeholder: "no",
  },
  broadcastChannelAvailable: {
    type: "select",
    options: YES_NO,
    placeholder: "no",
  },
  postName: { placeholder: "Internal label for this post" },
  topic: {
    placeholder: "How we batch Instagram captions with templates",
    hint: "What the post is about — Instagram-specific angle.",
    what: "Post topic.",
    why: "Keeps the package focused on one idea for Instagram.",
    example: "Behind the scenes of our content system",
    avoid: "Generic multi-platform blurbs.",
  },
  postType: {
    type: "select",
    options: POST_TYPES,
    placeholder: "educational post",
    hint: "Pick one confirmed type.",
  },
  primaryObjective: {
    placeholder: "educate / announce / start discussion",
  },
  secondaryObjective: {
    placeholder: "Optional light secondary goal",
  },
  mainMessage: {
    type: "textarea",
    placeholder: "One clear takeaway for the caption and visual",
  },
  desiredAction: {
    placeholder: "comment / save / visit link in bio / DM",
    hint: "One primary action — not a stack of asks.",
  },
  secondaryAction: { placeholder: "Optional secondary action" },
  campaignRole: { placeholder: "standalone / launch / series" },
  relatedCampaign: { placeholder: "Campaign name if any" },
  postStatus: {
    type: "select",
    options: POST_STATUSES,
    placeholder: "internal draft",
  },
  preferredLength: {
    placeholder: "short caption / medium / long",
  },
  language: { placeholder: "English" },
  targetLocale: { placeholder: "en-US" },
  tone: {
    placeholder: "clear, human, scroll-stopping but honest",
    hint: "How the caption should sound.",
  },
  brandVoice: {
    placeholder: "honest Early Access product — no fake social proof",
  },
  pointOfView: {
    type: "select",
    options: ["first person", "second person", "third person", "brand we"],
    placeholder: "brand we",
  },
  publishDate: { placeholder: "YYYY-MM-DD" },
  publishTime: { placeholder: "HH:MM" },
  publishTimeZone: { placeholder: "America/New_York" },
  campaignStartDate: { placeholder: "YYYY-MM-DD if campaign" },
  campaignEndDate: { placeholder: "YYYY-MM-DD if campaign" },
  replacementDate: { placeholder: "When to replace or archive" },
  postFormat: {
    type: "select",
    options: POST_FORMATS,
    placeholder: "carousel",
    hint: "Primary Instagram format for this package.",
  },
  secondaryFormat: {
    placeholder: "e.g. Story cut / Reel cut — optional",
  },
  carouselSlideCount: { placeholder: "e.g. 6" },
  videoDuration: { placeholder: "e.g. 15s / 30s" },
  videoOrientation: {
    type: "select",
    options: ["vertical 9:16", "square 1:1", "horizontal 16:9", "unknown"],
    placeholder: "vertical 9:16",
  },
  imageOrientation: {
    type: "select",
    options: ["square 1:1", "portrait 4:5", "landscape", "unknown"],
    placeholder: "portrait 4:5",
  },
  aspectRatio: { placeholder: "4:5 / 9:16 / 1:1" },
  captionLimit: { placeholder: "Current IG caption limit if known" },
  hashtagLimit: { placeholder: "Current hashtag limit if known" },
  carouselLimit: { placeholder: "Current max slides if known" },
  videoRequirements: {
    type: "textarea",
    placeholder: "Length, codec, safe areas — if known",
  },
  platformRestrictions: {
    type: "textarea",
    placeholder: "Music, tagging, shop limits for this account",
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
  musicAvailable: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },
  trendingAudioAllowed: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },
  coverAvailable: {
    type: "select",
    options: YES_NO,
    placeholder: "yes",
  },
  altTextAvailable: {
    type: "select",
    options: YES_NO,
    placeholder: "yes",
  },
  locationTaggingAvailable: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },
  audience: {
    placeholder: "creators and marketers who publish weekly",
    hint: "Primary Instagram audience.",
  },
  secondaryAudience: { placeholder: "Optional secondary segment" },
  audienceSegment: { placeholder: "followers / cold / customers" },
  audienceLocation: { placeholder: "Where most followers are" },
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
    placeholder: "problem-aware",
  },
  purchaseStage: {
    type: "select",
    options: [
      "not shopping",
      "awareness",
      "consideration",
      "decision",
      "post-purchase",
    ],
    placeholder: "not shopping",
  },
  audienceRelationship: {
    placeholder: "followers / community / customers",
  },
  audienceStatus: {
    type: "select",
    options: ["existing followers", "new audience", "mixed"],
    placeholder: "existing followers",
  },
  customerStatus: {
    type: "select",
    options: ["not customers", "mixed", "customers"],
    placeholder: "mixed",
  },
  communityStatus: {
    type: "select",
    options: ["public audience", "community", "mixed"],
    placeholder: "public audience",
  },
  painPoint: {
    placeholder: "Blank-page paralysis when writing captions",
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
  desiredEmotion: { placeholder: "clarity / curiosity / motivation" },
  practicalOutcome: {
    placeholder: "They can try one concrete caption tactic",
  },
  accessibilityNeeds: {
    type: "textarea",
    placeholder: "Captions, alt text, plain language…",
  },
  culturalContext: {
    type: "textarea",
    placeholder: "Locale-specific norms if relevant",
  },
  excludedAudience: { placeholder: "Who this post is not for" },
  contentGoal: { placeholder: "educate / announce / discuss" },
  businessGoal: { placeholder: "profile visits / none this post" },
  communityGoal: { placeholder: "useful comments" },
  educationalGoal: { placeholder: "teach one idea" },
  conversionGoal: { placeholder: "only if this post should convert" },
  trustGoal: { placeholder: "show honest product status" },
  reachGoal: { placeholder: "optional" },
  engagementGoal: { placeholder: "saves / comments" },
  expectedNextStep: { placeholder: "save / comment / link in bio" },
  primaryMetric: { placeholder: "saves / profile visits" },
  secondaryMetrics: { placeholder: "comments, link clicks" },
  guardrailMetrics: {
    type: "textarea",
    placeholder: "hides, unfollows, spam reports",
  },
  coreTopic: { placeholder: "Tighter angle of the topic" },
  primaryClaim: {
    type: "textarea",
    placeholder: "Main claim — only if true and approved",
  },
  supportingPoints: {
    type: "textarea",
    placeholder: "2–5 points for slides or caption",
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
  approvedResearch: {
    type: "textarea",
    placeholder: "Research you may cite",
  },
  productFacts: {
    type: "textarea",
    placeholder: "Real product facts for this post",
  },
  marketFacts: {
    type: "textarea",
    placeholder: "Only verified market facts",
  },
  customerInformation: {
    type: "textarea",
    placeholder: "Permissioned customer details only",
  },
  personalExperience: {
    type: "textarea",
    placeholder: "Approved first-hand experience only — or leave blank",
    hint: "Never invent personal stories.",
  },
  knownLimitations: {
    type: "textarea",
    placeholder: "Honest product or claim limits",
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
  requiredDisclaimer: {
    type: "textarea",
    placeholder: "Required disclaimers",
  },
  restrictions: {
    type: "textarea",
    placeholder: "Words and claims to avoid",
  },
  confidentialInformation: {
    type: "textarea",
    placeholder: "Do not publish",
  },
  sensitiveInformation: {
    type: "textarea",
    placeholder: "Handle carefully / omit",
  },
  productName: { placeholder: "Creatornivo" },
  productCategory: { placeholder: "AI content templates" },
  productDescription: {
    type: "textarea",
    placeholder: "Short accurate product description",
  },
  primaryUseCase: {
    placeholder: "Structured Instagram captions from a brief",
  },
  targetCustomer: { placeholder: "Creators and marketers" },
  problemAddressed: {
    placeholder: "Generic captions that ignore Instagram format",
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
      "waitlist",
      "limited release",
      "phased rollout",
      "generally available",
      "temporarily unavailable",
      "discontinued",
      "planned",
    ],
    placeholder: "Early Access",
  },
  availability: { placeholder: "Available now / waitlist" },
  supportedRegions: { placeholder: "Where it works" },
  supportedLanguages: { placeholder: "English" },
  supportedPlatforms: { placeholder: "Web / mobile app" },
  compatibility: { type: "textarea", placeholder: "Requirements if any" },
  requirements: {
    type: "textarea",
    placeholder: "Account / subscription needs",
  },
  limitations: { type: "textarea", placeholder: "Honest limits" },
  includedItems: { type: "textarea", placeholder: "What is included" },
  excludedItems: { type: "textarea", placeholder: "What is not included" },
  productUrl: { placeholder: "https://www.creatornivo.com" },
  offerName: { placeholder: "Only if promoting a real offer" },
  offerDescription: { type: "textarea", placeholder: "Real offer details" },
  price: { placeholder: "Only confirmed current price" },
  currency: { placeholder: "USD" },
  discount: { placeholder: "Only if real and enforced" },
  previousPrice: { placeholder: "Only if true" },
  promoCode: { placeholder: "Only real codes" },
  offerStartDate: { placeholder: "YYYY-MM-DD" },
  offerEndDate: { placeholder: "YYYY-MM-DD" },
  offerEndTime: { placeholder: "HH:MM" },
  offerTimeZone: { placeholder: "UTC" },
  eligibleItems: { type: "textarea", placeholder: "What qualifies" },
  eligibleUsers: { type: "textarea", placeholder: "Who is eligible" },
  eligibleRegions: { type: "textarea", placeholder: "Where offer applies" },
  minimumPurchase: { placeholder: "If any" },
  maximumDiscount: { placeholder: "If any" },
  capacity: { placeholder: "Only if operationally true" },
  customerLimit: { placeholder: "Per customer limit" },
  redemptionMethod: {
    type: "textarea",
    placeholder: "How to redeem",
  },
  offerCombination: {
    type: "textarea",
    placeholder: "Can combine with other offers?",
  },
  taxDetails: { type: "textarea", placeholder: "Taxes/fees if disclosed" },
  shippingConditions: {
    type: "textarea",
    placeholder: "If physical goods",
  },
  trialDetails: { type: "textarea", placeholder: "Real trial terms" },
  subscriptionTerms: {
    type: "textarea",
    placeholder: "Billing reality if mentioned",
  },
  automaticRenewal: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },
  refundTerms: { type: "textarea", placeholder: "If mentioned" },
  offerUrl: { placeholder: "https://…" },
  offerTermsUrl: { placeholder: "Full terms URL" },
  eventName: { placeholder: "Event name if applicable" },
  eventType: { placeholder: "webinar / Live / meetup" },
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
  eventEligibility: { type: "textarea", placeholder: "Who may attend" },
  registrationRequired: {
    type: "select",
    options: YES_NO,
    placeholder: "yes",
  },
  registrationDeadline: { placeholder: "YYYY-MM-DD" },
  ticketPrice: { placeholder: "Free / amount" },
  eventCapacity: { placeholder: "Only if known" },
  eventPreparation: {
    type: "textarea",
    placeholder: "What attendees should prepare",
  },
  eventAccessibility: {
    type: "textarea",
    placeholder: "Accessibility arrangements",
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
  eventUrl: { placeholder: "Event URL" },
  registrationUrl: { placeholder: "Registration URL" },
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
};

function resolveGroupMeta(sectionName) {
  if (GROUP_META[sectionName]) return GROUP_META[sectionName];
  if (!sectionName || sectionName === "other") return GROUP_META.other;
  return {
    id: sectionToId(sectionName) || "other",
    title: sectionToTitle(sectionName),
    description: "Parameters from this prompt section.",
    defaultOpen: false,
  };
}

function defaultHelp(key, label, section) {
  return {
    what: `${label} — a parameter from the Instagram Post brief (${section}).`,
    why: `When provided, the model uses this instead of inventing stories, offers, tags, or social proof. Empty fields stay unset ([${key}]).`,
    example: `A short, factual value for ${label.toLowerCase()} you can verify before publishing on Instagram.`,
    avoid: `Fake urgency, invented personal stories, engagement bait, or unverified product claims for ${label.toLowerCase()}.`,
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
    slug: "instagram-post",
    title: "Instagram Post",
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
