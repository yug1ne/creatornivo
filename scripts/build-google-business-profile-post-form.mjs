/**
 * Builds full Google Business Profile Post form schema from the prompt.
 * Does NOT modify the prompt text — only form metadata for UX.
 *
 * Usage: node scripts/build-google-business-profile-post-form.mjs
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
  "google-business-profile-post.txt",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "google-business-profile-post-variables.json",
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
  return sectionName
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const GROUP_META = {
  essentials: {
    id: "essentials",
    title: "Essentials",
    description: "Minimum inputs for a location-accurate GBP post.",
    defaultOpen: true,
  },
  "PROFILE AND BUSINESS INFORMATION": {
    id: "profile",
    title: "Profile & business",
    description: "Verified business identity and category only.",
    defaultOpen: true,
  },
  "LOCATION INFORMATION": {
    id: "location",
    title: "Location",
    description: "Address, service area, access — never invent nearby cities.",
    defaultOpen: true,
  },
  "MULTI-LOCATION INFORMATION": {
    id: "multi_location",
    title: "Multi-location",
    description: "Which locations this post applies to.",
    defaultOpen: false,
  },
  "POST INFORMATION": {
    id: "post",
    title: "Post information",
    description: "Type, message, tone, length, schedule.",
    defaultOpen: true,
  },
  "PLATFORM FORMAT": {
    id: "platform",
    title: "Platform format",
    description: "GBP post format, CTA button, limits — verify in account.",
    defaultOpen: false,
  },
  "AUDIENCE INFORMATION": {
    id: "audience",
    title: "Local audience",
    description: "Who this post is for and local intent.",
    defaultOpen: true,
  },
  "CONTENT OBJECTIVE": {
    id: "objectives",
    title: "Objectives",
    description: "One dominant goal per post.",
    defaultOpen: false,
  },
  "BUSINESS HOURS": {
    id: "hours",
    title: "Business hours",
    description: "Only verified hours; update profile fields too.",
    defaultOpen: false,
  },
  "PRODUCT OR SERVICE INFORMATION": {
    id: "product",
    title: "Product / service",
    description: "What is currently available at this location.",
    defaultOpen: false,
  },
  "OFFER INFORMATION": {
    id: "offer",
    title: "Offer",
    description: "Prices and deadlines only if real and enforced.",
    defaultOpen: false,
  },
  "EVENT INFORMATION": {
    id: "event",
    title: "Event",
    description: "Absolute dates, location, registration.",
    defaultOpen: false,
  },
  "APPOINTMENT AND BOOKING INFORMATION": {
    id: "booking",
    title: "Appointments & booking",
    description: "Real availability and booking paths only.",
    defaultOpen: false,
  },
  "ORDERING AND FULFILLMENT INFORMATION": {
    id: "ordering",
    title: "Ordering & fulfillment",
    description: "Pickup, delivery, ordering links.",
    defaultOpen: false,
  },
  "HIRING INFORMATION": {
    id: "hiring",
    title: "Hiring",
    description: "Real open roles only.",
    defaultOpen: false,
  },
  "LOCAL COMMUNITY INFORMATION": {
    id: "community",
    title: "Local community",
    description: "Partnerships and local updates.",
    defaultOpen: false,
  },
  "APPROVED FACTS AND CLAIMS": {
    id: "facts",
    title: "Approved facts",
    description: "Only claims you can verify.",
    defaultOpen: false,
  },
  "LOCAL SEO INFORMATION": {
    id: "local_seo",
    title: "Local SEO inputs",
    description: "Natural local terms — no stuffing.",
    defaultOpen: false,
  },
  "NAME, ADDRESS, AND PHONE CONSISTENCY": {
    id: "nap",
    title: "NAP consistency",
    description: "Match public name, address, phone.",
    defaultOpen: false,
  },
  "LINK INFORMATION": {
    id: "links",
    title: "Links",
    description: "Approved destinations and UTM if used.",
    defaultOpen: false,
  },
  "CTA BUTTON": {
    id: "cta_button",
    title: "CTA button",
    description: "Only buttons currently available on the profile.",
    defaultOpen: false,
  },
  "POST OPENING": {
    id: "opening",
    title: "Post opening",
    description: "How the post should open.",
    defaultOpen: false,
  },
  EMOJIS: {
    id: "emojis",
    title: "Emojis",
    description: "Emoji policy for this brand.",
    defaultOpen: false,
  },
  HASHTAGS: {
    id: "hashtags",
    title: "Hashtags",
    description: "Sparse, relevant tags only.",
    defaultOpen: false,
  },
  "MEDIA INFORMATION": {
    id: "media",
    title: "Media",
    description: "Photos/video rights and alt needs.",
    defaultOpen: false,
  },
  "AI-GENERATED OR SYNTHETIC MEDIA": {
    id: "synthetic_media",
    title: "AI / synthetic media",
    description: "Disclosure when synthetic media is used.",
    defaultOpen: false,
  },
  "REVIEWS AND REPUTATION": {
    id: "reviews",
    title: "Reviews & reputation",
    description: "No review gating or fake ratings.",
    defaultOpen: false,
  },
  "MESSAGING AND CONTACT": {
    id: "messaging",
    title: "Messaging & contact",
    description: "Phone, chat, response ownership.",
    defaultOpen: false,
  },
  "HIGH-STAKES AND REGULATED CATEGORIES": {
    id: "regulated",
    title: "Regulated categories",
    description: "Medical, legal, financial, alcohol, etc.",
    defaultOpen: false,
  },
  CORRECTIONS: {
    id: "corrections",
    title: "Corrections",
    description: "What is being fixed and why.",
    defaultOpen: false,
  },
  "TIMING AND SCHEDULING": {
    id: "timing",
    title: "Timing & scheduling",
    description: "When to publish and replace.",
    defaultOpen: false,
  },
  "FREQUENCY AND REPLACEMENT": {
    id: "frequency",
    title: "Frequency & replacement",
    description: "Cadence and post replacement.",
    defaultOpen: false,
  },
  "ORGANIC AND PAID USE": {
    id: "organic_paid",
    title: "Organic vs paid",
    description: "Keep organic claims honest.",
    defaultOpen: false,
  },
  "FRESHNESS AND MAINTENANCE": {
    id: "freshness",
    title: "Freshness & maintenance",
    description: "Review and removal timing.",
    defaultOpen: false,
  },
  "MEASUREMENT INFORMATION": {
    id: "measurement",
    title: "Measurement",
    description: "How success will be measured.",
    defaultOpen: false,
  },
  "A/B TESTING": {
    id: "ab_testing",
    title: "A/B testing",
    description: "One variable at a time if testing.",
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
  "businessName",
  "topic",
  "postType",
  "audience",
  "tone",
  "language",
  "mainMessage",
  "desiredAction",
  "city",
  "primaryCategory",
  "businessType",
  "brandVoice",
  "sourceDetails",
  "locationName",
  "serviceArea",
];

const REQUIRED = new Set([
  "businessName",
  "topic",
  "postType",
  "audience",
  "tone",
  "language",
]);

const BUSINESS_TYPES = [
  "physical storefront",
  "service-area business",
  "hybrid storefront and service-area business",
  "restaurant or café",
  "hotel or accommodation",
  "healthcare provider",
  "professional service",
  "home-service provider",
  "retail store",
  "automotive business",
  "beauty or wellness business",
  "educational organization",
  "entertainment venue",
  "nonprofit organization",
  "real-estate business",
  "travel business",
  "financial-service business",
  "legal-service business",
  "online business with an eligible physical or service presence",
  "other confirmed eligible business type",
];

const POST_TYPES = [
  "general business update",
  "service announcement",
  "product announcement",
  "new-product launch",
  "new-service launch",
  "special offer",
  "discount",
  "seasonal promotion",
  "limited-time promotion",
  "event announcement",
  "event reminder",
  "event update",
  "event cancellation",
  "event recap",
  "holiday-hours update",
  "special-hours announcement",
  "temporary closure",
  "reopening announcement",
  "relocation announcement",
  "renovation update",
  "service interruption",
  "maintenance notice",
  "appointment-availability update",
  "booking announcement",
  "menu update",
  "seasonal menu",
  "inventory update",
  "back-in-stock announcement",
  "local community update",
  "local partnership announcement",
  "hiring announcement",
  "educational tip",
  "customer-information update",
  "health or safety update",
  "policy update",
  "product recall",
  "correction",
  "clarification",
  "emergency operational update",
  "custom confirmed post type",
];

const POST_STATUSES = [
  "concept",
  "internal draft",
  "fact review",
  "location review",
  "offer review",
  "legal review",
  "compliance review",
  "approved",
  "scheduled",
  "published",
  "updated",
  "corrected",
  "expired",
  "removed",
  "archived",
];

const SEARCH_INTENTS = [
  "find a nearby business",
  "compare local providers",
  "check opening hours",
  "view services",
  "view products",
  "book an appointment",
  "place an order",
  "get directions",
  "call the business",
  "check current availability",
  "check a promotion",
  "register for an event",
  "verify whether the business is open",
  "understand a service",
  "resolve an operational question",
  "other confirmed local intent",
];

const YES_NO = ["yes", "no", "unknown / not applicable"];

const YES_NO_KEYS = new Set([
  "centralizedPublishing",
  "localApproval",
  "locationVariations",
  "schedulingAvailable",
  "editingAvailable",
  "appointmentRequirement",
  "bookingRequirement",
]);

const TEXTAREA_HINTS = [
  "Description",
  "Information",
  "Instructions",
  "Restrictions",
  "Services",
  "Differences",
  "Requirements",
  "Limitations",
  "Eligibility",
  "Features",
  "Benefits",
  "Details",
  "Terms",
  "Credentials",
  "Certifications",
  "Licenses",
  "Awards",
  "Accessibility",
  "Availability",
  "Message",
  "Objective",
  "Concern",
  "Objection",
  "Misconception",
  "Sources",
  "Facts",
  "Claims",
  "Behavior",
  "Formats",
  "Buttons",
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
  campaignName: {
    placeholder: "Internal — July hours update downtown",
  },
  businessName: {
    placeholder: "Northside Studio",
    hint: "Public business name as on the Google profile.",
    what: "Business name on the Google Business Profile.",
    why: "Posts must match the real profile identity.",
    example: "Northside Studio",
    avoid: "Invented brands or mismatched NAP names.",
  },
  profileName: { placeholder: "Name shown on the profile if different" },
  legalBusinessName: { placeholder: "Legal entity if different" },
  profileUrl: { placeholder: "https://g.page/… or maps URL" },
  websiteUrl: { placeholder: "https://www.example.com" },
  primaryCategory: {
    placeholder: "Hair salon / Plumber / Restaurant",
    hint: "Primary GBP category only if accurate.",
  },
  secondaryCategories: {
    type: "textarea",
    placeholder: "Secondary categories if set on the profile",
  },
  businessType: {
    type: "select",
    options: BUSINESS_TYPES,
    placeholder: "physical storefront",
  },
  businessDescription: {
    type: "textarea",
    placeholder: "Short accurate description of what you do",
  },
  productsServices: {
    type: "textarea",
    placeholder: "Main products or services",
  },
  primaryUseCase: { placeholder: "Why customers choose you" },
  customerProblem: { placeholder: "Problem you solve for locals" },
  differentiator: {
    type: "textarea",
    placeholder: "Real differentiator — no unsupported superlatives",
  },
  businessModel: { placeholder: "retail / service-area / hybrid" },
  businessAge: { placeholder: "Only if known and public" },
  credentials: { type: "textarea", placeholder: "Verified only" },
  certifications: { type: "textarea", placeholder: "Verified only" },
  licenses: { type: "textarea", placeholder: "Verified only" },
  awards: { type: "textarea", placeholder: "Verified only" },
  contactInformation: {
    type: "textarea",
    placeholder: "Public phone / email as on profile",
  },
  profileVerificationStatus: {
    type: "select",
    options: ["verified", "unverified", "unknown"],
    placeholder: "verified",
  },
  profileAccessStatus: {
    placeholder: "Owner / manager access confirmed",
  },
  locationName: { placeholder: "Downtown location / Main store" },
  streetAddress: { placeholder: "Only if publicly shown on profile" },
  city: { placeholder: "City where the business operates" },
  region: { placeholder: "State / region" },
  postalCode: { placeholder: "Postal code" },
  country: { placeholder: "Country" },
  neighborhood: {
    placeholder: "Only if real and not stuffed for SEO",
  },
  district: { placeholder: "District if relevant" },
  landmark: { placeholder: "Only real landmarks" },
  serviceArea: {
    type: "textarea",
    placeholder: "Cities/areas you actually serve",
    hint: "Do not invent service areas for more local searches.",
  },
  serviceRadius: { placeholder: "e.g. 25 miles — only if true" },
  additionalLocations: {
    type: "textarea",
    placeholder: "Other locations if multi-location",
  },
  locationServices: {
    type: "textarea",
    placeholder: "Services only at this location",
  },
  locationRestrictions: {
    type: "textarea",
    placeholder: "What this location does not offer",
  },
  parkingInformation: {
    type: "textarea",
    placeholder: "Verified parking info only",
  },
  transportInformation: {
    type: "textarea",
    placeholder: "Verified transit info only",
  },
  buildingAccess: {
    type: "textarea",
    placeholder: "Entrance / floor if public",
  },
  accessibilityInformation: {
    type: "textarea",
    placeholder: "Verified accessibility details",
  },
  entranceInstructions: {
    type: "textarea",
    placeholder: "How to find the entrance",
  },
  appointmentRequirement: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },
  locationCount: { placeholder: "1 / 3 / …" },
  applicableLocations: {
    type: "textarea",
    placeholder: "Which locations this post applies to",
  },
  locationVariations: {
    type: "select",
    options: YES_NO,
    placeholder: "no",
  },
  centralizedPublishing: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },
  localApproval: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },
  locationManager: { placeholder: "Who owns this location’s content" },
  inventoryDifferences: {
    type: "textarea",
    placeholder: "Location inventory differences",
  },
  pricingDifferences: {
    type: "textarea",
    placeholder: "Location pricing differences",
  },
  hoursDifferences: {
    type: "textarea",
    placeholder: "Location hours differences",
  },
  offerDifferences: {
    type: "textarea",
    placeholder: "Offer differences by location",
  },
  eventDifferences: {
    type: "textarea",
    placeholder: "Event differences by location",
  },
  postName: { placeholder: "Internal label for this post" },
  topic: {
    placeholder: "New Saturday hours starting next week",
    hint: "What the post is about — one clear local update.",
    what: "Post topic.",
    why: "Keeps the GBP post focused on one operational or local message.",
    example: "Temporary closure for renovations March 10–12",
    avoid: "Generic multi-platform promo copy.",
  },
  postType: {
    type: "select",
    options: POST_TYPES,
    placeholder: "holiday-hours update",
    hint: "Pick the confirmed type — do not change it later.",
  },
  primaryObjective: {
    placeholder: "inform local customers of special hours",
  },
  secondaryObjective: {
    placeholder: "Optional secondary goal — keep light",
  },
  mainMessage: {
    type: "textarea",
    placeholder: "One clear message customers need",
  },
  desiredAction: {
    placeholder: "get directions / call / book / order",
    hint: "Primary action that matches an available CTA if used.",
  },
  secondaryAction: {
    placeholder: "Optional secondary action",
  },
  postStatus: {
    type: "select",
    options: POST_STATUSES,
    placeholder: "internal draft",
  },
  preferredLength: {
    placeholder: "short — under platform character limit",
  },
  characterLimit: {
    placeholder: "Current limit from the GBP interface",
  },
  language: { placeholder: "English" },
  targetLocale: { placeholder: "en-US" },
  tone: {
    placeholder: "friendly, clear, local",
    hint: "How the post should sound to nearby customers.",
  },
  brandVoice: {
    placeholder: "neighborly, honest, no hype",
  },
  publishDate: { placeholder: "YYYY-MM-DD" },
  publishTime: { placeholder: "HH:MM" },
  publishTimeZone: { placeholder: "America/New_York" },
  campaignStartDate: { placeholder: "YYYY-MM-DD if campaign" },
  campaignEndDate: { placeholder: "YYYY-MM-DD if campaign" },
  replacementDate: {
    placeholder: "When this post should be replaced",
  },
  postFormat: {
    placeholder: "update / offer / event — verify in account",
  },
  availablePostFormats: {
    type: "textarea",
    placeholder: "Formats currently available on this profile",
  },
  availableCtaButtons: {
    type: "textarea",
    placeholder: "CTA buttons currently available",
  },
  selectedCtaButton: {
    placeholder: "Book / Call / Order online / Learn more — if available",
  },
  ctaRequirements: {
    type: "textarea",
    placeholder: "Destination requirements for the CTA",
  },
  supportedMedia: {
    type: "textarea",
    placeholder: "Image / video support for this format",
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
  displayBehavior: {
    type: "textarea",
    placeholder: "How posts currently appear on this profile",
  },
  expirationBehavior: {
    type: "textarea",
    placeholder: "How long posts remain / expire",
  },
  profileRestrictions: {
    type: "textarea",
    placeholder: "Category or region restrictions if known",
  },
  audience: {
    placeholder: "Nearby customers searching for your category",
    hint: "Primary local audience.",
  },
  secondaryAudience: { placeholder: "Tourists / B2B / etc. if relevant" },
  audienceSegment: { placeholder: "new visitors / regulars" },
  audienceLocation: { placeholder: "Neighborhood / city / service area" },
  searchIntent: {
    type: "select",
    options: SEARCH_INTENTS,
    placeholder: "check opening hours",
  },
  knowledgeLevel: {
    type: "select",
    options: ["new to business", "existing customers", "mixed"],
    placeholder: "mixed",
  },
  audienceRelationship: {
    placeholder: "locals / customers / visitors",
  },
  customerType: {
    type: "select",
    options: ["new", "returning", "mixed"],
    placeholder: "mixed",
  },
  customerNeed: { placeholder: "What they need right now" },
  customerConcern: { placeholder: "What they worry about" },
  customerObjection: { placeholder: "Why they might not act" },
  misconception: {
    type: "textarea",
    placeholder: "Common wrong belief to correct carefully",
  },
  audienceLanguage: { placeholder: "English" },
  audienceAccessibilityNeeds: {
    type: "textarea",
    placeholder: "If relevant for this post",
  },
  excludedAudience: { placeholder: "Who this post is not for" },
  contentGoal: { placeholder: "inform / announce / book" },
  localDiscoveryGoal: { placeholder: "Optional local discovery aim" },
  conversionGoal: { placeholder: "call / book / order — if any" },
  operationalGoal: {
    placeholder: "reduce wrong-hour visits / set expectations",
  },
  trustGoal: { placeholder: "clear honest update" },
  customerServiceGoal: {
    placeholder: "prevent support questions",
  },
  practicalOutcome: {
    placeholder: "They know whether to visit and when",
  },
  expectedNextStep: {
    placeholder: "Get directions / Call / Book",
  },
  campaignRole: { placeholder: "standalone / series" },
  relatedCampaign: { placeholder: "Campaign name if any" },
  regularHours: {
    type: "textarea",
    placeholder: "Mon–Fri 9–5 — only if verified",
  },
  specialHours: {
    type: "textarea",
    placeholder: "Holiday or temporary hours",
  },
  holidayHours: { type: "textarea", placeholder: "Holiday schedule" },
  closureDates: { type: "textarea", placeholder: "YYYY-MM-DD – YYYY-MM-DD" },
  reopeningDate: { placeholder: "YYYY-MM-DD" },
  appointmentHours: {
    type: "textarea",
    placeholder: "Appointment-only windows",
  },
  serviceHours: { type: "textarea", placeholder: "On-site service hours" },
  deliveryHours: { type: "textarea", placeholder: "Delivery hours" },
  pickupHours: { type: "textarea", placeholder: "Pickup hours" },
  kitchenHours: { type: "textarea", placeholder: "Kitchen hours if food" },
  lastBookingTime: { placeholder: "Last booking time" },
  lastOrderTime: { placeholder: "Last order time" },
  businessTimeZone: { placeholder: "America/New_York" },
  hoursVerifiedDate: { placeholder: "YYYY-MM-DD when hours were checked" },
  subjectName: { placeholder: "Product or service featured" },
  subjectCategory: { placeholder: "Category" },
  subjectDescription: {
    type: "textarea",
    placeholder: "Accurate description",
  },
  subjectUseCase: { placeholder: "Primary use case" },
  targetCustomer: { placeholder: "Who it is for" },
  problemAddressed: { placeholder: "Problem it solves" },
  features: { type: "textarea", placeholder: "Confirmed features" },
  benefits: { type: "textarea", placeholder: "Confirmed benefits" },
  availability: {
    type: "select",
    options: [
      "currently available",
      "selected locations",
      "by appointment",
      "temporarily unavailable",
      "out of stock",
      "limited release",
      "planned",
      "seasonal",
      "discontinued",
    ],
    placeholder: "currently available",
  },
  locationAvailability: {
    type: "textarea",
    placeholder: "Where it is available",
  },
  serviceAreaAvailability: {
    type: "textarea",
    placeholder: "Service-area availability",
  },
  appointmentAvailability: {
    type: "textarea",
    placeholder: "Only if booking system confirms",
  },
  inventoryStatus: { placeholder: "in stock / limited / out" },
  limitations: { type: "textarea", placeholder: "Honest limits" },
  compatibility: { type: "textarea", placeholder: "If relevant" },
  eligibility: { type: "textarea", placeholder: "Who can buy/use" },
  includedItems: { type: "textarea", placeholder: "What is included" },
  excludedItems: { type: "textarea", placeholder: "What is excluded" },
  preparationRequirements: {
    type: "textarea",
    placeholder: "What customers should prepare",
  },
  serviceDuration: { placeholder: "e.g. 45 minutes" },
  subjectUrl: { placeholder: "https://…" },
  offerName: { placeholder: "Only if promoting a real offer" },
  offerDescription: { type: "textarea", placeholder: "Full offer terms summary" },
  price: { placeholder: "Confirmed current price" },
  currency: { placeholder: "USD" },
  discount: { placeholder: "Only if real and enforced" },
  previousPrice: { placeholder: "Only true reference price" },
  promoCode: { placeholder: "Only real codes" },
  offerStartDate: { placeholder: "YYYY-MM-DD" },
  offerEndDate: { placeholder: "YYYY-MM-DD" },
  offerStartTime: { placeholder: "HH:MM" },
  offerEndTime: { placeholder: "HH:MM" },
  offerTimeZone: { placeholder: "America/New_York" },
  eligibleItems: { type: "textarea", placeholder: "What qualifies" },
  eligibleLocations: { type: "textarea", placeholder: "Which locations" },
  eligibleCustomers: { type: "textarea", placeholder: "Who is eligible" },
  minimumPurchase: { placeholder: "If any" },
  maximumRedemption: { placeholder: "If any" },
  customerLimit: { placeholder: "Per customer limit" },
  quantityAvailable: { placeholder: "Only if operationally true" },
  bookingRequirement: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },
  redemptionMethod: {
    type: "textarea",
    placeholder: "How to redeem",
  },
  offerCombination: {
    type: "textarea",
    placeholder: "Can combine with other offers?",
  },
  taxInformation: { type: "textarea", placeholder: "Tax notes if disclosed" },
  additionalFees: { type: "textarea", placeholder: "Fees if any" },
  offerCancellationTerms: {
    type: "textarea",
    placeholder: "Cancellation rules",
  },
  offerUrl: { placeholder: "Landing page URL" },
  offerTermsUrl: { placeholder: "Full terms URL" },
  eventName: { placeholder: "Event name if post is event type" },
  eventType: { placeholder: "workshop / sale / open house" },
  eventDescription: { type: "textarea", placeholder: "What happens" },
  eventStartDate: { placeholder: "YYYY-MM-DD absolute date" },
  eventEndDate: { placeholder: "YYYY-MM-DD" },
  eventStartTime: { placeholder: "HH:MM" },
  eventEndTime: { placeholder: "HH:MM" },
  eventTimeZone: { placeholder: "America/New_York" },
  eventLocation: { placeholder: "Address or online" },
  eventFormat: {
    type: "select",
    options: ["in-person", "online", "hybrid"],
    placeholder: "in-person",
  },
  sourceDetails: {
    type: "textarea",
    placeholder: "Approved facts only — hours, prices, offers",
    hint: "Model will not invent local details.",
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
    what: `${label} — a parameter from the Google Business Profile post brief (${section}).`,
    why: `When provided, the model uses this instead of inventing local facts, hours, offers, or profile details. Empty fields stay unset ([${key}]).`,
    example: `A short, factual value for ${label.toLowerCase()} that matches the live Google profile.`,
    avoid: `Keyword stuffing, fake local areas, invented hours/prices, or multi-location mix-ups for ${label.toLowerCase()}.`,
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
    const field = buildField(
      key,
      sectionMap[key] || "POST INFORMATION",
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
    slug: "google-business-profile-post",
    title: "Google Business Profile Post",
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
