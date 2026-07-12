/**
 * Builds the Indie Hackers Post form schema from the approved 24-field
 * specification. It verifies that every prompt variable has exactly one form
 * field before writing the form JSON.
 *
 * Usage: node scripts/build-indie-hackers-post-form.mjs
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
  "indie-hackers-post.txt",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "indie-hackers-post-variables.json",
);

const groups = [
  {
    id: "essentials",
    title: "Essentials",
    description:
      "Post type, project context, readers, post goal, central story, relationship, stage, language, and desired depth.",
    defaultOpen: true,
  },
  {
    id: "story_evidence",
    title: "Story & Evidence",
    description:
      "Founder background, timeline, challenges, lessons, metrics, and references that make the post concrete and credible.",
    defaultOpen: false,
  },
  {
    id: "voice_community_fit",
    title: "Voice & Community Fit",
    description:
      "Tone, transparency, title direction, formatting, and the question used to invite useful founder discussion.",
    defaultOpen: false,
  },
  {
    id: "promotion_safeguards",
    title: "Promotion & Safeguards",
    description:
      "Promotion level, optional project link, and final restrictions that prevent disguised advertising or unsupported claims.",
    defaultOpen: false,
  },
];

const groupIdsByTitle = Object.fromEntries(
  groups.map((group) => [group.title, group.id]),
);

const defaultValues = {
  postType: "Build update",
  primaryGoal: "Share useful progress",
  relationshipToProject: "Founder or builder",
  buildStage: "Building",
  desiredLength: "Auto",
  outputLanguage: "English",
  tone: "Clear and candid",
  transparencyLevel: "Balanced",
  titleApproach: "Auto",
  formattingPreference: "Auto",
  promotionLevel: "Mention only",
};

const showWhen = {
  projectUrl: {
    key: "promotionLevel",
    equals: ["Soft link", "Direct feedback invitation"],
  },
};

const examples = {
  postType: "Build update",
  projectOrTopic: "Creatornivo, a content-template platform",
  projectSummary:
    "A structured AI workspace that helps creators turn briefs into platform-ready content.",
  primaryGoal: "Share useful progress",
  targetReaders:
    "Solo SaaS founders struggling to validate an early product without fake launch hype.",
  coreStory:
    "We replaced generic prompts with structured template forms and learned that field quality matters more than template count.",
  relationshipToProject: "Founder or builder",
  buildStage: "Private beta",
  desiredLength: "Medium",
  outputLanguage: "English",
  founderBackground:
    "Solo founder building a content workflow product while validating with a small beta audience.",
  contextTimeline:
    "Started with a simple generator, audited weak templates, and migrated the first batch over two weeks.",
  challengesMistakes:
    "We almost shipped fake-looking social proof and too many vague template fields.",
  lessonsLearned:
    "Prompt quality is only useful when every variable has a clear field and examples.",
  metricsEvidence:
    "Use only confirmed metrics here, such as 15 migrated templates or 5 daily free generations.",
  sourceLinks:
    "Approved changelog, public post, or product page: https://www.creatornivo.com",
  tone: "Clear and candid",
  transparencyLevel: "Balanced",
  titleApproach: "Lesson-led",
  formattingPreference: "Short paragraphs, bullet points",
  discussionQuestion:
    "How do you decide when a feature is useful enough to ship without extra polish?",
  promotionLevel: "Mention only",
  projectUrl: "https://www.creatornivo.com",
  additionalRequirements:
    "No fake MRR, users, quotes, launch results, or disguised promotion.",
};

const fieldRows = `
postType|Post type|Essentials|select|yes|0|Build update|Select the kind of post|Choose the structure that best matches what you want to share.|Different founder stories require materially different structures and closing questions.|Build update~Lesson learned~Feedback request~Milestone~Postmortem~Launch story~Question or discussion
projectOrTopic|Project or topic|Essentials|text|yes|160|Blank|Example: Creatornivo, a content-template platform|Enter the project name or the specific founder topic being discussed.|The model needs a clear subject around which to build the post.|
projectSummary|What are you building?|Essentials|textarea|yes|700|Blank|Describe what it does, who it helps, and its current state.|Give readers enough context to understand the project without opening a link.|The project’s function and value cannot be safely inferred from its name alone.|
primaryGoal|Goal of this post|Essentials|select|yes|0|Share useful progress|Select the main outcome|Choose one primary goal so the post remains focused.|The goal determines what information receives emphasis and how the post closes.|Share useful progress~Teach a lesson~Get practical feedback~Start a discussion~Explain a milestone~Analyze a failure~Introduce a launch
targetReaders|Who should read it?|Essentials|textarea|yes|400|Blank|Example: solo SaaS founders struggling to validate an early product|Describe the builders most likely to benefit or provide useful feedback.|Audience context changes terminology, examples, depth, and the discussion question.|
coreStory|Main story or message|Essentials|textarea|yes|1200|Blank|Explain what happened, what changed, or what you want to discuss.|Focus on the specific event, decision, realization, or question behind the post.|This is the unique factual and narrative foundation of the post.|
relationshipToProject|Your relationship|Essentials|select|no|0|Founder or builder|Select your relationship|Used to present your connection transparently and avoid disguised promotion.|Community posts must not misrepresent a commercial or professional affiliation.|Founder or builder~Team member~Advisor or investor~Affiliate or partner~Independent user~Industry observer
buildStage|Current stage|Essentials|select|no|0|Building|Select the current stage|Helps frame expectations, evidence, and next steps realistically.|Stage controls proof, limitations, and what kind of feedback is appropriate.|Idea~Validating~Building~Private beta~Public launch~Growing~Paused or closed
desiredLength|Post length|Essentials|select|no|0|Auto|Select the preferred depth|Auto lets the model choose the length that best fits the story.|Length affects how much context, evidence, and explanation should appear.|Auto~Short~Medium~Detailed
outputLanguage|Output language|Essentials|select|no|0|English|Select output language|Generate the post package in the selected language.|The output language should match the intended community audience.|English~Ukrainian~Russian~Spanish~German~French~Portuguese~Italian
founderBackground|Relevant background|Story & Evidence|textarea|no|500|Blank|Share only background that helps readers understand the decision or lesson.|Leave blank when background is not relevant.|Background can add credibility when it explains context without becoming a biography.|
contextTimeline|Context and timeline|Story & Evidence|textarea|no|800|Blank|Add key dates, sequence of events, or what happened before and after.|Use approximate timing if exact dates are not important or not confirmed.|Timeline helps readers understand cause, order, and tradeoffs.|
challengesMistakes|Challenges and mistakes|Story & Evidence|textarea|no|1000|Blank|Describe constraints, wrong assumptions, failed attempts, or unresolved issues.|Be specific without dramatizing or blaming others.|Honest challenges make the post useful instead of promotional.|
lessonsLearned|Lessons learned|Story & Evidence|textarea|no|1000|Blank|List the practical takeaways other founders can apply.|Focus on transferable learning rather than generic motivation.|Lessons are what make the post valuable even without clicking a product link.|
metricsEvidence|Metrics or evidence|Story & Evidence|textarea|no|1200|Blank|Add only confirmed metrics, results, screenshots, quotes, or evidence.|Include definitions, timeframe, denominator, and uncertainty when relevant.|Metrics and evidence strengthen the post only when they are accurate and contextualized.|
sourceLinks|Sources or references|Story & Evidence|textarea|no|1500|Blank|Paste approved links, references, posts, docs, or public sources.|Do not include private or unverified sources.|Source links can support claims, but the model must not invent them.|
tone|Writing tone|Voice & Community Fit|select|no|0|Clear and candid|Select the writing tone|Choose a tone that feels natural for a founder-community post.|Tone controls whether the post reads as candid, analytical, reflective, or conversational.|Clear and candid~Conversational~Reflective~Analytical~Humble and open~Direct and concise~Lightly humorous
transparencyLevel|Transparency level|Voice & Community Fit|select|no|0|Balanced|Select transparency depth|Choose how openly the post should discuss limits, uncertainty, and setbacks.|Indie Hackers posts work best when transparent without exposing private or unsafe details.|Reserved~Balanced~Very open~Auto
titleApproach|Title approach|Voice & Community Fit|select|no|0|Auto|Select title direction|Choose the type of title angle or let the model infer it.|Title direction changes whether the post leads with a result, lesson, question, or story.|Auto~Lesson-led~Result-led~Question-led~Story-led
formattingPreference|Formatting preference|Voice & Community Fit|multi-select|no|0|Auto|Choose formatting preferences|Select preferred structure, or leave Auto for a readable founder-community layout.|Formatting affects scanability and whether the post uses headings, bullets, or narrative flow.|Auto~Short paragraphs~Section headings~Bullet points~Chronological flow~Narrative-first
discussionQuestion|Question for readers|Voice & Community Fit|textarea|no|400|Blank|Add one specific question you want the community to answer.|Leave blank when no discussion question is needed.|A focused question invites useful replies without engagement bait.|
promotionLevel|Project promotion|Promotion & Safeguards|select|no|0|Mention only|Select how much project promotion is appropriate|Control whether the post omits links, mentions the project, or asks for direct feedback.|Promotion level prevents the post from becoming a disguised ad or link drop.|No promotion~Mention only~Soft link~Direct feedback invitation
projectUrl|Project URL|Promotion & Safeguards|URL|no|500|Blank|https://www.creatornivo.com|Shown only when promotion level allows a link.|A supplied URL can be included once without inventing or requesting a link.|
additionalRequirements|Additional requirements|Promotion & Safeguards|textarea|no|2000|Blank|Add final restrictions, must-use wording, claims to avoid, or special context.|Use this for requirements not already covered by another field.|A controlled final field handles edge cases without adding unnecessary form inputs.|
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
  if (sourceType === "URL") return { type: "text", format: "url" };
  if (sourceType === "multi-select") return { type: "textarea" };
  return { type: sourceType };
}

function helpAvoidFor(field) {
  if (["metricsEvidence", "sourceLinks"].includes(field.key)) {
    return "Avoid invented metrics, customer quotes, sources, screenshots, links, benchmarks, or unsupported validation.";
  }
  if (field.key === "projectUrl") {
    return "Avoid invented, unrelated, affiliate, shortened, or misleading URLs.";
  }
  if (field.key === "relationshipToProject" || field.key === "promotionLevel") {
    return "Avoid disguising commercial relationships, pretending independence, link dumping, or asking for votes, signups, praise, or traffic.";
  }
  if (field.required) {
    return "Avoid vague placeholders, generic startup stories, fake vulnerability, fake success metrics, or changing the post into an ad.";
  }
  return "Avoid guessed facts, fake traction, fake community demand, confidential details, manipulative CTAs, or unsupported founder claims.";
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
  const adapted = adaptType(sourceType);
  const isMultiText = sourceType === "multi-select";
  const options =
    adapted.type === "select" && rawOptions ? rawOptions.split("~") : undefined;
  const maxLength = Number(maxLengthRaw);
  const optionHint =
    isMultiText && rawOptions
      ? ` Available options: ${rawOptions.split("~").join(", ")}.`
      : "";
  const defaultValue =
    defaultRaw !== "Blank" && defaultValues[key] ? defaultValues[key] : undefined;

  const field = {
    key,
    label,
    group: groupIdsByTitle[groupTitle],
    groupTitle,
    type: adapted.type,
    required,
    placeholder: isMultiText
      ? `${placeholder}; or list preferences separated by commas.`
      : placeholder,
    hint: `${baseHint}${optionHint}`,
    help: {
      what: required
        ? `Provide the ${label.toLowerCase()} before generating the Indie Hackers post.`
        : `Optional context for the ${label.toLowerCase()} field.`,
      why,
      example: `Good example: ${examples[key] ?? placeholder}`,
      avoid: helpAvoidFor({ key, required }),
    },
  };

  if (adapted.format) field.format = adapted.format;
  if (defaultValue) field.defaultValue = defaultValue;
  if (options) field.options = options;
  if (Number.isFinite(maxLength) && maxLength > 0) field.maxLength = maxLength;
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
  slug: "indie-hackers-post",
  title: "Indie Hackers Post",
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
