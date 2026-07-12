/**
 * Builds the Substack Post form schema from the approved 36-field
 * specification. It verifies that every prompt variable has exactly one form
 * field before writing the form JSON.
 *
 * Usage: node scripts/build-substack-post-form.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const promptPath = path.join(root, "prisma", "template-prompts", "substack-post.txt");
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "substack-post-variables.json",
);

const groups = [
  {
    id: "essentials",
    title: "Essentials",
    description:
      "Topic, audience, message, factual input, format, language, length, CTA, and title preferences for a valid first draft.",
    defaultOpen: true,
  },
  {
    id: "editorial_shape",
    title: "Editorial Shape",
    description:
      "Angle, reader knowledge level, opening, structure, depth, counterpoints, and ending style.",
    defaultOpen: false,
  },
  {
    id: "voice_author_context",
    title: "Voice & Author Context",
    description:
      "Author voice, point of view, writing sample, public context, and terms or styles to avoid.",
    defaultOpen: false,
  },
  {
    id: "publishing_monetization",
    title: "Publishing & Monetization",
    description:
      "Publication context, access model, free-preview boundary, paid-offer details, subject style, URL slug, and tags.",
    defaultOpen: false,
  },
  {
    id: "facts_sources_restrictions",
    title: "Facts, Sources & Restrictions",
    description:
      "Evidence, quotations, approved links, disclosures, sensitive-topic context, and additional requirements.",
    defaultOpen: false,
  },
];

const groupIdsByTitle = Object.fromEntries(
  groups.map((group) => [group.title, group.id]),
);

const defaultValues = {
  primaryGoal: "Inform or explain",
  postFormat: "Auto",
  outputLanguage: "English",
  postLength: "Platform appropriate",
  callToAction: "Auto",
  audienceKnowledge: "General audience",
  openingApproach: "Auto",
  structurePreference: "Auto",
  depthLevel: "Balanced",
  includeCounterpoints: "Off",
  tone: "Clear and natural",
  pointOfView: "Auto",
  accessModel: "Free",
  emailSubjectStyle: "Auto",
};

const showWhen = {
  previewBoundary: { key: "accessModel", equals: "Paid with free preview" },
  paidOfferDetails: {
    key: "accessModel",
    equals: ["Paid", "Paid with free preview"],
  },
};

const examples = {
  postTopic: "Why small creators struggle to stay consistent",
  primaryGoal: "Inform or explain",
  targetAudience:
    "Solo creators who publish weekly and want a calmer editorial workflow.",
  centralThesis:
    "Consistency improves when creators stop rebuilding their process from scratch.",
  keyPoints:
    "Templates reduce blank-page friction, saved prompts preserve useful patterns, and simple weekly review keeps the system honest.",
  sourceMaterial:
    "Use only the supplied workflow notes; do not invent subscriber counts, revenue, or studies.",
  postFormat: "Essay",
  outputLanguage: "English",
  postLength: "Standard: 1,000–1,600 words",
  callToAction: "Subscribe",
  titleDirection: "Direct and understated, with the phrase content workflow",
  editorialAngle:
    "The problem is not motivation; it is asking creators to rebuild the same decisions every week.",
  audienceKnowledge: "General audience",
  openingApproach: "Reader question",
  structurePreference: "Problem and response",
  depthLevel: "Balanced",
  includeCounterpoints: "On",
  endingStyle: "Practical next step",
  tone: "Clear and natural, reflective",
  pointOfView: "Mixed editorial voice",
  voiceSample:
    "I like practical essays that make one useful distinction and then show how it changes the work.",
  authorContext: "Solo founder building Creatornivo for content workflows.",
  termsToAvoid: "game-changing, unlock the power of, in today's fast-paced world",
  publicationName: "Creatornivo Notes, a publication about practical creator workflows",
  accessModel: "Free",
  previewBoundary:
    "Free readers should get the problem and first practical distinction before the paid framework.",
  paidOfferDetails:
    "Paid subscribers receive the complete workflow breakdown and monthly source notes.",
  emailSubjectStyle: "Direct and clear",
  urlSlug: "creator-content-workflow",
  tags: "creator economy, publishing systems, content workflow",
  claimsEvidence:
    "Claim: blank-page work creates repeat friction. Evidence: supplied product notes and user workflow observations only.",
  quotesAttribution:
    "Quote from approved interview notes: “The hard part is starting from zero every Monday.”",
  linksToInclude: "https://www.creatornivo.com/resources — creator workflow resources",
  disclosure: "Disclosure: I created Creatornivo.",
  sensitiveContext:
    "Avoid personal productivity claims that imply guaranteed mental-health or business outcomes.",
  additionalRequirements:
    "Use Markdown headings sparingly and avoid fake urgency, fake social proof, and invented metrics.",
};

const fieldRows = `
postTopic|Post topic|Essentials|textarea|yes|600 characters|Blank|What should the post be about?|Describe the subject, event, question, argument, or idea the post should cover.|The model cannot determine the intended subject from the template name alone.|
primaryGoal|Primary goal|Essentials|select|yes|32 characters|Inform or explain|Choose the main purpose|Select the single most important outcome the post should achieve.|The same topic requires a different structure depending on the intended reader outcome.|Inform or explain~Share analysis~Persuade readers~Tell a story~Build reader trust~Start a discussion~Drive subscriptions~Announce an update
targetAudience|Target readers|Essentials|textarea|yes|600 characters|Blank|Who should read this, and what do they already care about?|Describe the intended readers, their interests, situation, or level of familiarity.|Reader knowledge and motivation materially affect examples, terminology, depth, and framing.|
centralThesis|Central message|Essentials|textarea|yes|800 characters|Blank|What should readers understand, believe, or reconsider?|State the main argument, conclusion, lesson, or takeaway in plain language.|A long-form Substack post needs one controlling idea rather than an unfocused collection of points.|
keyPoints|Key points|Essentials|textarea|yes|1,500 characters|Blank|List the facts, arguments, examples, or sections that must appear.|Include the information that cannot be safely inferred or omitted.|It identifies the user-supplied substance that the final post must cover.|
sourceMaterial|Source material|Essentials|textarea|no|4,000 characters|Blank|Paste notes, research, drafts, references, interview material, or source excerpts.|Only supplied or independently verified information may be presented as factual.|It provides factual grounding and lets the template transform existing material without inventing evidence.|
postFormat|Post format|Essentials|select|no|32 characters|Auto|Choose a format|Select a format or let the model choose from the goal and material.|Substack supports several distinct editorial formats that require different content architecture.|Auto~Essay~Analysis~How-to guide~Personal story~Commentary~Curated roundup~Announcement or update~Interview or Q&A
outputLanguage|Output language|Essentials|text|yes|80 characters|English|English|Enter the language or regional language variant for the complete output.|Language cannot always be inferred reliably from the topic or source material.|
postLength|Post length|Essentials|select|no|32 characters|Platform appropriate|Choose a target length|Select a practical editorial range rather than an exact mandatory word count.|The intended depth and subscriber commitment materially affect the final post.|Platform appropriate~Short: 600–900 words~Standard: 1,000–1,600 words~Deep dive: 1,800–3,000 words~Custom from requirements
callToAction|Primary reader action|Essentials|select|no|32 characters|Auto|Choose one reader action|Select one proportionate action or allow the model to choose.|A Substack post should support one clear next step rather than several competing conversion goals.|Auto~Subscribe~Upgrade to paid~Comment~Reply by email~Share the post~Visit a supplied link~Reflect only~No CTA
titleDirection|Title direction|Essentials|text|no|200 characters|Blank|Example: direct, curious, analytical, understated, or include a phrase|Leave blank to generate accurate platform-appropriate title options automatically.|Titles strongly affect editorial positioning and email opens, while remaining optional for users without a preference.|
editorialAngle|Editorial angle|Editorial Shape|textarea|no|700 characters|Blank|What distinctive perspective should shape the post?|Use this for a specific lens, tension, interpretation, or position.|It helps differentiate the post when the general topic can support several valid approaches.|
audienceKnowledge|Reader knowledge level|Editorial Shape|select|no|32 characters|General audience|Choose reader familiarity|Controls terminology, explanation depth, and assumed background knowledge.|The same argument must be explained differently to beginners and specialists.|New to the topic~General audience~Informed readers~Specialist readers
openingApproach|Opening approach|Editorial Shape|select|no|32 characters|Auto|Choose how the post begins|Controls the first impression without requiring the user to write the opening.|The opening has a major effect on reader retention and may depend on the author’s preferred style.|Auto~Direct statement~Personal scene~Reader question~Surprising fact~Current event~Tension or contradiction~Short anecdote~Immediate takeaway
structurePreference|Structure preference|Editorial Shape|select|no|32 characters|Auto|Choose a content flow|Select a preferred progression or allow the model to build the most natural structure.|Structure materially changes how a long-form post develops and how easily it can be followed.|Auto~Narrative progression~Argument and evidence~Problem and response~Step-by-step~Thematic sections~Question and answer~Chronological
depthLevel|Content depth|Editorial Shape|select|no|32 characters|Balanced|Choose the level of depth|Controls context, nuance, examples, and treatment of implications.|Word count alone does not specify the expected analytical or explanatory depth.|Concise~Balanced~Detailed~Deep and nuanced
includeCounterpoints|Address counterpoints|Editorial Shape|toggle|no|1 character|Off|Not applicable|Include a strong objection, limitation, trade-off, or alternative explanation when relevant.|Some essays benefit from explicit counterarguments, while others become unnecessarily diluted by them.|Off~On
endingStyle|Ending style|Editorial Shape|select|no|32 characters|Auto|Choose how the post closes|Controls the emotional and editorial effect of the final paragraphs.|A reflective essay and a practical guide require different types of closure.|Auto~Clear takeaway~Reflective close~Practical next step~Open question~Forward-looking note~Brief summary
tone|Tone|Voice & Author Context|multi-select|no|100 characters|Clear and natural|Choose up to three qualities|Select only the qualities that should be consistently noticeable.|Substack is strongly author-driven, so tone materially affects whether the result feels authentic.|Clear and natural~Conversational~Analytical~Reflective~Warm~Direct~Witty~Serious~Provocative but fair
pointOfView|Point of view|Voice & Author Context|select|no|32 characters|Auto|Choose a narrative perspective|First person should be used only when supported by supplied author context.|Perspective changes the relationship between the writer, subject, and subscriber.|Auto~First person~Second person~Third person~Mixed editorial voice
voiceSample|Writing sample|Voice & Author Context|textarea|no|1,500 characters|Blank|Paste a short sample of the author’s natural writing.|The model should follow its broad rhythm and formality without copying phrases.|A supplied sample provides more reliable voice adaptation than numerous abstract style controls.|
authorContext|Author context|Voice & Author Context|textarea|no|1,200 characters|Blank|Relevant experience, perspective, role, relationship, or personal context|Include only details the author is comfortable presenting publicly.|It allows credible first-person framing without fabricating expertise or personal experience.|
termsToAvoid|Terms or styles to avoid|Voice & Author Context|textarea|no|800 characters|Blank|List unwanted phrases, clichés, framing, terminology, or stylistic habits.|Use one field for all brand, voice, and wording restrictions.|Specific prohibitions cannot always be inferred from positive tone selections.|
publicationName|Publication context|Publishing & Monetization|textarea|no|500 characters|Blank|Publication name, subject area, recurring series, or subscriber expectations|Provide only context that should subtly influence the post and packaging.|A post may need to fit an established publication, series, or reader relationship.|
accessModel|Post access|Publishing & Monetization|select|no|32 characters|Free|Choose who can read the post|Controls whether the output includes paid-reader framing or a free-preview marker.|Free, paid, and preview-based posts require materially different content boundaries and CTAs.|Free~Paid~Paid with free preview
previewBoundary|Free-preview boundary|Publishing & Monetization|textarea|no|700 characters|Blank|Describe what free readers should see before the paid section begins.|Leave blank to place the break after genuine value but before the strongest paid material.|The author may have a deliberate editorial or conversion boundary for free subscribers.|
paidOfferDetails|Paid subscriber value|Publishing & Monetization|textarea|no|800 characters|Blank|What do paid subscribers genuinely receive?|Include only real benefits, frequency, access, or membership details.|Any paid-upgrade language must be based on real supplied benefits rather than invented perks.|
emailSubjectStyle|Email subject style|Publishing & Monetization|select|no|32 characters|Auto|Choose an inbox style|Controls subject-line positioning without permitting deceptive framing.|Substack posts are also email messages, making inbox presentation part of the native output.|Auto~Direct and clear~Curiosity-led~Benefit-led~Editorial~Personal and understated
urlSlug|Preferred URL slug|Publishing & Monetization|text|no|48 characters|Blank|example-post-slug|Leave blank to generate a short lowercase slug from the recommended title.|A custom post URL may be important for clarity, sharing, and long-term discovery.|
tags|Tags or discovery terms|Publishing & Monetization|text|no|300 characters|Blank|Example: independent media, creator economy, online publishing|Add focused terms only; the output will suggest no more than five tags.|The author may use an existing publication taxonomy that cannot be inferred reliably.|
claimsEvidence|Claims and evidence|Facts, Sources & Restrictions|textarea|no|2,500 characters|Blank|List important claims with the evidence, data, or source supporting each one.|Unsupported material claims will be softened, omitted, or flagged.|It separates factual support from general notes and reduces invented or overstated claims.|
quotesAttribution|Quotes and attribution|Facts, Sources & Restrictions|textarea|no|2,000 characters|Blank|Paste approved quotes with speaker, source, and context.|A paraphrase will not be converted into a direct quotation.|Quotation wording and attribution require exact user-supplied information.|
linksToInclude|Links to include|Facts, Sources & Restrictions|textarea|no|2,000 characters|Blank|Paste approved URLs with a note explaining where each should lead.|No links or destinations will be invented.|The model must know the exact approved destinations for references or conversion actions.|
disclosure|Disclosure information|Facts, Sources & Restrictions|textarea|no|1,000 characters|Blank|Sponsorship, affiliate, employer, product, client, or other material relationship|Relevant commercial or personal interests should be disclosed clearly.|Transparent affiliation cannot be inferred and may be necessary for reader trust or compliance.|
sensitiveContext|Sensitive topic context|Facts, Sources & Restrictions|textarea|no|1,500 characters|Blank|Jurisdiction, risk, affected group, uncertainty, or wording that needs special care|Use for health, legal, financial, political, safety, child-related, or regulated topics.|High-stakes subjects may require jurisdictional or contextual details that cannot be safely inferred.|
additionalRequirements|Additional requirements|Facts, Sources & Restrictions|textarea|no|2,000 characters|Blank|Add any remaining instructions that materially affect the final result.|Use this single field for custom length, formatting, required wording, or special restrictions.|It supports legitimate uncommon requirements without creating numerous low-value fields.|
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

function parseMaxLength(raw, sourceType) {
  if (sourceType === "toggle") return undefined;
  const match = raw.match(/^([\d,]+)\s+(characters|character)$/);
  if (!match) return undefined;
  return Number(match[1].replace(/,/g, ""));
}

function adaptType(sourceType) {
  if (sourceType === "toggle") return "select";
  if (sourceType === "multi-select") return "textarea";
  return sourceType;
}

function helpAvoidFor(field) {
  if (
    [
      "sourceMaterial",
      "claimsEvidence",
      "quotesAttribution",
      "linksToInclude",
    ].includes(field.key)
  ) {
    return "Avoid invented studies, statistics, quotations, links, citations, attribution, or evidence that was not supplied.";
  }
  if (field.key === "authorContext" || field.key === "voiceSample") {
    return "Avoid fake first-person experience, invented credentials, copied private wording, or details the author would not publish.";
  }
  if (field.key === "accessModel" || field.key === "paidOfferDetails") {
    return "Avoid invented paid benefits, prices, deadlines, discounts, exclusivity, scarcity, trial terms, or subscriber perks.";
  }
  if (field.key === "disclosure") {
    return "Avoid hiding material relationships or implying independent neutrality when a sponsorship, affiliate, employer, product, client, or ownership connection exists.";
  }
  if (field.key === "sensitiveContext") {
    return "Avoid personalized medical, legal, financial, political, safety, tax, or regulated advice unless the supplied context supports safe general wording.";
  }
  if (field.required) {
    return "Avoid vague placeholders, unsupported claims, broad topics without a clear thesis, or changing the requested post into a different subject.";
  }
  return "Avoid guessed facts, fake urgency, fake scarcity, fabricated social proof, hidden advertising, engagement bait, or unsupported claims.";
}

function buildField(row) {
  const [
    key,
    label,
    groupTitle,
    sourceType,
    requiredRaw,
    maxLengthRaw,
    defaultRaw,
    placeholder,
    baseHint,
    why,
    rawOptions = "",
  ] = row.split("|");

  const required = requiredRaw === "yes";
  const type = adaptType(sourceType);
  const rawOptionList = rawOptions ? rawOptions.split("~") : undefined;
  const options =
    sourceType === "toggle"
      ? rawOptionList ?? ["Off", "On"]
      : type === "select"
        ? rawOptionList
        : undefined;
  const maxLength = parseMaxLength(maxLengthRaw, sourceType);
  const isMultiText = sourceType === "multi-select";
  const optionHint =
    isMultiText && rawOptionList
      ? ` Available options: ${rawOptionList.join(", ")}.`
      : "";
  const defaultValue =
    defaultRaw !== "Blank" && defaultValues[key] ? defaultValues[key] : undefined;

  const field = {
    key,
    label,
    group: groupIdsByTitle[groupTitle],
    groupTitle,
    type,
    required,
    placeholder: isMultiText
      ? `${placeholder}; or list up to three qualities separated by commas.`
      : placeholder,
    hint: `${baseHint}${optionHint}`,
    help: {
      what: required
        ? `Provide the ${label.toLowerCase()} for this Substack post.`
        : `Optional context for the ${label.toLowerCase()} field.`,
      why,
      example: `Good example: ${examples[key] ?? placeholder}`,
      avoid: helpAvoidFor({ key, required }),
    },
  };

  if (defaultValue) field.defaultValue = defaultValue;
  if (options) field.options = options;
  if (maxLength) field.maxLength = maxLength;
  if (showWhen[key]) field.showWhen = showWhen[key];
  if (sourceType === "textarea" || isMultiText || maxLength > 500) {
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
  slug: "substack-post",
  title: "Substack Post",
  fieldCount: variables.length,
  requiredKeys: variables
    .filter((variable) => variable.required)
    .map((variable) => variable.key),
  groups,
  variables,
};

if (schema.fieldCount !== 36) {
  throw new Error(`Expected 36 fields, got ${schema.fieldCount}`);
}

if (schema.requiredKeys.length !== 6) {
  throw new Error(`Expected 6 required fields, got ${schema.requiredKeys.length}`);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(schema, null, 2)}\n`);

console.log(
  `Wrote ${path.relative(root, outPath)} with ${variables.length} fields.`,
);
