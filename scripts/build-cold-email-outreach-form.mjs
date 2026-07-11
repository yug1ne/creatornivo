/**
 * Builds full Cold Email Outreach form schema from the prompt.
 * Does NOT modify the prompt text — only form metadata for UX.
 *
 * Usage: node scripts/build-cold-email-outreach-form.mjs
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
  "cold-email-outreach.txt",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "cold-email-outreach-variables.json",
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
    description: "Minimum inputs for a legitimate, usable outreach draft.",
    defaultOpen: true,
  },
  "CAMPAIGN INFORMATION": {
    id: "campaign",
    title: "Campaign",
    description: "Goal, type, length, language, and ownership.",
    defaultOpen: true,
  },
  "SENDER INFORMATION": {
    id: "sender",
    title: "Sender",
    description: "Real sender identity only — no impersonation.",
    defaultOpen: true,
  },
  "SENDING IDENTITY": {
    id: "sending_identity",
    title: "Sending identity & stack",
    description: "Domains, ESP, CRM, and reply ownership.",
    defaultOpen: false,
  },
  "PROSPECT INFORMATION": {
    id: "prospect",
    title: "Prospect",
    description: "Verified person and company facts only.",
    defaultOpen: true,
  },
  "IDEAL CUSTOMER PROFILE": {
    id: "icp",
    title: "Ideal customer profile",
    description: "Who belongs on the list — and who does not.",
    defaultOpen: false,
  },
  SEGMENTATION: {
    id: "segmentation",
    title: "Segmentation",
    description: "Segment-specific problems, proof, and CTAs.",
    defaultOpen: false,
  },
  "CONTACT-DATA INFORMATION": {
    id: "contact_data",
    title: "Contact data",
    description: "Source, verification, and list quality.",
    defaultOpen: false,
  },
  "LEGAL, PRIVACY, AND POLICY INFORMATION": {
    id: "legal",
    title: "Legal & privacy",
    description: "Jurisdiction, basis, and review status — do not invent compliance.",
    defaultOpen: false,
  },
  "SUPPRESSION AND OPT-OUT": {
    id: "suppression",
    title: "Suppression & opt-out",
    description: "Lists, wording, and processing rules.",
    defaultOpen: false,
  },
  "OFFER INFORMATION": {
    id: "offer",
    title: "Offer",
    description: "What you actually provide — no fake audits or free consults.",
    defaultOpen: true,
  },
  "PRICING AND COMMERCIAL INFORMATION": {
    id: "pricing",
    title: "Pricing & commercial",
    description: "Only confirmed prices, trials, and deadlines.",
    defaultOpen: false,
  },
  "VALUE PROPOSITION": {
    id: "value",
    title: "Value proposition",
    description: "Clear outcome without hype or invented proof.",
    defaultOpen: false,
  },
  "PROBLEM INFORMATION": {
    id: "problem",
    title: "Problem",
    description: "The business problem you are allowed to reference.",
    defaultOpen: false,
  },
  "TRIGGER EVENTS": {
    id: "triggers",
    title: "Trigger events",
    description: "Real, verifiable triggers only.",
    defaultOpen: false,
  },
  "PERSONALIZATION INFORMATION": {
    id: "personalization",
    title: "Personalization",
    description: "Source every observation — never fabricate.",
    defaultOpen: false,
  },
  "REFERRALS AND MUTUAL CONNECTIONS": {
    id: "referrals",
    title: "Referrals & connections",
    description: "Only with permission and verified relationships.",
    defaultOpen: false,
  },
  "CUSTOMER EVIDENCE": {
    id: "evidence",
    title: "Customer evidence",
    description: "Approved case studies and metrics only.",
    defaultOpen: false,
  },
  "ROI AND SAVINGS CLAIMS": {
    id: "roi",
    title: "ROI & savings claims",
    description: "No invented ROI math.",
    defaultOpen: false,
  },
  "COMPETITOR INFORMATION": {
    id: "competitors",
    title: "Competitors",
    description: "Fair, factual comparison points only.",
    defaultOpen: false,
  },
  "OUTREACH ANGLE": {
    id: "angle",
    title: "Outreach angle",
    description: "Why this person, why now.",
    defaultOpen: false,
  },
  "CALL TO ACTION": {
    id: "cta",
    title: "Call to action",
    description: "Low-friction next step.",
    defaultOpen: false,
  },
  "CTA WORDING": {
    id: "cta_wording",
    title: "CTA wording",
    description: "Approved phrasing for asks.",
    defaultOpen: false,
  },
  "EMAIL SEQUENCE INFORMATION": {
    id: "sequence",
    title: "Sequence",
    description: "Steps, timing, and stop conditions.",
    defaultOpen: false,
  },
  "REPLY CLASSIFICATION": {
    id: "replies",
    title: "Reply handling",
    description: "How to classify and route replies.",
    defaultOpen: false,
  },
  "PERSONALIZATION VARIABLE FORMAT": {
    id: "var_format",
    title: "Variable format",
    description: "How merge fields should appear.",
    defaultOpen: false,
  },
  "FINAL FOLLOW-UP": {
    id: "final_followup",
    title: "Final follow-up",
    description: "Breakup email rules.",
    defaultOpen: false,
  },
  "OBJECTION HANDLING": {
    id: "objections",
    title: "Objection handling",
    description: "Approved responses to common objections.",
    defaultOpen: false,
  },
  ATTACHMENTS: {
    id: "attachments",
    title: "Attachments",
    description: "When files are allowed (prefer links).",
    defaultOpen: false,
  },
  TRACKING: {
    id: "tracking",
    title: "Tracking",
    description: "Pixels, open tracking, disclosure.",
    defaultOpen: false,
  },
  "DELIVERABILITY INFORMATION": {
    id: "deliverability",
    title: "Deliverability",
    description: "Auth, reputation, technical setup.",
    defaultOpen: false,
  },
  "VOLUME AND CADENCE": {
    id: "volume",
    title: "Volume & cadence",
    description: "Daily limits and send schedule.",
    defaultOpen: false,
  },
  "HUMAN REVIEW": {
    id: "human_review",
    title: "Human review",
    description: "What must be reviewed before send.",
    defaultOpen: false,
  },
  "MULTI-CHANNEL COORDINATION": {
    id: "multichannel",
    title: "Multi-channel",
    description: "LinkedIn/phone coordination rules.",
    defaultOpen: false,
  },
  "REGULATED AND HIGH-RISK INDUSTRIES": {
    id: "regulated",
    title: "Regulated industries",
    description: "Extra restrictions for high-risk verticals.",
    defaultOpen: false,
  },
  STYLE: {
    id: "style",
    title: "Style",
    description: "Writing constraints beyond tone.",
    defaultOpen: false,
  },
  "HTML EMAIL": {
    id: "html",
    title: "HTML email",
    description: "HTML vs plain-text preferences.",
    defaultOpen: false,
  },
  "A/B TESTING": {
    id: "ab_testing",
    title: "A/B testing",
    description: "What may be tested and how.",
    defaultOpen: false,
  },
  METRICS: {
    id: "metrics",
    title: "Metrics",
    description: "Success and guardrail metrics.",
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
  "primaryOffer",
  "desiredAction",
  "jobTitle",
  "companyName",
  "problemAddressed",
  "tone",
  "language",
  "senderName",
  "campaignType",
  "firstName",
  "industry",
  "specificObservation",
  "brandVoice",
  "senderRole",
  "offerDescription",
];

const REQUIRED = new Set([
  "primaryOffer",
  "desiredAction",
  "jobTitle",
  "companyName",
  "problemAddressed",
  "tone",
  "language",
]);

const CAMPAIGN_TYPES = [
  "B2B sales outreach",
  "SaaS prospecting",
  "agency outreach",
  "consulting outreach",
  "service introduction",
  "account-based outreach",
  "enterprise outreach",
  "founder-led sales",
  "partnership outreach",
  "integration partnership",
  "channel partnership",
  "affiliate partnership",
  "reseller outreach",
  "supplier outreach",
  "distributor outreach",
  "event invitation",
  "webinar invitation",
  "podcast guest invitation",
  "interview request",
  "expert contribution request",
  "research participation request",
  "customer-discovery outreach",
  "beta-user recruitment",
  "product-feedback request",
  "link-building outreach",
  "digital PR outreach",
  "journalist outreach",
  "guest-post pitch",
  "content collaboration",
  "sponsorship outreach",
  "speaker invitation",
  "recruitment outreach",
  "candidate sourcing",
  "investor introduction request",
  "nonprofit outreach",
  "community partnership",
  "reactivation of a previous business conversation",
  "referral request",
  "custom confirmed type",
];

const CAMPAIGN_STATUSES = [
  "research",
  "list building",
  "compliance review",
  "copy draft",
  "internal review",
  "technical setup",
  "test campaign",
  "active",
  "paused",
  "revised",
  "completed",
  "blocked",
  "archived",
];

const OFFER_TYPES = [
  "product",
  "SaaS subscription",
  "professional service",
  "consulting engagement",
  "audit",
  "assessment",
  "implementation",
  "managed service",
  "pilot",
  "proof of concept",
  "demonstration",
  "free trial",
  "paid trial",
  "workshop",
  "research interview",
  "partnership",
  "content collaboration",
  "event",
  "recruitment opportunity",
  "custom confirmed offer",
];

const YES_NO = ["yes", "no", "unknown / not applicable"];

const YES_NO_KEYS = new Set([
  "domainOwnership",
  "pricingDisclosure",
  "oneClickUnsubscribe",
  "replyOptOut",
  "existingCustomerExclusion",
  "competitorExclusion",
  "partnerExclusion",
  "postalAddressRequirement",
  "unsubscribeRequirement",
  "b2bStatus",
]);

const TEXTAREA_HINTS = [
  "Description",
  "Bio",
  "Experience",
  "Assessment",
  "Requirements",
  "Limitations",
  "Criteria",
  "List",
  "Process",
  "Wording",
  "Evidence",
  "Proof",
  "Objections",
  "Observation",
  "Signature",
  "Terms",
  "Policy",
  "Notes",
  "Details",
  "Profile",
  "Exclusion",
  "Suppression",
  "Handling",
  "Classification",
  "Definition",
  "Condition",
  "Problem",
  "UseCase",
  "Use case",
  "Benefits",
  "Features",
  "Differentiator",
  "Credentials",
];

function looksLikeTextarea(key, label) {
  if (key.length > 28) return true;
  for (const h of TEXTAREA_HINTS) {
    if (key.includes(h.replace(/\s/g, "")) || label.includes(h)) return true;
  }
  const longKeys = [
    "Description",
    "Assessment",
    "Requirements",
    "Limitations",
    "Criteria",
    "Process",
    "Wording",
    "Evidence",
    "Objections",
    "Observation",
    "Signature",
    "Terms",
    "Policy",
    "Definition",
    "Monitoring",
    "Refresh",
    "Deletion",
    "Retention",
    "Access",
    "Review",
    "Handling",
    "Classification",
    "Coordination",
    "Restrictions",
    "Authentication",
    "Suppression",
    "Unsubscribe",
    "Personalization",
    "Proof",
    "Savings",
    "Roi",
    "ROI",
    "Angle",
    "Sequence",
    "Cadence",
    "Volume",
    "Metrics",
    "Tracking",
    "Attachments",
    "Html",
    "HTML",
    "Testing",
    "Style",
    "Bio",
    "Profile",
  ];
  return longKeys.some((p) => key.includes(p) || key.endsWith(p));
}

/** Curated UX metadata for high-value fields. */
const CURATED = {
  campaignName: {
    placeholder: "Q3 SaaS founder outbound — content ops",
    hint: "Internal name for this campaign.",
  },
  campaignType: {
    type: "select",
    options: CAMPAIGN_TYPES,
    placeholder: "SaaS prospecting",
    hint: "Pick one confirmed type — do not reframe later for “better open rates.”",
    what: "The confirmed campaign type.",
    why: "Structure, compliance expectations, and CTA style depend on type.",
    example: "SaaS prospecting",
    avoid: "Calling spam “B2B sales outreach” or changing type without reason.",
  },
  campaignGoal: {
    placeholder: "Book discovery calls with qualified founders",
    hint: "Business goal of the campaign.",
  },
  primaryOffer: {
    placeholder: "Creatornivo Pro — structured AI content templates",
    hint: "What you are actually offering.",
    what: "Primary offer presented in outreach.",
    why: "The email must describe a real offer, not a bait-and-switch “audit.”",
    example: "30-minute product walkthrough of Creatornivo templates",
    avoid: "Calling a sales call a free strategy consultation when it is not.",
  },
  desiredAction: {
    placeholder: "Reply with a good time for a 15-minute call",
    hint: "Single primary next step for the recipient.",
    what: "Primary desired action.",
    why: "One clear, low-friction CTA improves reply quality.",
    example: "Reply with a good time this week for 15 minutes",
    avoid: "Multiple competing asks or high-friction CTAs on first touch.",
  },
  secondaryAction: {
    placeholder: "Or point me to the right person",
    hint: "Optional secondary ask.",
  },
  startDate: { placeholder: "2026-07-15" },
  endDate: { placeholder: "2026-08-15" },
  priority: {
    type: "select",
    options: ["low", "medium", "high", "critical"],
    placeholder: "medium",
  },
  campaignOwner: { placeholder: "SDR lead / founder name" },
  campaignStatus: {
    type: "select",
    options: CAMPAIGN_STATUSES,
    placeholder: "copy draft",
    hint: "Do not mark incomplete campaigns as ready to send.",
  },
  targetContactCount: { placeholder: "50 carefully researched accounts" },
  sequenceLength: { placeholder: "3 emails over 10 days" },
  preferredLength: {
    placeholder: "under 120 words (body)",
    hint: "Keep cold email concise unless enterprise context requires more.",
  },
  language: {
    placeholder: "English",
    hint: "Language of the email package.",
  },
  targetLocale: { placeholder: "en-US" },
  tone: {
    placeholder: "professional, concise, human",
    hint: "How the email should sound.",
    what: "Tone of voice for the sequence.",
    why: "Sets formality without sounding robotic or spammy.",
    example: "direct, respectful, no hype",
    avoid: "Fake urgency, flattery, or pressure language.",
  },
  brandVoice: {
    placeholder: "honest Early Access product — clear limits, no fake proof",
  },
  senderName: {
    placeholder: "Your real name",
    hint: "Must match the real sender — no impersonation.",
  },
  senderRole: { placeholder: "Founder / AE / Partnerships" },
  senderOrganization: { placeholder: "Creatornivo" },
  brandName: { placeholder: "Creatornivo" },
  legalBusinessName: { placeholder: "Legal entity if different" },
  senderRelationship: {
    type: "textarea",
    placeholder: "Founder of the product being offered",
  },
  senderEmail: { placeholder: "you@yourdomain.com" },
  senderDomain: { placeholder: "yourdomain.com" },
  replyToAddress: { placeholder: "Same as sender unless different" },
  senderLocation: { placeholder: "City, country (if required)" },
  businessWebsite: { placeholder: "https://www.creatornivo.com" },
  offerUrl: { placeholder: "https://www.creatornivo.com/pricing" },
  bookingUrl: { placeholder: "Calendar link only if real and available" },
  calendarOwner: { placeholder: "Who owns the calendar" },
  senderProfileUrl: { placeholder: "LinkedIn or about page" },
  senderBio: {
    type: "textarea",
    placeholder: "Short true bio — no invented credentials",
  },
  senderCredentials: {
    type: "textarea",
    placeholder: "Only verifiable credentials",
  },
  personalExperience: {
    type: "textarea",
    placeholder: "Approved first-hand experience only — or leave blank",
  },
  emailSignature: {
    type: "textarea",
    placeholder: "Name, role, company, website, required legal lines",
  },
  sendingBrand: { placeholder: "Public brand shown in From name" },
  domainPurpose: { placeholder: "Primary brand domain / dedicated outreach" },
  primaryDomain: { placeholder: "creatornivo.com" },
  outreachDomain: { placeholder: "Only if real and clearly owned" },
  domainOwnership: {
    type: "select",
    options: YES_NO,
    placeholder: "yes",
  },
  mailboxProvider: { placeholder: "Google Workspace / Microsoft 365" },
  emailServiceProvider: { placeholder: "ESP name if any" },
  sendingPlatform: { placeholder: "Sales-engagement tool if any" },
  crm: { placeholder: "CRM name" },
  salesPlatform: { placeholder: "Outreach / Salesloft / etc." },
  trackingSystem: { placeholder: "What tracks opens/clicks if used" },
  unsubscribeSystem: { placeholder: "How opt-outs are processed" },
  suppressionSystem: { placeholder: "Where suppression is stored" },
  inboxMonitoring: {
    type: "textarea",
    placeholder: "Who monitors replies and how often",
  },
  replyOwner: { placeholder: "Human who answers replies" },
  firstName: { placeholder: "Verified first name only" },
  lastName: { placeholder: "Verified last name only" },
  fullName: { placeholder: "Full name if used" },
  jobTitle: {
    placeholder: "Head of Marketing",
    hint: "Current verified title.",
    what: "Prospect’s current job title.",
    why: "Personalization and relevance depend on real role.",
    example: "Head of Content",
    avoid: "Guessing titles from old data or LinkedIn freeze.",
  },
  department: { placeholder: "Marketing / Sales / Product" },
  seniority: {
    type: "select",
    options: [
      "individual contributor",
      "manager",
      "director",
      "VP",
      "C-level",
      "founder",
      "unknown",
    ],
    placeholder: "founder",
  },
  companyName: {
    placeholder: "Acme Growth Co.",
    hint: "Verified current employer.",
  },
  companyWebsite: { placeholder: "https://…" },
  industry: { placeholder: "B2B SaaS" },
  subindustry: { placeholder: "Marketing automation" },
  companySize: { placeholder: "11–50 employees" },
  prospectLocation: { placeholder: "US — public business location only" },
  prospectMarket: { placeholder: "English-speaking SMB SaaS" },
  prospectTimeZone: { placeholder: "America/New_York" },
  prospectLanguage: { placeholder: "English" },
  prospectProfile: {
    type: "textarea",
    placeholder: "Public LinkedIn URL if used for research",
  },
  companyProfile: {
    type: "textarea",
    placeholder: "Company page or about URL",
  },
  relationshipStatus: {
    type: "select",
    options: [
      "no prior contact",
      "previous email no reply",
      "previous conversation",
      "customer",
      "partner",
      "competitor",
      "referred",
    ],
    placeholder: "no prior contact",
  },
  previousContact: {
    type: "textarea",
    placeholder: "What was said before — only if true",
  },
  previousReply: {
    type: "textarea",
    placeholder: "Last reply summary if any",
  },
  referralSource: {
    placeholder: "Who referred — only with permission",
  },
  mutualConnection: {
    placeholder: "Named mutual connection — only if real and allowed",
  },
  customerStatus: {
    type: "select",
    options: ["not a customer", "trial", "active customer", "churned", "unknown"],
    placeholder: "not a customer",
  },
  leadStatus: { placeholder: "new / MQL / SQL / opportunity" },
  accountOwner: { placeholder: "Internal owner if any" },
  idealCustomerProfile: {
    type: "textarea",
    placeholder: "Who is a fit in one short paragraph",
  },
  targetIndustries: { placeholder: "B2B SaaS, agencies" },
  targetCompanySizes: { placeholder: "1–50, 51–200" },
  targetLocations: { placeholder: "US, UK, EU (English)" },
  targetRoles: { placeholder: "Founder, Head of Marketing, Content lead" },
  targetDepartments: { placeholder: "Marketing, Growth" },
  targetSeniority: { placeholder: "Founder, director+" },
  requiredTechnology: { placeholder: "Tools they must use if relevant" },
  requiredBusinessModel: { placeholder: "Subscription SaaS, marketplace…" },
  requiredCondition: {
    type: "textarea",
    placeholder: "Operational condition for fit",
  },
  requiredTrigger: {
    type: "textarea",
    placeholder: "Hiring, funding, product launch — only if used",
  },
  minimumCriteria: {
    type: "textarea",
    placeholder: "Must-have qualification rules",
  },
  disqualifyingCriteria: {
    type: "textarea",
    placeholder: "Who must never be contacted",
  },
  excludedIndustries: { type: "textarea", placeholder: "Industries to skip" },
  excludedRegions: { type: "textarea", placeholder: "Regions to skip" },
  excludedCompanyTypes: {
    type: "textarea",
    placeholder: "e.g. agencies if you only sell end customers",
  },
  excludedRoles: { type: "textarea", placeholder: "Roles never to target" },
  existingCustomerExclusion: {
    type: "select",
    options: YES_NO,
    placeholder: "yes",
  },
  competitorExclusion: { type: "select", options: YES_NO, placeholder: "yes" },
  partnerExclusion: { type: "select", options: YES_NO, placeholder: "yes" },
  suppressedAccounts: {
    type: "textarea",
    placeholder: "Accounts already on suppression",
  },
  primarySegment: { placeholder: "Solo SaaS founders" },
  secondarySegments: { placeholder: "Freelance content marketers" },
  segmentDefinition: {
    type: "textarea",
    placeholder: "How this segment is defined",
  },
  segmentProblem: {
    type: "textarea",
    placeholder: "Problem unique to this segment",
  },
  segmentUseCase: {
    type: "textarea",
    placeholder: "Use case unique to this segment",
  },
  segmentProof: {
    type: "textarea",
    placeholder: "Approved proof for this segment only",
  },
  segmentCta: { placeholder: "Segment-specific CTA if different" },
  segmentObjections: {
    type: "textarea",
    placeholder: "Objections this segment raises",
  },
  segmentExclusions: {
    type: "textarea",
    placeholder: "Who in-segment still must not be emailed",
  },
  dataSource: {
    type: "textarea",
    placeholder: "How you obtained this contact — be honest",
    hint: "No leaked/stolen lists.",
  },
  dataProvider: { placeholder: "Provider name if purchased/enriched" },
  dataSourceUrl: { placeholder: "Source URL if public" },
  collectionMethod: {
    type: "select",
    options: [
      "manual research",
      "public website",
      "event opt-in",
      "inbound form",
      "CRM export",
      "enrichment provider",
      "referral introduction",
      "other (describe in notes)",
    ],
    placeholder: "manual research",
  },
  collectionDate: { placeholder: "YYYY-MM-DD" },
  verificationMethod: {
    placeholder: "SMTP / provider / catch-all review / manual",
  },
  verificationDate: { placeholder: "YYYY-MM-DD" },
  businessEmailStatus: {
    type: "select",
    options: ["verified business", "unverified", "role-based", "unknown"],
    placeholder: "unverified",
  },
  personalEmailStatus: {
    type: "select",
    options: ["not used", "personal known", "unknown"],
    placeholder: "not used",
  },
  roleBasedEmailStatus: {
    type: "select",
    options: ["not role-based", "role-based (info@…)", "unknown"],
    placeholder: "not role-based",
  },
  catchAllStatus: {
    type: "select",
    options: ["not catch-all", "catch-all", "unknown"],
    placeholder: "unknown",
  },
  dataConfidence: {
    type: "select",
    options: ["high", "medium", "low"],
    placeholder: "medium",
  },
  dataTerms: {
    type: "textarea",
    placeholder: "License / usage terms for the list",
  },
  listOwner: { placeholder: "Who owns the list" },
  listAge: { placeholder: "e.g. researched this week" },
  dataRefresh: {
    type: "textarea",
    placeholder: "How often roles/emails are re-checked",
  },
  deletionProcess: {
    type: "textarea",
    placeholder: "How deletion requests are handled",
  },
  doNotContactStatus: {
    type: "select",
    options: ["clear to contact", "do not contact", "unknown"],
    placeholder: "clear to contact",
  },
  jurisdiction: { placeholder: "Primary target jurisdiction" },
  senderJurisdiction: { placeholder: "Where the sender operates" },
  recipientJurisdiction: { placeholder: "Where the recipient operates" },
  applicableRules: {
    type: "textarea",
    placeholder: "Known applicable rules — or leave for legal review",
  },
  legalBasis: {
    type: "textarea",
    placeholder: "Do not invent — leave blank if unclear",
    hint: "If unclear, campaign needs legal review before send.",
  },
  b2bStatus: { type: "select", options: YES_NO, placeholder: "unknown / not applicable" },
  consentStatus: {
    type: "select",
    options: [
      "no prior consent",
      "opted in",
      "soft opt-in claimed",
      "unknown",
    ],
    placeholder: "no prior consent",
  },
  legitimateInterestAssessment: {
    type: "textarea",
    placeholder: "Only if completed and documented",
  },
  noticeRequirements: {
    type: "textarea",
    placeholder: "Required notices if known",
  },
  senderRequirements: {
    type: "textarea",
    placeholder: "Required sender identification",
  },
  postalAddressRequirement: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },
  unsubscribeRequirement: {
    type: "select",
    options: YES_NO,
    placeholder: "yes",
  },
  unsubscribeMethod: {
    placeholder: "Reply STOP / one-click / link",
  },
  suppressionRetention: {
    type: "textarea",
    placeholder: "How long opt-outs are kept",
  },
  dataAccessProcess: {
    type: "textarea",
    placeholder: "How access requests are handled",
  },
  dataDeletionProcess: {
    type: "textarea",
    placeholder: "How deletion requests are handled",
  },
  privacyPolicyUrl: { placeholder: "https://www.creatornivo.com/privacy" },
  legalReviewStatus: {
    type: "select",
    options: [
      "not reviewed",
      "in review",
      "approved",
      "blocked",
      "not applicable",
    ],
    placeholder: "not reviewed",
  },
  privacyReviewStatus: {
    type: "select",
    options: [
      "not reviewed",
      "in review",
      "approved",
      "blocked",
      "not applicable",
    ],
    placeholder: "not reviewed",
  },
  providerPolicyReview: {
    type: "textarea",
    placeholder: "ESP/mailbox policy notes",
  },
  globalSuppressionList: {
    type: "textarea",
    placeholder: "Source of global suppression",
  },
  campaignSuppressionList: {
    type: "textarea",
    placeholder: "Campaign-specific suppressions",
  },
  previousOptOuts: {
    type: "textarea",
    placeholder: "Known prior opt-outs",
  },
  hardBounceSuppression: {
    type: "textarea",
    placeholder: "How hard bounces are suppressed",
  },
  complaintSuppression: {
    type: "textarea",
    placeholder: "How complaints are suppressed",
  },
  customerSuppression: {
    type: "textarea",
    placeholder: "Whether customers are excluded",
  },
  competitorSuppression: {
    type: "textarea",
    placeholder: "Competitor domains to skip",
  },
  employeeSuppression: {
    type: "textarea",
    placeholder: "Internal domains to skip",
  },
  partnerSuppression: {
    type: "textarea",
    placeholder: "Partner accounts to skip",
  },
  unsubscribeWording: {
    type: "textarea",
    placeholder: "If you prefer not to receive emails like this, reply “unsubscribe”",
  },
  oneClickUnsubscribe: {
    type: "select",
    options: YES_NO,
    placeholder: "unknown / not applicable",
  },
  replyOptOut: { type: "select", options: YES_NO, placeholder: "yes" },
  unsubscribeUrl: { placeholder: "URL if used" },
  suppressionUpdateTime: {
    placeholder: "How fast opt-outs are applied",
  },
  suppressionOwner: { placeholder: "Who owns suppression updates" },
  offerName: { placeholder: "Creatornivo Pro" },
  offerType: {
    type: "select",
    options: OFFER_TYPES,
    placeholder: "SaaS subscription",
  },
  offerDescription: {
    type: "textarea",
    placeholder: "What the offer includes in plain language",
  },
  targetCustomer: {
    placeholder: "Solo founders and small marketing teams",
  },
  primaryUseCase: {
    placeholder: "Generate structured content with reusable templates",
  },
  problemAddressed: {
    placeholder: "Inconsistent publishing and blank-page friction",
    hint: "Business problem you are allowed to reference.",
    what: "The problem the outreach addresses.",
    why: "Connects offer to prospect reality without inventing their pain.",
    example: "Publishing cadence drops when the founder is the only writer",
    avoid: "Claiming you know their private metrics or secrets.",
  },
  features: {
    type: "textarea",
    placeholder: "Confirmed product features only",
  },
  benefits: {
    type: "textarea",
    placeholder: "Confirmed benefits only",
  },
  differentiator: {
    type: "textarea",
    placeholder: "Real differentiator you can defend",
  },
  availability: { placeholder: "Generally available / Early Access / waitlist" },
  supportedMarkets: { placeholder: "English-speaking markets" },
  supportedPlatforms: { placeholder: "Web app" },
  implementationRequirements: {
    type: "textarea",
    placeholder: "What the customer must provide",
  },
  limitations: {
    type: "textarea",
    placeholder: "Honest limits (quotas, Beta, languages…)",
  },
  includedItems: {
    type: "textarea",
    placeholder: "What is included",
  },
  excludedItems: {
    type: "textarea",
    placeholder: "What is not included",
  },
  minimumCommitment: { placeholder: "Monthly / annual / none" },
  offerEligibility: {
    type: "textarea",
    placeholder: "Who is eligible",
  },
  pricingDisclosure: {
    type: "select",
    options: YES_NO,
    placeholder: "no",
  },
  price: { placeholder: "Only if confirmed and current" },
  currency: { placeholder: "USD" },
  billingModel: { placeholder: "monthly subscription" },
  setupFee: { placeholder: "none / amount" },
  recurringFee: { placeholder: "amount if disclosed" },
  trialDetails: {
    type: "textarea",
    placeholder: "Only real trial terms",
  },
  pilotDetails: {
    type: "textarea",
    placeholder: "Only real pilot terms",
  },
  discount: { placeholder: "Only if real and enforced" },
  discountConditions: {
    type: "textarea",
    placeholder: "Conditions for any discount",
  },
  offerDeadline: {
    placeholder: "Only real deadlines — or leave blank",
  },
  offerTimeZone: { placeholder: "UTC" },
  capacityLimit: {
    placeholder: "Only if operationally true",
  },
  contractTerm: { placeholder: "month-to-month / annual" },
  cancellationTerms: {
    type: "textarea",
    placeholder: "How cancellation works",
  },
  refundTerms: {
    type: "textarea",
    placeholder: "Refund policy if mentioned",
  },
  taxDetails: {
    type: "textarea",
    placeholder: "Taxes/fees if disclosed",
  },
  specificObservation: {
    type: "textarea",
    placeholder: "One verifiable observation — or leave blank",
    hint: "Never invent personalization.",
    what: "A real observation about the prospect or company.",
    why: "Relevant personalization improves reply rates; fake personalization destroys trust.",
    example: "Saw your hiring post for a content marketer last week",
    avoid: "Pretending you read a page you did not, or inventing events.",
  },
};

function defaultHelp(key, label, section) {
  return {
    what: `${label} — a parameter from the Cold Email Outreach brief (${section}).`,
    why: `When provided, the model uses this instead of inventing prospect facts, compliance claims, or proof. Empty fields remain unset ([${key}]).`,
    example: `A short, factual value for ${label.toLowerCase()} that you can verify before sending.`,
    avoid: `Invented prospect data, fake personalization, stolen lists, or compliance claims you have not confirmed for ${label.toLowerCase()}.`,
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
    example:
      curated.example ||
      curated.placeholder ||
      helpBase.example,
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
    const field = buildField(key, sectionMap[key] || "CAMPAIGN INFORMATION");
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
    slug: "cold-email-outreach",
    title: "Cold Email Outreach",
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
