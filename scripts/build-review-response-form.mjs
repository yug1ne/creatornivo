/**
 * Builds the Review Response form schema from the approved 21-field
 * specification. It verifies that every prompt variable has exactly one form
 * field before writing the form JSON.
 *
 * Usage: node scripts/build-review-response-form.mjs
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
  "review-response.txt",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "review-response-variables.json",
);

const groups = [
  {
    id: "essentials",
    title: "Essentials",
    description:
      "Business name, review platform, review text, sentiment, goal, destination, verified facts, reviewer name, and output language.",
    defaultOpen: true,
  },
  {
    id: "review_context_resolution",
    title: "Review Context & Resolution",
    description:
      "Issue category, case status, approved resolution, private contact method, and boundaries.",
    defaultOpen: false,
  },
  {
    id: "brand_tone",
    title: "Brand & Tone",
    description:
      "Response tone, brand voice, sign-off, and words or phrases to avoid.",
    defaultOpen: false,
  },
  {
    id: "output_settings",
    title: "Output Settings",
    description:
      "Response length, number of variants, and optional internal risk note.",
    defaultOpen: false,
  },
];

const defaultValues = {
  reviewPlatform: "Auto",
  reviewSentiment: "Auto-detect",
  responseGoal: "Auto",
  responseVisibility: "Public reply",
  outputLanguage: "English",
  issueCategory: "Auto",
  caseStatus: "Not specified",
  tone: "Auto",
  responseLength: "Platform-appropriate auto",
  variantCount: "1",
  includeInternalNote: "Off",
};

const options = {
  reviewPlatform: [
    "Auto",
    "Google Business Profile",
    "Trustpilot",
    "Yelp",
    "Facebook",
    "App Store",
    "Marketplace listing",
    "Other review platform",
  ],
  reviewSentiment: [
    "Auto-detect",
    "Very positive",
    "Positive",
    "Mixed or neutral",
    "Negative",
    "Severe or sensitive",
  ],
  responseGoal: [
    "Auto",
    "Thank and reinforce",
    "Acknowledge and reassure",
    "De-escalate",
    "Correct misinformation",
    "Invite private follow-up",
    "Explain policy calmly",
  ],
  responseVisibility: ["Public reply", "Private response", "Both"],
  issueCategory: [
    "Auto",
    "General praise",
    "Product quality",
    "Service experience",
    "Delivery or order",
    "Billing or refund",
    "Technical issue",
    "Staff conduct",
    "Policy dispute",
    "Safety or high-stakes",
  ],
  caseStatus: [
    "Not specified",
    "No action needed",
    "Investigating",
    "In progress",
    "Resolved",
    "Unable to verify",
  ],
  tone: [
    "Auto",
    "Warm and appreciative",
    "Professional and neutral",
    "Empathetic and calm",
    "Friendly and concise",
    "Formal",
    "Firm but respectful",
    "Apologetic without liability",
  ],
  responseLength: [
    "Platform-appropriate auto",
    "Very short",
    "Short",
    "Standard",
  ],
  includeInternalNote: ["On", "Off"],
};

const showWhen = {
  approvedResolutionDetails: {
    key: "caseStatus",
    equals: ["In progress", "Resolved"],
  },
  contactDetails: {
    anyOf: [
      { key: "responseGoal", equals: "Invite private follow-up" },
      { key: "responseVisibility", equals: "Private response" },
      { key: "responseVisibility", equals: "Both" },
      { key: "caseStatus", equals: "Investigating" },
      { key: "caseStatus", equals: "In progress" },
    ],
  },
};

const examples = {
  businessName: "Northside Dental Clinic",
  reviewPlatform: "Google Business Profile",
  reviewText:
    "The hygienist was kind, but I waited 40 minutes past my appointment time.",
  reviewSentiment: "Mixed or neutral",
  responseGoal: "Acknowledge and reassure",
  responseVisibility: "Public reply",
  verifiedFacts:
    "The appointment ran late because an emergency visit extended the previous slot.",
  reviewerName: "Maria",
  outputLanguage: "English",
  issueCategory: "Service experience",
  caseStatus: "Investigating",
  approvedResolutionDetails:
    "The office manager may review the scheduling issue and follow up privately.",
  contactDetails:
    "Email support@example.com with the appointment date and preferred contact method.",
  boundariesRestrictions:
    "Do not discuss medical details publicly or promise compensation.",
  tone: "Empathetic and calm",
  brandVoice: "Friendly, practical, calm, and never overly corporate.",
  signOff: "The Northside Support Team",
  wordsToAvoid: "valued customer, inconvenience caused, company policy",
  responseLength: "Short",
  variantCount: "2",
  includeInternalNote: "On",
};

const fieldRows = `
businessName|Business or brand name|essentials|text|yes|120|Example: Northside Dental Clinic|Identifies the business responding to the review.|The model must know which business is speaking and how to frame the response.
reviewPlatform|Review platform|essentials|select|no|40|Select the platform|Helps adapt the response to the expected platform style.|Public review platforms differ in tone, context, and practical response conventions.
reviewText|Customer review|essentials|textarea|yes|4000|Paste the complete customer review here.|Include the original wording so the response can acknowledge specific details.|The review itself is the primary source for sentiment, concerns, and relevant details.
reviewSentiment|Review sentiment|essentials|select|yes|32|Select or use automatic detection|Choose a sentiment only when automatic detection may be misleading.|Sentiment materially changes the acknowledgment, apology level, and response structure.
responseGoal|Primary response goal|essentials|select|yes|32|Choose the desired outcome|Defines what the response should achieve without requiring marketing terminology.|A thank-you response, factual correction, and complaint recovery require different approaches.
responseVisibility|Response destination|essentials|select|no|24|Choose where the response will appear|Select whether the output is public, private, or includes both versions.|Public and private responses require different privacy and detail levels.
verifiedFacts|Verified facts|essentials|textarea|no|2000|Add confirmed facts, records, dates, actions, or relevant context.|Only include information the business can safely and accurately state.|Verified facts are necessary when clarifying events or correcting misinformation.
reviewerName|Reviewer name|essentials|text|no|120|Example: Maria|Used only when a personal greeting feels natural and privacy-safe.|A supplied name can make the response more personal without requiring it.
outputLanguage|Output language|essentials|text|yes|80|Example: English, German, Ukrainian|Sets the language of the complete response package.|The response language cannot always be reliably inferred from the review.
issueCategory|Issue category|review_context_resolution|select|no|40|Select the closest category|Helps the model emphasize the right concern and apply appropriate caution.|Different complaint categories require different acknowledgment and risk handling.
caseStatus|Current case status|review_context_resolution|select|no|32|Select the current status|Prevents the response from implying progress or resolution that has not occurred.|Case status determines which operational statements can be made truthfully.
approvedResolutionDetails|Approved resolution details|review_context_resolution|textarea|no|1500|Describe what was done or what action is currently approved.|Add only resolution details that may be communicated to the reviewer.|It prevents the model from inventing refunds, replacements, investigations, or outcomes.
contactDetails|Private contact method|review_context_resolution|textarea|no|500|Example: Email support@example.com with the order number.|Provide the approved channel and any safe instructions for private follow-up.|The model must not invent contact information or unsupported escalation paths.
boundariesRestrictions|Boundaries and restrictions|review_context_resolution|textarea|no|1500|Add relevant policies, legal boundaries, or details that must remain private.|Combine policy limits, prohibited promises, and sensitive topics in one field.|It gives the model necessary operational limits without creating multiple compliance fields.
tone|Response tone|brand_tone|select|no|40|Select a tone|Choose a tone only when the automatic professional style is not sufficient.|Tone changes how acknowledgment, apology, and boundaries are expressed.
brandVoice|Brand voice|brand_tone|textarea|no|600|Example: Friendly, practical, calm, and never overly corporate.|Describe only the voice qualities that should meaningfully affect the response.|It allows the response to sound consistent with the business rather than generic.
signOff|Preferred sign-off|brand_tone|text|no|120|Example: The Northside Support Team|Leave blank when the platform does not require a closing signature.|Some businesses require a consistent team or representative signature.
wordsToAvoid|Words or phrases to avoid|brand_tone|textarea|no|500|Example: valued customer, inconvenience caused, company policy|List wording that conflicts with the brand or situation.|Specific prohibited wording cannot always be inferred from general tone instructions.
responseLength|Response length|output_settings|select|no|32|Select a preferred length|Controls brevity while allowing the model to preserve essential information.|Businesses may need anything from a one-sentence acknowledgment to a fuller recovery response.
variantCount|Number of variants|output_settings|number|no||1|Generate one final response or up to three meaningfully different versions.|Some users want a final answer, while others need several phrasing options for approval.
includeInternalNote|Include internal risk note|output_settings|toggle|no||Select whether to include a private note|Adds a private note about missing facts, privacy risks, or escalation needs.|Sensitive reviews may require a concise warning without placing internal analysis in the public reply.
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
  if (sourceType === "toggle") return { type: "select" };
  return { type: sourceType };
}

function helpAvoidFor(field) {
  if (field.key === "businessName") {
    return "Avoid invented brand names, unrelated subsidiaries, or legal entity details that are not meant to appear in the response.";
  }
  if (field.key === "reviewText") {
    return "Avoid summarizing the review from memory, omitting key complaints, or adding facts the reviewer did not write.";
  }
  if (field.key === "verifiedFacts") {
    return "Avoid assumptions, internal guesses, unsupported records-checked claims, or private details that should not appear publicly.";
  }
  if (field.key === "approvedResolutionDetails") {
    return "Avoid invented refunds, replacements, investigations, callbacks, deadlines, compensation, or outcomes.";
  }
  if (field.key === "contactDetails") {
    return "Avoid fake email addresses, unsupported escalation routes, public requests for sensitive data, or private details in a public reply.";
  }
  if (field.key === "boundariesRestrictions") {
    return "Avoid vague warnings that do not explain what the response must not say or promise.";
  }
  if (field.key === "wordsToAvoid") {
    return "Avoid listing every disliked style preference when only a few phrases are truly prohibited.";
  }
  if (field.required) {
    return "Avoid vague placeholders, missing context, unsupported facts, or conflicting goals that would make the response unsafe.";
  }
  return "Avoid guessed facts, unsupported promises, private customer data, accusations, fake urgency, or wording that pressures review changes.";
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
        ? `Provide the ${label.toLowerCase()} for this review response.`
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
  if (sourceType === "textarea" || adapted.type === "textarea") {
    field.fullWidth = true;
  }
  if (key === "variantCount") {
    field.min = 1;
    field.max = 3;
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
  slug: "review-response",
  title: "Review Response",
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
