/**
 * Builds the Quora Answer form schema from the approved 24-field specification.
 * Does NOT modify the prompt text. It verifies that every prompt variable has
 * exactly one form field before writing the form JSON.
 *
 * Usage: node scripts/build-quora-answer-form.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const promptPath = path.join(root, "prisma", "template-prompts", "quora-answer.txt");
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "quora-answer-variables.json",
);

const groups = [
  {
    id: "essentials",
    title: "Essentials",
    description:
      "Question, intended answer, audience, important points, author perspective, language, tone, length, and necessary context.",
    defaultOpen: true,
  },
  {
    id: "evidence_credibility",
    title: "Evidence & Credibility",
    description:
      "Supporting material, examples, experience details, credentials, and limitations without encouraging fabricated authority.",
    defaultOpen: false,
  },
  {
    id: "promotion_disclosure",
    title: "Promotion & Disclosure",
    description:
      "Commercial relationships, links, affiliation disclosure, and proportional reader actions.",
    defaultOpen: false,
  },
  {
    id: "style_output",
    title: "Style & Output",
    description:
      "Answer structure, opening, reading level, verification notes, and exceptional requirements.",
    defaultOpen: false,
  },
];

const defaultValues = {
  answerGoal: "Explain clearly",
  targetReader: "General reader asking this question",
  perspectiveType: "Neutral explainer",
  outputLanguage: "English",
  tone: "Clear and natural",
  answerLength: "Platform appropriate",
  affiliationType: "No material affiliation",
  readerAction: "Auto",
  structureStyle: "Auto",
  openingStyle: "Direct answer",
  readingLevel: "General audience",
  includeSourceNotes: "Off",
};

const options = {
  answerGoal: [
    "Explain clearly",
    "Compare options",
    "Recommend an approach",
    "Troubleshoot a problem",
    "Share experience",
    "Correct a misconception",
  ],
  perspectiveType: [
    "Neutral explainer",
    "Subject-matter expertise",
    "First-hand experience",
    "Experience and expertise",
    "Company representative",
    "Personal opinion",
  ],
  tone: [
    "Clear and natural",
    "Friendly and conversational",
    "Professional",
    "Concise and direct",
    "Thoughtful",
    "Technical",
    "Cautious",
    "Auto",
  ],
  answerLength: ["Concise", "Standard", "Detailed", "Platform appropriate"],
  affiliationType: [
    "No material affiliation",
    "Founder or owner",
    "Employee or representative",
    "Customer or user",
    "Consultant or partner",
    "Affiliate relationship",
    "Paid sponsorship",
    "Investor or other connection",
  ],
  readerAction: [
    "None",
    "Invite discussion",
    "Read a resource",
    "Try a product or service",
    "Contact the author or company",
    "Follow the profile",
    "Auto",
  ],
  structureStyle: [
    "Natural paragraphs",
    "Step by step",
    "Comparison",
    "Mixed",
    "Auto",
  ],
  openingStyle: [
    "Direct answer",
    "Brief context",
    "Clarify the premise",
    "Personal observation",
    "Auto",
  ],
  readingLevel: [
    "Simple",
    "General audience",
    "Informed audience",
    "Specialist",
    "Auto",
  ],
  includeSourceNotes: ["On", "Off"],
};

const showWhen = {
  firstHandDetails: {
    key: "perspectiveType",
    equals: ["First-hand experience", "Experience and expertise"],
  },
  affiliatedEntity: {
    key: "affiliationType",
    notEquals: "No material affiliation",
  },
};

const examples = {
  quoraQuestion:
    "What is the best way for solo founders to stay consistent with content?",
  answerGoal: "Explain clearly",
  targetReader: "Solo founders building a small content workflow.",
  directAnswer:
    "A simple repeatable system is more reliable than waiting for motivation.",
  keyPoints:
    "Use templates, define a weekly cadence, save prompts that work, and review which drafts become publishable.",
  perspectiveType: "Neutral explainer",
  outputLanguage: "English",
  tone: "Clear and natural",
  answerLength: "Platform appropriate",
  questionContext:
    "The reader is asking about consistency, not viral growth or paid ads.",
  supportingEvidence:
    "Only use the supplied workflow notes; do not invent studies or statistics.",
  examplesOrSteps:
    "Pick one channel, create three reusable formats, and schedule one review block per week.",
  firstHandDetails:
    "I used a saved prompt library to reduce rewriting before publishing weekly updates.",
  credentialsContext: "Founder building content workflow tools.",
  uncertaintyLimits:
    "The best cadence depends on the founder's available time and topic complexity.",
  affiliationType: "No material affiliation",
  affiliatedEntity: "Creatornivo",
  relevantLink: "https://www.creatornivo.com/resources",
  readerAction: "Auto",
  structureStyle: "Mixed",
  openingStyle: "Direct answer",
  readingLevel: "General audience",
  includeSourceNotes: "Off",
  additionalRequirements:
    "Avoid fake results, user counts, revenue claims, and promotional pressure.",
};

const fieldRows = `
quoraQuestion|Quora question|essentials|text|yes|300|What question should the answer respond to?|Paste the exact question or write it as it appears on Quora.|The answer must respond directly to the exact question being asked.
answerGoal|Answer goal|essentials|select|yes||Select the main purpose|Choose what the answer should primarily help the reader do or understand.|Different Quora questions require different reasoning and content structures.
targetReader|Target reader|essentials|text|no|200|For example: first-time founders, students, new homeowners|Describe who should find the answer most useful.|Reader knowledge and circumstances affect terminology, examples, and depth.
directAnswer|Main answer|essentials|textarea|yes|800|State the main conclusion or position the answer should communicate.|Give the direct answer in your own words before adding supporting detail.|The model should not guess the user's intended conclusion or recommendation.
keyPoints|Key points to include|essentials|textarea|yes|1500|List the facts, reasons, warnings, steps, or distinctions that must appear.|Include only points that are important to answering the question.|These points determine the substance and usefulness of the answer.
perspectiveType|Author perspective|essentials|select|yes||Choose the perspective|Select the truthful position from which the answer should be written.|The model must know whether it may write from experience, expertise, opinion, or an organizational role.
outputLanguage|Output language|essentials|text|yes|80|For example: English, Ukrainian, Spanish|Enter the language for the complete generated answer.|Quora operates across languages, and the desired language cannot always be inferred.
tone|Tone|essentials|select|no||Select a tone|Choose the overall voice without changing the factual position.|Tone materially affects how credible and appropriate the answer feels to its intended reader.
answerLength|Answer length|essentials|select|no||Select the preferred depth|The model may write less when the available facts do not support a longer answer.|Quora answers can range from brief explanations to detailed expert responses.
questionContext|Question context|essentials|textarea|no|1000|Add assumptions, background, or ambiguity the answer should address.|Use this when the question needs context beyond its visible wording.|Some questions contain hidden assumptions or refer to a specific situation that affects the answer.
supportingEvidence|Evidence and references|evidence_credibility|textarea|no|4000|Paste approved facts, statistics, quotations, study details, or source links.|Only supplied evidence may be presented as sourced or verified.|Evidence-dependent answers require user-supplied facts and references to avoid fabrication.
examplesOrSteps|Examples or practical steps|evidence_credibility|textarea|no|1500|Add examples, procedures, comparisons, or steps that should be used.|Provide real details or clearly describe anything that should remain hypothetical.|Examples and procedures can materially improve explanatory, recommendation, and troubleshooting answers.
firstHandDetails|First-hand experience|evidence_credibility|textarea|no|1500|Describe what you personally did, observed, used, or learned.|Include only genuine experience that may be written in the first person.|The model needs specific authentic details before it can truthfully claim personal experience.
credentialsContext|Relevant credentials|evidence_credibility|text|no|500|For example: tax accountant in Ontario with eight years of experience|Add only credentials or roles directly relevant to the question.|Relevant credentials can establish context but must not be inferred or invented.
uncertaintyLimits|Limits and uncertainties|evidence_credibility|textarea|no|1000|Note disputed facts, exceptions, risks, unknowns, or jurisdiction limits.|Use this to prevent an overly broad or overconfident conclusion.|Known limitations may materially change the accuracy and safety of the answer.
affiliationType|Relationship to the subject|promotion_disclosure|select|no||Select any relevant relationship|Disclose financial, professional, ownership, or other material connections.|Quora requires relevant affiliations to be disclosed clearly when they could affect how an answer is understood.
affiliatedEntity|Affiliated entity|promotion_disclosure|text|no|200|Name the product, company, service, or organization.|This is used to create a clear and specific disclosure.|A disclosure is not useful when it does not identify the relevant relationship or entity.
relevantLink|Relevant link|promotion_disclosure|url|no|500|https://www.creatornivo.com/resources|Include one link only when it directly helps answer the question.|A relevant resource may improve the answer, but the model must not invent or overuse links.
readerAction|Reader next step|promotion_disclosure|select|no||Choose an optional next step|The answer will use no CTA unless the selected action fits naturally.|The desired next step affects the conclusion and determines whether a link or promotional mention is appropriate.
structureStyle|Answer structure|style_output|select|no||Select a structure|Choose how the explanation should be organized.|Procedures, comparisons, and explanatory answers benefit from different structures.
openingStyle|Opening style|style_output|select|no||Select how the answer should begin|Quora readers should receive useful information immediately.|The opening determines whether the answer begins with a conclusion, clarification, or valid personal context.
readingLevel|Reading level|style_output|select|no||Select the expected knowledge level|This controls terminology and explanation depth rather than answer quality.|The same subject may require very different terminology for beginners and specialists.
includeSourceNotes|Include verification notes|style_output|toggle|no||Off|Adds private source and claim-check notes after the public answer.|Users working with factual or high-stakes material may need a separate publication review.
additionalRequirements|Additional requirements|style_output|textarea|no|2000|Add necessary wording, exclusions, formatting, or other special instructions.|Use this only for requirements not already covered by another field.|One controlled miscellaneous field supports exceptional requirements without expanding the form unnecessarily.
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
  if (sourceType === "toggle") return { type: "select" };
  return { type: sourceType };
}

function helpAvoidFor(field) {
  if (field.key === "supportingEvidence") {
    return "Avoid invented studies, statistics, quotations, sources, links, or claims that the supplied evidence does not support.";
  }
  if (field.key === "firstHandDetails") {
    return "Avoid fake first-person experience, exaggerated outcomes, or stories that did not happen.";
  }
  if (field.key === "credentialsContext") {
    return "Avoid credentials, roles, licenses, clients, employers, or authority signals that are not true and relevant.";
  }
  if (field.key === "affiliatedEntity" || field.key === "affiliationType") {
    return "Avoid hiding material relationships or implying independent neutrality when a connection exists.";
  }
  if (field.key === "relevantLink") {
    return "Avoid invented, shortened, repeated, irrelevant, or promotional links that do not help answer the question.";
  }
  if (field.required) {
    return "Avoid vague placeholders, unsupported conclusions, invented evidence, or changing the question into an easier one.";
  }
  return "Avoid guessed facts, fake urgency, fake testimonials, hidden promotion, engagement bait, or unsupported high-stakes advice.";
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
        ? `Provide the ${label.toLowerCase()} for this Quora answer.`
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
  if (sourceType === "textarea" || field.maxLength > 500) {
    field.fullWidth = true;
  }

  if (sourceType === "toggle") {
    field.hint = `${baseHint} Choose On or Off.`;
    field.help.what =
      "Choose whether to include private source and claim-check notes after the public answer.";
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
  slug: "quora-answer",
  title: "Quora Answer",
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
