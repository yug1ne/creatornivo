/**
 * Builds the Website Popup form schema from the approved 24-field
 * specification. It verifies that every prompt variable has exactly one form
 * field before writing the form JSON.
 *
 * Usage: node scripts/build-website-popup-form.mjs
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
  "website-popup.txt",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "website-popup-variables.json",
);

const groups = [
  {
    id: "essentials",
    title: "Essentials",
    description:
      "Popup goal, subject, audience, facts, desired action, page context, destination, trigger, tone, and output language.",
    defaultOpen: true,
  },
  {
    id: "offer_conversion",
    title: "Offer & Conversion",
    description:
      "Incentive, real deadline or availability, and neutral secondary-action controls.",
    defaultOpen: false,
  },
  {
    id: "brand_experience",
    title: "Brand & Experience",
    description:
      "Brand identification, voice guidance, popup format, and copy-length preference.",
    defaultOpen: false,
  },
  {
    id: "privacy_output",
    title: "Privacy & Output",
    description:
      "Collected data, privacy link, restrictions, variant count, and remaining context.",
    defaultOpen: false,
  },
];

const defaultValues = {
  popupGoal: "Grow email list",
  triggerType: "Auto",
  tone: "Clear and natural",
  outputLanguage: "English",
  incentiveType: "None",
  secondaryAction: "Auto",
  popupFormat: "Auto",
  lengthPreference: "Balanced",
  variantCount: "3",
};

const options = {
  popupGoal: [
    "Grow email list",
    "Promote an offer",
    "Deliver a free resource",
    "Announce news or event",
    "Drive to a page or product",
    "Recover an exiting visitor",
    "Collect feedback",
    "Other",
  ],
  triggerType: [
    "Auto",
    "Immediately on page load",
    "After a timed delay",
    "After scroll progress",
    "Exit intent",
    "After a visitor action",
    "Specific page or event",
  ],
  tone: [
    "Clear and natural",
    "Friendly",
    "Professional",
    "Warm",
    "Playful",
    "Premium",
    "Minimal",
    "Urgent but honest",
  ],
  incentiveType: [
    "None",
    "Discount",
    "Free shipping",
    "Free resource",
    "Bonus or gift",
    "Early access",
    "Other",
  ],
  secondaryAction: ["Auto", "Not now", "Continue browsing", "None", "Custom"],
  popupFormat: [
    "Auto",
    "Center modal",
    "Slide-in",
    "Top or bottom banner",
    "Full-screen overlay",
    "Inline or embedded form",
  ],
  lengthPreference: ["Auto", "Very short", "Balanced", "More explanatory"],
  variantCount: ["1", "2", "3", "4"],
};

const showWhen = {
  incentiveDetails: {
    key: "incentiveType",
    notEquals: "None",
  },
  customSecondaryText: {
    key: "secondaryAction",
    equals: "Custom",
  },
  privacyUrl: {
    key: "dataCollected",
    notEquals: "",
  },
};

const examples = {
  popupGoal: "Grow email list",
  popupSubject: "15% welcome discount for first-time customers",
  targetAudience:
    "First-time visitors comparing affordable project-management tools",
  keyDetails:
    "The discount applies to the first monthly subscription, excludes annual plans, and expires August 31, 2026.",
  desiredAction: "Enter an email address and receive the guide",
  pageContext: "Pricing page after the visitor scrolls through plan comparisons",
  destinationUrl: "https://example.com/offer",
  triggerType: "After scroll progress",
  tone: "Clear and natural",
  outputLanguage: "English",
  incentiveType: "Discount",
  incentiveDetails: "15% off the first order, excluding gift cards",
  timeLimit: "Valid until August 31, 2026, while registration is open",
  secondaryAction: "Continue browsing",
  customSecondaryText: "View plans first",
  brandName: "Creatornivo",
  brandVoice:
    "Direct, practical, lightly conversational, never overly enthusiastic",
  popupFormat: "Slide-in",
  lengthPreference: "Balanced",
  dataCollected: "Email address, first name",
  privacyUrl: "https://example.com/privacy",
  restrictions:
    "No fake scarcity, no guaranteed results, and no unsupported privacy promises.",
  variantCount: "3",
  additionalContext: "Keep mobile copy short and avoid intrusive language.",
};

const fieldRows = `
popupGoal|Popup goal|essentials|select|yes||Select the main goal|Choose the single most important result this popup should produce.|The goal determines the popup structure, persuasive angle, CTA, and suitable trigger.
popupSubject|Offer or message|essentials|text|yes|200|Example: 15% welcome discount for first-time customers|Describe what the popup is promoting, announcing, offering, or requesting.|The model cannot safely infer the actual offer, announcement, resource, or message.
targetAudience|Target audience|essentials|textarea|yes|500|Example: First-time visitors comparing affordable project-management tools|Describe the visitors who should see the popup and what matters to them.|Audience context materially changes the value proposition, vocabulary, and level of persuasion.
keyDetails|Essential facts|essentials|textarea|yes|1500|Include benefits, conditions, dates, eligibility, prices, or other confirmed details|Provide only facts the generated popup may safely state as true.|It supplies the factual basis and prevents the model from inventing claims or offer terms.
desiredAction|Desired visitor action|essentials|text|yes|180|Example: Enter an email address and receive the guide|State the one primary action visitors should take after reading the popup.|The primary CTA must reflect the user's actual conversion objective.
pageContext|Page or journey context|essentials|text|no|240|Example: Pricing page after the visitor scrolls through plan comparisons|Explain where the popup appears or what the visitor was doing beforehand.|Page context helps the popup feel relevant rather than generic or disruptive.
destinationUrl|Destination URL|essentials|url|no|500|https://example.com/offer|Add the page opened by the primary CTA when the action leads elsewhere.|It keeps the CTA and implementation recommendation aligned with the real destination.
triggerType|Popup trigger|essentials|select|no||Select when the popup appears|Choose a trigger or let the model recommend the least disruptive option.|Trigger context changes the opening message and the appropriate level of urgency.
tone|Tone|essentials|select|no||Select a tone|Choose the overall voice without controlling individual sentences.|Tone materially affects the copy while remaining simple enough for non-specialist users.
outputLanguage|Output language|essentials|text|no|80|Example: English, Ukrainian, Spanish|Enter the language in which the complete popup package should be written.|A free-text language field supports any language without an oversized select menu.
incentiveType|Incentive type|offer_conversion|select|no||Select an incentive|Choose the real incentive connected to the visitor action.|It lets the prompt distinguish between an ordinary message and a value exchange.
incentiveDetails|Incentive details|offer_conversion|textarea|no|800|Example: 15% off the first order, excluding gift cards|Provide the exact value, conditions, code, exclusions, or delivery method.|Specific incentive terms must come from the user rather than being fabricated.
timeLimit|Real deadline or availability|offer_conversion|text|no|300|Example: Valid until August 31, 2026, while the event registration is open|Enter only a genuine deadline, stock condition, schedule, or availability limit.|It allows legitimate urgency while preventing invented countdowns or scarcity.
secondaryAction|Secondary action|offer_conversion|select|no||Choose a dismissal option|Control the optional alternative to the primary CTA.|Dismissal wording affects user trust and must not become manipulative.
customSecondaryText|Custom secondary text|offer_conversion|text|no|60|Example: View plans first|Enter a neutral alternative action without guilt-based wording.|It supports a legitimate custom path without loading an unnecessary field for every user.
brandName|Brand name|brand_experience|text|no|120|Example: Creatornivo|Add the brand name only when recognition inside the popup is useful.|Brand identification may improve clarity but is unnecessary for every popup.
brandVoice|Brand voice guidance|brand_experience|textarea|no|600|Example: Direct, practical, lightly conversational, never overly enthusiastic|Describe established voice rules or provide a short example.|It allows established brands to preserve a specific voice beyond a general tone selection.
popupFormat|Popup format|brand_experience|select|no||Select a display format|Choose the interface type or let the model recommend one.|The available space and interruption level directly affect copy length and structure.
lengthPreference|Copy length|brand_experience|select|no||Select a length|Control the amount of copy without requiring exact character knowledge.|Different popup formats and offers require different levels of explanation.
dataCollected|Data collected|privacy_output|multiselect|no||Email address, first name|List only the information visitors will actually be asked to submit.|The generated form and privacy microcopy must reflect the real requested data.
privacyUrl|Privacy policy URL|privacy_output|url|no|500|https://example.com/privacy|Provide the policy link used near a signup or data-collection form.|It enables useful privacy-link guidance without inventing a policy or compliance claim.
restrictions|Restrictions and claims to avoid|privacy_output|textarea|no|1000|List prohibited wording, legal restrictions, exclusions, or brand rules|Combine all project-specific restrictions in one place.|The user may know legal, contractual, product, or brand limitations the model cannot infer.
variantCount|Number of variants|privacy_output|select|no||Select variant count|Generate several genuinely different angles without creating an excessive package.|It controls output volume and supports practical testing or comparison.
additionalContext|Additional context|privacy_output|textarea|no|2000|Add any remaining requirement that materially affects the popup|Use this for important context not covered by another field.|It handles legitimate edge cases without creating several low-value miscellaneous fields.
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
  if (sourceType === "url") return { type: "text", format: "url" };
  if (sourceType === "multiselect") return { type: "textarea" };
  return { type: sourceType };
}

function helpAvoidFor(field) {
  if (field.key === "popupGoal") {
    return "Avoid mixing several goals, such as list growth, feedback, and product traffic, inside one popup.";
  }
  if (field.key === "popupSubject") {
    return "Avoid vague topics, invented offers, fake discounts, or messages that are not actually approved.";
  }
  if (field.key === "keyDetails") {
    return "Avoid unsupported claims, fake urgency, invented prices, unverified deadlines, or missing terms.";
  }
  if (field.key === "desiredAction") {
    return "Avoid several competing actions or CTA wording that hides what happens next.";
  }
  if (field.key === "destinationUrl") {
    return "Avoid invented, shortened, rewritten, tracking-modified, or unsupported links.";
  }
  if (field.key === "incentiveDetails") {
    return "Avoid invented discounts, bonuses, eligibility, shipping terms, delivery promises, or offer conditions.";
  }
  if (field.key === "timeLimit") {
    return "Avoid countdowns, last-chance language, stock claims, or scarcity that is not a real supplied fact.";
  }
  if (field.key === "secondaryAction" || field.key === "customSecondaryText") {
    return "Avoid confirmshaming, guilt-based dismissals, hidden close controls, or manipulative alternatives.";
  }
  if (field.key === "dataCollected") {
    return "Avoid requesting sensitive, unnecessary, or undisclosed data fields.";
  }
  if (field.key === "privacyUrl") {
    return "Avoid fake policy links, unsupported privacy promises, or presenting legal compliance as confirmed.";
  }
  if (field.key === "restrictions") {
    return "Avoid ignoring known legal, brand, product, or contractual restrictions.";
  }
  if (field.required) {
    return "Avoid vague placeholders, unsupported claims, multiple competing messages, or changing the popup into a different campaign.";
  }
  return "Avoid guessed facts, fake urgency, fake scarcity, unsupported claims, hidden promotion, or sensitive private data.";
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
        ? `Provide the ${label.toLowerCase()} for this website popup.`
        : `Optional context for the ${label.toLowerCase()} field.`,
      why,
      example: `Good example: ${examples[key] ?? placeholder}`,
      avoid: helpAvoidFor({ key, required }),
    },
  };

  if (adapted.format) field.format = adapted.format;
  if (defaultValues[key]) field.defaultValue = defaultValues[key];
  if (maxLengthRaw) field.maxLength = Number(maxLengthRaw);
  if (options[key]) field.options = options[key];
  if (showWhen[key]) field.showWhen = showWhen[key];
  if (sourceType === "textarea" || adapted.type === "textarea") {
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
  slug: "website-popup",
  title: "Website Popup",
  fieldCount: variables.length,
  requiredKeys: variables
    .filter((variable) => variable.required)
    .map((variable) => variable.key),
  groups,
  variables,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(schema, null, 2)}\n`);
console.log(`Wrote ${path.relative(root, outPath)} with ${variables.length} fields.`);
