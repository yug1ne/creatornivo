/**
 * Builds the App Store Listing form schema from the approved 34-field specification.
 * Does NOT modify the prompt text. It verifies that every prompt variable has
 * exactly one form field before writing the form JSON.
 *
 * Usage: node scripts/build-app-store-listing-form.mjs
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
  "app-store-listing.txt",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "app-store-listing-variables.json",
);

const groups = [
  {
    id: "essentials",
    title: "Essentials",
    description:
      "Minimum information required to understand the app, its audience, its value, and the intended store destination.",
    defaultOpen: true,
  },
  {
    id: "audience_positioning",
    title: "Audience & Positioning",
    description:
      "Market position, audience problem, differentiation, voice, and geographic relevance.",
    defaultOpen: false,
  },
  {
    id: "product_trust_details",
    title: "Product & Trust Details",
    description:
      "Functionality, pricing, requirements, supported devices, evidence, privacy information, and visual assets.",
    defaultOpen: false,
  },
  {
    id: "discovery_visuals_release",
    title: "Discovery, Visuals & Release",
    description:
      "Keyword direction, promotional messaging, listing rewrites, screenshot concepts, and version-update content.",
    defaultOpen: false,
  },
  {
    id: "compliance_output",
    title: "Compliance & Output",
    description:
      "Sensitive categories, age considerations, wording restrictions, requested output modules, and final requirements.",
    defaultOpen: false,
  },
];

const defaultValues = {
  platformTarget: "Apple App Store",
  appCategory: "Auto",
  primaryGoal: "Drive qualified installs",
  monetizationModel: "Auto",
  listingStage: "New launch",
  outputLanguage: "English",
  brandVoice: "Clear and trustworthy",
  supportedDevices: "Auto",
  sensitiveCategory: "None",
  ageAudience: "General audience",
  outputModules:
    "Core listing copy, Keyword suggestions, Screenshot messages, Review report",
};

const options = {
  platformTarget: ["Apple App Store", "Google Play", "Both"],
  appCategory: [
    "Auto",
    "Business",
    "Education",
    "Entertainment",
    "Finance",
    "Health & Fitness",
    "Productivity",
    "Social",
    "Games",
    "Other",
  ],
  primaryGoal: [
    "Drive qualified installs",
    "Improve search discovery",
    "Improve listing conversion",
    "Launch a new app",
    "Refresh positioning",
    "Explain a major update",
  ],
  monetizationModel: [
    "Auto",
    "Free",
    "Paid upfront",
    "Freemium",
    "Subscription",
    "In-app purchases",
    "Ad-supported",
    "Mixed",
  ],
  listingStage: ["New launch", "Existing listing refresh", "Version update"],
  brandVoice: [
    "Clear and trustworthy",
    "Friendly and approachable",
    "Professional and concise",
    "Energetic and playful",
    "Calm and reassuring",
    "Premium and polished",
    "Technical and precise",
    "Minimal and direct",
  ],
  supportedDevices: [
    "Auto",
    "iPhone",
    "iPad",
    "Mac",
    "Apple Watch",
    "Apple TV",
    "Apple Vision",
    "Android phone",
    "Android tablet",
    "Wear OS",
  ],
  sensitiveCategory: [
    "None",
    "Health or medical",
    "Finance or crypto",
    "Legal",
    "Children or family",
    "Dating or social",
    "Gambling or real money",
    "Safety or emergency",
    "Political or civic",
    "Other regulated area",
  ],
  ageAudience: [
    "General audience",
    "Children",
    "Teens",
    "Adults",
    "Mixed ages",
    "Auto",
  ],
  outputModules: [
    "Core listing copy",
    "Keyword suggestions",
    "Screenshot messages",
    "Promotional text",
    "Release notes",
    "Review report",
  ],
};

const showWhen = {
  visualAssetsContext: { key: "outputModules", contains: "Screenshot messages" },
  promotionalFocus: { key: "outputModules", contains: "Promotional text" },
  existingListing: {
    key: "listingStage",
    equals: ["Existing listing refresh", "Version update"],
  },
  versionNumber: { key: "listingStage", equals: "Version update" },
  releaseChanges: { key: "listingStage", equals: "Version update" },
};

const examples = {
  platformTarget: "Apple App Store",
  appName: "Creatornivo",
  appCategory: "Productivity",
  appSummary:
    "A structured AI content workspace that turns briefs into platform-ready drafts.",
  targetAudience: "Solo founders and creators who publish content every week.",
  coreFeatures:
    "Template library, saved prompts, personal content library, Markdown export.",
  keyBenefits:
    "Create consistent first drafts without rebuilding every prompt from scratch.",
  primaryGoal: "Drive qualified installs",
  monetizationModel: "Freemium",
  listingStage: "New launch",
  outputLanguage: "English",
  userProblem:
    "Creators waste time rewriting prompts and lose consistency across channels.",
  differentiators:
    "Template-first workflow, transparent generation limits, and no fake social proof.",
  competitorContext:
    "Alternative to manually rebuilding prompts in a general AI chat tool.",
  brandVoice: "Clear and trustworthy",
  targetRegions: "United States, United Kingdom, Canada",
  featureDetails:
    "Includes template-specific forms, prompt saving, generated content saving, and export.",
  pricingDetails: "Free plan with daily limits; Pro monthly plan for higher usage.",
  supportedDevices: "iPhone, iPad, Android phone",
  usageRequirements: "Requires an account and internet connection.",
  proofCredentials: "Use only approved facts; no awards or rankings yet.",
  dataPrivacyNotes: "User content is saved in a personal library when the user chooses.",
  visualAssetsContext:
    "Template picker, generation form, saved content library, export screen.",
  keywordThemes: "AI writing, content templates, creator workflow",
  keywordsToAvoid: "best, guaranteed, viral, #1",
  promotionalFocus: "Early Access launch positioning without fake scarcity.",
  existingListing: "Paste the current subtitle, description, keywords, and promo text.",
  versionNumber: "1.2.0",
  releaseChanges: "Added saved prompts and improved export labels.",
  sensitiveCategory: "None",
  ageAudience: "General audience",
  claimsRestrictions: "Do not claim guaranteed reach, rankings, revenue, or time savings.",
  outputModules:
    "Core listing copy, Keyword suggestions, Screenshot messages, Review report",
  additionalRequirements: "Use creatornivo.com as the canonical domain if a URL is needed.",
};

const fieldRows = `
platformTarget|Store destination|essentials|select|yes|40|Select the store destination|Choose whether the listing is for Apple, Google Play, or both.|Store rules, metadata limits, and output sections differ by destination.
appName|App name|essentials|text|yes|80|Creatornivo|Enter the public app name exactly as it should appear.|The app name anchors metadata, title options, and review checks.
appCategory|App category|essentials|select|no|40|Select app category|Choose the closest store category or leave Auto.|Category helps shape keywords, positioning, and compliance expectations.
appSummary|What does the app do?|essentials|textarea|yes|800|A structured AI content workspace that turns briefs into platform-ready drafts.|Explain the app in plain factual language.|The listing cannot be accurate without a clear description of the current app.
targetAudience|Target users|essentials|textarea|yes|600|Solo founders and creators who publish content every week.|Describe the users this app is built for.|Audience context controls benefits, screenshots, keywords, and tone.
coreFeatures|Core features|essentials|textarea|yes|1200|Template library, saved prompts, personal content library, Markdown export.|List the real features users can access now.|The prompt must not invent app functionality or imply unavailable features.
keyBenefits|Key user benefits|essentials|textarea|yes|1000|Create consistent first drafts without rebuilding every prompt from scratch.|Explain the practical value users receive from those features.|Benefits connect features to user outcomes while staying truthful.
primaryGoal|Listing goal|essentials|select|no|40|Select listing goal|Choose the main goal for this listing package.|The goal affects emphasis across metadata, screenshots, and review notes.
monetizationModel|Monetization model|essentials|select|no|40|Select monetization model|Choose how the app is currently monetized.|Pricing language and disclosure depend on the monetization model.
listingStage|Listing stage|essentials|select|no|40|Select listing stage|Choose whether this is a new listing, refresh, or version update.|The stage determines whether existing copy or release-note fields matter.
outputLanguage|Output language|essentials|text|yes|80|English|Enter the language or regional variant for the listing.|The copy should match the language intended for the store listing.
userProblem|User problem or need|audience_positioning|textarea|no|800|Creators waste time rewriting prompts and lose consistency across channels.|Describe the problem that makes the app useful.|Problem context improves relevance without relying on generic benefits.
differentiators|What makes it different?|audience_positioning|textarea|no|1000|Template-first workflow, transparent generation limits, and no fake social proof.|Explain factual differences from alternatives.|Differentiation helps positioning while avoiding unsupported superiority claims.
competitorContext|Alternative solutions|audience_positioning|textarea|no|800|Alternative to manually rebuilding prompts in a general AI chat tool.|Describe relevant alternatives or comparison context.|It helps keep comparisons fair and specific.
brandVoice|Brand voice|audience_positioning|select|no|40|Select brand voice|Choose the tone that matches the app and audience.|Voice affects listing copy, screenshot captions, and review notes.
targetRegions|Target countries or regions|audience_positioning|text|no|300|United States, United Kingdom, Canada|Add markets where language, terminology, or compliance context matters.|Regional context can change spelling, examples, claims, and metadata choices.
featureDetails|Feature details|product_trust_details|textarea|no|1500|Includes template-specific forms, prompt saving, generated content saving, and export.|Add deeper product details that should appear in the listing.|Detailed facts make the output more concrete without adding unsupported claims.
pricingDetails|Pricing and purchases|product_trust_details|textarea|no|800|Free plan with daily limits; Pro monthly plan for higher usage.|Describe pricing, subscriptions, purchases, or free access.|Commercial details must be accurate and not implied from the monetization model alone.
supportedDevices|Supported devices|product_trust_details|multi-select|no|300|Select supported devices|List the devices or platforms the app supports.|Device support affects Apple and Google Play copy and review checks.
usageRequirements|Usage requirements|product_trust_details|textarea|no|800|Requires an account and internet connection.|List login, subscription, hardware, OS, or connectivity requirements.|Users and reviewers need to know material requirements before installing.
proofCredentials|Approved proof or credentials|product_trust_details|textarea|no|1200|Use only approved facts; no awards or rankings yet.|Add approved awards, certifications, ratings, credentials, or proof.|Proof can support trust only when it is real and approved.
dataPrivacyNotes|Privacy and data use|product_trust_details|textarea|no|1200|User content is saved in a personal library when the user chooses.|Describe relevant data collection, account, privacy, or security notes.|Privacy-related copy must stay accurate and avoid unsupported assurances.
visualAssetsContext|Screens available to feature|product_trust_details|textarea|no|1500|Template picker, generation form, saved content library, export screen.|Describe screenshots or screens available for screenshot messages.|Screenshot messages should describe real screens rather than imagined UI.
keywordThemes|Preferred search themes|discovery_visuals_release|textarea|no|800|AI writing, content templates, creator workflow.|List search themes or phrases to consider.|Keyword direction helps ASO without encouraging stuffing.
keywordsToAvoid|Terms to avoid|discovery_visuals_release|text|no|400|best, guaranteed, viral, #1|List terms, competitor names, or claims to avoid.|Avoid terms protect against misleading claims and keyword-policy risks.
promotionalFocus|Promotional focus|discovery_visuals_release|textarea|no|600|Early Access launch positioning without fake scarcity.|Describe the promotion angle for promotional text.|Promotional copy should be based on a real focus, not invented urgency.
existingListing|Existing listing copy|discovery_visuals_release|textarea|no|4000|Paste the current subtitle, description, keywords, and promo text.|Paste current listing copy when refreshing an existing listing.|Refreshes and updates should improve real existing copy rather than start from assumptions.
versionNumber|Version number|discovery_visuals_release|text|no|80|1.2.0|Enter the version number for update copy.|Release notes should identify the relevant app version when supplied.
releaseChanges|Changes in this version|discovery_visuals_release|textarea|no|2000|Added saved prompts and improved export labels.|List confirmed changes, fixes, or improvements in this version.|Release notes must describe real changes only.
sensitiveCategory|Sensitive content category|compliance_output|select|no|40|Select if relevant|Choose a sensitive or regulated category when applicable.|Sensitive categories require extra claim caution and review notes.
ageAudience|Intended age audience|compliance_output|select|no|40|Select intended age audience|Choose the intended audience age group.|Age context affects wording, claims, privacy, and store-review considerations.
claimsRestrictions|Claims and wording restrictions|compliance_output|textarea|no|1200|Do not claim guaranteed reach, rankings, revenue, or time savings.|List claims, phrases, or topics that must not appear.|Restrictions prevent unsafe, unsupported, or non-compliant listing language.
outputModules|Include in the output|compliance_output|multi-select|no|250|Select output modules|List the sections the generated package should include.|Requested modules control output size and whether screenshots, promo text, release notes, or review reports are included.
additionalRequirements|Additional requirements|compliance_output|textarea|no|2000|Use creatornivo.com as the canonical domain if a URL is needed.|Add final constraints or context that does not fit elsewhere.|This captures uncommon requirements without adding extra prompt variables.
`;

function parsePromptVariables(prompt) {
  return [
    ...new Set(
      [...prompt.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)].map(
        (match) => match[1],
      ),
    ),
  ];
}

function adaptType(sourceType) {
  if (sourceType === "multi-select") return { type: "textarea" };
  return { type: sourceType };
}

function helpAvoidFor(field) {
  if (field.key === "proofCredentials") {
    return "Avoid invented awards, ratings, rankings, certifications, user counts, or review claims.";
  }
  if (field.key === "pricingDetails") {
    return "Avoid approximate prices, hidden conditions, or purchase claims that are not confirmed.";
  }
  if (field.key === "dataPrivacyNotes") {
    return "Avoid broad privacy promises, security guarantees, or compliance claims that have not been reviewed.";
  }
  if (field.key === "keywordsToAvoid" || field.key === "claimsRestrictions") {
    return "Avoid leaving out terms that could create misleading, risky, or unsupported app-store copy.";
  }
  if (field.required) {
    return "Avoid vague placeholders, future features, invented claims, or benefits the current app does not support.";
  }
  return "Avoid guessed details, unsupported superlatives, keyword stuffing, or claims that are not supported by the supplied facts.";
}

function buildField(row) {
  const [
    key,
    label,
    group,
    sourceType,
    requiredRaw,
    maxLengthRaw,
    placeholder,
    baseHint,
    why,
  ] = row.split("|");

  const required = requiredRaw === "yes";
  const adapted = adaptType(sourceType);
  const field = {
    key,
    label,
    group,
    groupTitle: groups.find((g) => g.id === group)?.title,
    type: adapted.type,
    required,
    placeholder,
    hint: baseHint,
    help: {
      what: required
        ? `Provide the ${label.toLowerCase()} for this app store listing.`
        : `Optional context for the ${label.toLowerCase()} field.`,
      why,
      example: `Good example: ${examples[key] ?? placeholder}`,
      avoid: helpAvoidFor({ key, required }),
    },
  };

  if (defaultValues[key]) field.defaultValue = defaultValues[key];
  if (maxLengthRaw) field.maxLength = Number(maxLengthRaw);
  if (options[key]) field.options = options[key];
  if (showWhen[key]) field.showWhen = showWhen[key];
  if (sourceType === "textarea" || field.maxLength > 500) {
    field.fullWidth = true;
  }

  if (sourceType === "multi-select") {
    field.hint = `${baseHint} Current form controls do not support checkboxes for this template yet, so list the relevant options separated by commas.`;
    field.help.what =
      "List one or more relevant options separated by commas. This preserves the prompt variable while using the current textarea control.";
    field.fullWidth = true;
  }

  return field;
}

const variables = fieldRows
  .trim()
  .split("\n")
  .map((line) => buildField(line.trim()));

const prompt = fs.readFileSync(promptPath, "utf8");
const promptVariables = parsePromptVariables(prompt);
const formKeys = variables.map((variable) => variable.key);
const missingFromForm = promptVariables.filter((key) => !formKeys.includes(key));
const extraInForm = formKeys.filter((key) => !promptVariables.includes(key));

if (missingFromForm.length || extraInForm.length) {
  throw new Error(
    [
      missingFromForm.length
        ? `Missing form fields: ${missingFromForm.join(", ")}`
        : "",
      extraInForm.length ? `Extra form fields: ${extraInForm.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

const schema = {
  slug: "app-store-listing",
  title: "App Store Listing",
  fieldCount: variables.length,
  requiredKeys: variables
    .filter((variable) => variable.required)
    .map((variable) => variable.key),
  groups,
  variables,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(schema, null, 2)}\n`);

console.log(
  `Wrote ${path.relative(root, outPath)} with ${variables.length} fields.`,
);
