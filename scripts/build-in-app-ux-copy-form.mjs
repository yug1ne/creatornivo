/**
 * Builds the In-App UX Copy form schema from the approved 24-field
 * specification. It verifies that every prompt variable has exactly one form
 * field before writing the form JSON.
 *
 * Usage: node scripts/build-in-app-ux-copy-form.mjs
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
  "in-app-ux-copy.txt",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "in-app-ux-copy-variables.json",
);

const groups = [
  {
    id: "essentials",
    title: "Essentials",
    description:
      "Product context, interface context, user goal, target users, requested UX elements, required facts, task mode, tone, language, and existing copy when relevant.",
    defaultOpen: true,
  },
  {
    id: "flow_behavior",
    title: "Flow & Behavior",
    description:
      "User state, next action, supported recovery options, and device or flow variations.",
    defaultOpen: false,
  },
  {
    id: "voice_accessibility",
    title: "Voice & Accessibility",
    description:
      "Brand voice, required terminology, reading level, and accessibility priorities.",
    defaultOpen: false,
  },
  {
    id: "constraints_delivery",
    title: "Constraints & Delivery",
    description:
      "Length preference, variant count, prohibited content, sensitive-domain controls, compliance notes, and remaining context.",
    defaultOpen: false,
  },
];

const defaultValues = {
  taskMode: "Create new copy",
  tone: "Clear and supportive",
  outputLanguage: "English",
  userState: "Auto",
  nextAction: "Auto",
  readingLevel: "General audience",
  accessibilityNeeds: "Clear language",
  lengthPreference: "Auto by element",
  numberOfVariants: "2",
  sensitiveDomain: "None",
};

const options = {
  uxElements: [
    "Buttons and links",
    "Field labels",
    "Helper text",
    "Input placeholders",
    "Onboarding",
    "Empty states",
    "Validation messages",
    "Error messages",
    "Success states",
    "System notifications",
  ],
  taskMode: [
    "Create new copy",
    "Rewrite existing copy",
    "Audit and improve copy",
  ],
  tone: [
    "Clear and supportive",
    "Neutral and direct",
    "Friendly and conversational",
    "Calm and reassuring",
    "Professional",
    "Concise and technical",
    "Auto",
  ],
  userState: [
    "Auto",
    "First-time user",
    "Returning user",
    "Confused or uncertain",
    "Blocked by an error",
    "Completing a risky action",
    "Successful completion",
    "Time-sensitive situation",
  ],
  readingLevel: [
    "General audience",
    "Very simple",
    "Professional",
    "Technical users",
    "Auto",
  ],
  accessibilityNeeds: [
    "Clear language",
    "Screen-reader clarity",
    "Avoid directional wording",
    "Avoid color-only references",
    "Cognitive accessibility",
    "Translation-friendly wording",
  ],
  lengthPreference: [
    "Auto by element",
    "As short as possible",
    "Concise with context",
    "More explanatory",
  ],
  sensitiveDomain: [
    "None",
    "Health or medical",
    "Financial",
    "Legal",
    "Safety or security",
    "Employment",
    "Children or minors",
    "Account and privacy",
    "Other regulated context",
  ],
};

const showWhen = {
  currentCopy: {
    key: "taskMode",
    equals: ["Rewrite existing copy", "Audit and improve copy"],
  },
  errorRecoveryAction: {
    key: "uxElements",
    contains: ["Validation messages", "Error messages"],
  },
  complianceNotes: {
    key: "sensitiveDomain",
    notEquals: "None",
  },
};

const examples = {
  productOrFeature: "Team calendar, payment checkout, password reset",
  interfaceContext: "Password reset form after the user opens a recovery link.",
  workflowGoal: "Recover access to the account",
  targetUsers: "First-time users with limited technical experience",
  uxElements: "Buttons and links, validation messages, success states",
  keyFacts:
    "The reset link expires after 30 minutes. Passwords must be at least 12 characters.",
  taskMode: "Create new copy",
  tone: "Clear and supportive",
  outputLanguage: "English",
  currentCopy: "Reset failed. Try again.",
  userState: "Blocked by an error",
  nextAction: "Request a new password reset link",
  errorRecoveryAction:
    "Users can request a new link or contact support if they no longer have access to the email address.",
  variantContext: "Mobile modal, desktop full-page form, guest user",
  brandVoice: "Direct, calm, practical, and never overly enthusiastic",
  terminology: "Use sign in, not log in. Use workspace, not account group.",
  readingLevel: "General audience",
  accessibilityNeeds: "Clear language, screen-reader clarity",
  lengthPreference: "Concise with context",
  numberOfVariants: "2",
  prohibitedContent:
    "Avoid secure, instant, guaranteed, free, and any unsupported recovery promise.",
  sensitiveDomain: "Account and privacy",
  complianceNotes:
    "Use approved account-recovery wording and do not expose email addresses in full.",
  additionalContext: "Keep button labels short and avoid blame.",
};

const fieldRows = `
productOrFeature|Product or feature|essentials|text|yes|160|Example: Team calendar, payment checkout, password reset|Name the product, feature, or area where the copy will appear.|The model needs to understand what the interface belongs to and what terminology is appropriate.
interfaceContext|Screen or interface context|essentials|textarea|yes|1000|Describe the screen, modal, form, notification, or step in the workflow.|Explain where the text appears and what is happening at that moment.|UX copy depends heavily on the exact screen, interaction, and surrounding interface.
workflowGoal|User goal|essentials|text|yes|200|Example: Complete payment, recover access, invite a teammate|State what the user is trying to accomplish in this flow.|The intended user outcome determines the wording, hierarchy, and primary action.
targetUsers|Target users|essentials|textarea|yes|600|Example: First-time users with limited technical experience|Describe the people who will read and act on this copy.|Audience knowledge affects vocabulary, guidance depth, assumptions, and reading complexity.
uxElements|UX copy needed|essentials|multiselect|yes|800|Buttons and links, validation messages, error messages|List all interface elements you need.|Different interface elements require different structures, lengths, and information priorities.
keyFacts|Required facts and details|essentials|textarea|yes|1500|Include product rules, causes, limitations, requirements, and confirmed details.|Provide only factual information that the copy may safely communicate.|The model must not invent product behavior, causes, requirements, or resolution details.
taskMode|Copy task|essentials|select|no||Choose the type of work.|Select whether to create, rewrite, or audit the interface copy.|Creating new microcopy and evaluating existing interface text require different workflows.
tone|Tone|essentials|select|no||Choose the preferred tone.|The tone will be adapted to the situation and severity of the message.|Tone materially affects onboarding, errors, warnings, and confirmation messages.
outputLanguage|Output language|essentials|text|no|80|Example: English, Spanish, Ukrainian|Specify the language for all generated interface copy.|Interface length, grammar, terminology, and formality vary by language.
currentCopy|Current interface copy|essentials|textarea|no|4000|Paste the existing labels, messages, or interface text.|Include the copy that should be rewritten or reviewed.|The existing wording is necessary when the user requests a rewrite or copy audit.
userState|User state|flow_behavior|select|no||Choose the user's likely state.|Helps adjust clarity, reassurance, urgency, and information density.|The user's state changes how much explanation, reassurance, or caution is appropriate.
nextAction|Expected next action|flow_behavior|text|no|240|Example: Retry payment, open settings, continue to dashboard|Describe the safest or most useful action after reading the copy.|Good UX copy should guide the user toward a clear and accurate next step.
errorRecoveryAction|Error recovery options|flow_behavior|textarea|no|800|Explain what the user can do to fix, retry, or get help.|Include only recovery actions that the product actually supports.|Error copy should offer a real recovery path rather than a vague failure statement.
variantContext|Device or flow variations|flow_behavior|textarea|no|800|Example: Mobile modal, desktop sidebar, guest user, paid-plan variation|Describe contexts that require meaningfully different wording.|The same action may require different copy across devices, account states, or workflow branches.
brandVoice|Brand voice|voice_accessibility|textarea|no|800|Describe the brand personality or provide a short voice example.|Include useful voice traits, not general writing instructions.|Established products may need interface copy to match an existing verbal identity.
terminology|Required terminology|voice_accessibility|textarea|no|1000|List preferred terms, UI names, capitalization, or words to replace.|Use this for product-specific labels and terminology consistency.|Consistent interface terminology prevents confusion and implementation mismatches.
readingLevel|Reading level|voice_accessibility|select|no||Choose the intended reading level.|Controls vocabulary and sentence complexity without oversimplifying meaning.|Some products require simplified language while others use established technical terminology.
accessibilityNeeds|Accessibility priorities|voice_accessibility|multiselect|no|500|Clear language, screen-reader clarity, avoid color-only references|List relevant accessibility priorities.|These requirements affect labels, instructions, error descriptions, and references to visual controls.
lengthPreference|Copy length|constraints_delivery|select|no||Choose the preferred level of brevity.|Element-specific clarity takes priority over arbitrary uniform length.|Space constraints and user complexity may require different levels of explanation.
numberOfVariants|Variants per element|constraints_delivery|number|no||1-5|Choose how many usable alternatives to generate for each item.|Some teams need one implementation-ready option while others need alternatives for review.
prohibitedContent|Words or claims to avoid|constraints_delivery|textarea|no|1000|List prohibited terms, promises, claims, or sensitive wording.|Combine all product-specific restrictions in this field.|The user may know legal, brand, product, or localization restrictions that cannot be inferred.
sensitiveDomain|Sensitive domain|constraints_delivery|select|no||Select a regulated or sensitive context.|Used to apply cautious wording and avoid unsupported high-stakes guidance.|Sensitive product areas require stricter claim, instruction, privacy, and risk handling.
complianceNotes|Compliance requirements|constraints_delivery|textarea|no|1500|Provide approved wording, jurisdiction, warnings, or required disclosures.|Include confirmed requirements only; the model will not invent legal language.|Regulated workflows may require exact approved information that only the user can provide.
additionalContext|Additional context|constraints_delivery|textarea|no|2000|Add any remaining requirement that materially affects the interface copy.|Do not repeat information already entered in another field.|Provides one controlled place for important edge cases without creating miscellaneous fields.
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
  if (sourceType === "multiselect") return { type: "textarea" };
  return { type: sourceType };
}

function helpAvoidFor(field) {
  if (field.key === "productOrFeature") {
    return "Avoid vague product names, internal project codenames, or unsupported feature claims.";
  }
  if (field.key === "interfaceContext") {
    return "Avoid describing the whole product when the copy is needed for one specific screen, state, or component.";
  }
  if (field.key === "uxElements") {
    return "Avoid asking for unrelated interface elements that are not part of the current screen or workflow.";
  }
  if (field.key === "keyFacts") {
    return "Avoid invented product behavior, unsupported causes, unknown recovery paths, prices, deadlines, or guarantees.";
  }
  if (field.key === "currentCopy") {
    return "Avoid pasting confidential data, passwords, tokens, full payment details, or private user information.";
  }
  if (field.key === "errorRecoveryAction") {
    return "Avoid recovery steps the product does not actually support, such as retry, contact support, or refresh, unless confirmed.";
  }
  if (field.key === "accessibilityNeeds") {
    return "Avoid claiming WCAG, legal, or formal accessibility compliance unless it has been separately verified.";
  }
  if (field.key === "prohibitedContent") {
    return "Avoid conflicts with required product terminology unless the conflict is explicitly documented.";
  }
  if (field.key === "sensitiveDomain" || field.key === "complianceNotes") {
    return "Avoid invented medical, legal, financial, safety, employment, privacy, or compliance guidance.";
  }
  if (field.required) {
    return "Avoid vague placeholders, unsupported behavior, multiple competing workflows, or product claims that are not confirmed.";
  }
  return "Avoid guessed facts, fake urgency, manipulative wording, hidden consequences, sensitive private data, or unsupported compliance claims.";
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
        ? `Provide the ${label.toLowerCase()} for this in-app UX copy request.`
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
  if (key === "numberOfVariants") {
    field.min = 1;
    field.max = 5;
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
  slug: "in-app-ux-copy",
  title: "In-App UX Copy",
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
