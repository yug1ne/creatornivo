/**
 * Builds the Webinar Package form schema from the approved 44-field
 * specification. It verifies that every prompt variable has exactly one form
 * field before writing the form JSON.
 *
 * Usage: node scripts/build-webinar-package-form.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const promptPath = path.join(root, "prisma", "template-prompts", "webinar-package.txt");
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "webinar-package-variables.json",
);

const groups = [
  {
    id: "essentials",
    title: "Essentials",
    description:
      "Webinar subject, goal, audience, promise, teaching points, format, duration, CTA direction, language, brand, and presenter identity.",
    defaultOpen: true,
  },
  {
    id: "event_setup",
    title: "Event Setup",
    description:
      "Scheduling, hosting platform, registration destination, and presenter details when these are known.",
    defaultOpen: false,
  },
  {
    id: "content_engagement",
    title: "Content & Engagement",
    description:
      "Source material, agenda preferences, audience knowledge, interaction choices, evidence, and topic-specific compliance requirements.",
    defaultOpen: false,
  },
  {
    id: "brand_offer_promotion",
    title: "Brand, Offer & Promotion",
    description:
      "Tone, brand voice, registration-page depth, offer positioning, proof, objections, and visual direction.",
    defaultOpen: false,
  },
  {
    id: "follow_up_output_settings",
    title: "Follow-Up & Output Settings",
    description:
      "CTA destination, follow-up objective, replay access, post-webinar resources, sender identity, and desired script depth.",
    defaultOpen: false,
  },
];

const groupIdsByTitle = Object.fromEntries(
  groups.map((group) => [group.title, group.id]),
);

const defaultValues = {
  primaryGoal: "Educate the audience",
  webinarFormat: "Live webinar",
  webinarDuration: "60",
  primaryCta: "Auto",
  outputLanguage: "English",
  audienceKnowledge: "Mixed audience",
  interactionMethods: "Auto",
  topicSensitivity: "General topic",
  tone: "Clear and natural",
  registrationCopyLength: "Standard",
  offerType: "No commercial offer",
  followUpGoal: "Nurture attendees",
  followUpTiming: "Within 2–6 hours",
  replayAvailability: "Auto",
  outputDetail: "Detailed speaking notes",
};

const showWhen = {
  eventDate: {
    key: "webinarFormat",
    equals: ["Live webinar", "Recorded premiere"],
  },
  eventTime: {
    key: "webinarFormat",
    equals: ["Live webinar", "Recorded premiere"],
  },
  timeZone: {
    key: "webinarFormat",
    equals: ["Live webinar", "Recorded premiere"],
  },
  complianceNotes: { key: "topicSensitivity", notEquals: "General topic" },
  offerDetails: { key: "offerType", notEquals: "No commercial offer" },
};

const examples = {
  webinarTopic: "How small agencies can automate client reporting",
  primaryGoal: "Educate the audience",
  targetAudience:
    "Small agency owners and account managers who manually prepare recurring client updates.",
  audienceProblem:
    "They spend hours assembling reports and struggle to make results clear to clients.",
  corePromise:
    "Attendees will understand a practical workflow for clearer, faster client reporting.",
  keyTakeaways:
    "Map recurring reporting questions, choose the right metrics, build a repeatable agenda, and prepare a follow-up plan.",
  webinarFormat: "Live webinar",
  webinarDuration: "60",
  primaryCta: "Book a consultation",
  outputLanguage: "English",
  brandName: "Creatornivo",
  presenterName: "Alex Morgan",
  eventDate: "2026-08-20",
  eventTime: "3:00 PM",
  timeZone: "UTC+3",
  registrationUrl: "https://www.creatornivo.com/webinar",
  webinarPlatform: "Zoom",
  presenterRole: "Founder and content workflow strategist",
  presenterBio:
    "Founder building workflow tools for creators and small teams; use only approved credentials.",
  coPresenters: "Jordan Lee — moderator and Q&A support.",
  sourceMaterial:
    "Use only supplied product notes, agenda notes, screenshots, and approved customer-safe examples.",
  agendaInputs:
    "Opening, reporting problem, workflow framework, short demo, Q&A, and consultation CTA.",
  audienceKnowledge: "Basic familiarity",
  interactionMethods: "Live chat, Q&A, short exercises",
  audienceQuestions:
    "How much reporting detail is enough? What should be automated first?",
  evidenceAndExamples:
    "Use the approved example of replacing a manual weekly update with a reusable report outline.",
  topicSensitivity: "General topic",
  complianceNotes:
    "Avoid guaranteeing revenue, savings, or client retention improvements.",
  tone: "Clear and natural",
  brandVoice: "Helpful, precise, low-pressure, practical.",
  registrationCopyLength: "Standard",
  offerType: "Consultation",
  offerDetails:
    "Free 20-minute workflow consultation; no guaranteed outcomes; booking URL supplied separately.",
  socialProof:
    "Only use verified testimonials or results supplied here; otherwise omit proof.",
  objectionsToAddress:
    "Attendees may worry automation will make reports generic or too technical.",
  visualDirection:
    "Clean slides, simple workflow diagrams, and screenshots only when supplied.",
  ctaDestination: "https://www.creatornivo.com/contact",
  followUpGoal: "Book a consultation",
  followUpTiming: "Within 2–6 hours",
  replayAvailability: "7 days",
  postWebinarResource: "Reporting checklist PDF, if supplied.",
  emailSenderName: "Alex from Creatornivo",
  outputDetail: "Detailed speaking notes",
  additionalContext:
    "No fake urgency, fake scarcity, invented attendee counts, or unsupported product claims.",
};

const fieldRows = `
webinarTopic|Webinar topic|Essentials|text|yes|200|Blank|Example: How small agencies can automate client reporting|Enter the main subject, product, service, or transformation the webinar will cover.|The complete webinar package must be built around a clearly defined subject.|
primaryGoal|Primary webinar goal|Essentials|select|yes|40|Educate the audience|Select the main goal|Choose the most important result the webinar should support.|The goal determines the webinar structure, CTA emphasis, and registration-page positioning.|Educate the audience~Generate qualified leads~Demonstrate a product~Sell an offer~Onboard customers~Build authority~Grow a community~Deliver internal training~Other
targetAudience|Target audience|Essentials|textarea|yes|700|Blank|Describe who should attend, including role, experience, industry, or situation.|Focus on the people the webinar is specifically designed to help.|Audience context controls terminology, examples, depth, objections, and promotional messaging.|
audienceProblem|Audience problem|Essentials|textarea|yes|700|Blank|What problem, frustration, uncertainty, or missed opportunity brings them here?|Describe the current situation the webinar should help the audience improve.|The registration promise and teaching sequence need a specific audience problem.|
corePromise|Core webinar promise|Essentials|textarea|yes|500|Blank|What should attendees understand, achieve, or be able to do afterward?|Use a realistic outcome rather than a guaranteed result.|The promise anchors the title, registration copy, opening, agenda, and closing.|
keyTakeaways|Key takeaways|Essentials|textarea|yes|1500|Blank|List the main lessons, methods, decisions, or steps attendees should receive.|Three to six concrete takeaways usually work well.|The content plan cannot be accurately created without the intended learning outcomes.|
webinarFormat|Webinar format|Essentials|select|yes|30|Live webinar|Select a format|This controls scheduling language, interaction, replay wording, and presenter notes.|Live, evergreen, and premiered webinars require different presentation and registration language.|Live webinar~Recorded evergreen webinar~Recorded premiere
webinarDuration|Planned duration|Essentials|number|no|3|60|60|Enter the total planned duration in minutes, including the CTA and Q&A.|Duration determines the number of segments, pacing, slides, examples, and interaction moments.|
primaryCta|Primary CTA|Essentials|text|no|180|Auto|Example: Book a consultation or start a free trial|Use Auto to let the model choose a suitable next step from the supplied goal.|A webinar should lead toward one clear and proportionate next action.|
outputLanguage|Output language|Essentials|text|yes|60|English|Example: English, Ukrainian, German, or Spanish|All public-facing webinar content will be created in this language.|The output language cannot always be safely inferred from the topic.|
brandName|Brand or company|Essentials|text|no|160|Blank|Enter the organization, product, or brand name|Leave blank when the webinar is presented independently.|The brand name may be required in registration copy, introductions, CTAs, and emails.|
presenterName|Presenter name|Essentials|text|no|120|Blank|Enter the host or main presenter name|Leave blank to use neutral presenter references without inventing a name.|A supplied presenter name allows accurate introductions, biographies, and email sign-offs.|
eventDate|Event date|Event Setup|date|no|10|Blank|Example: 2026-08-20|Used only for scheduled live events or recorded premieres.|Registration copy needs the actual date when the event occurs at a scheduled time.|
eventTime|Event time|Event Setup|text|no|40|Blank|Example: 3:00 PM|Enter the scheduled start time in the format your audience expects.|Scheduled-event copy must display the correct time without inventing it.|
timeZone|Time zone|Event Setup|text|no|80|Blank|Example: EET, UTC+3, or America/New_York|Include a time zone whenever attendees may be in different locations.|Time-zone clarity prevents misleading or ambiguous event scheduling.|
registrationUrl|Registration URL|Event Setup|url|no|500|Blank|https://www.creatornivo.com/webinar|Used in registration, confirmation, reminder, or promotional references when relevant.|A real destination can be included without fabricating a registration link.|
webinarPlatform|Hosting platform|Event Setup|text|no|120|Blank|Example: Zoom, Google Meet, Teams, YouTube, or a custom platform|Used only when platform-specific participation instructions are needed.|The hosting environment may affect joining instructions, interaction options, and terminology.|
presenterRole|Presenter role|Event Setup|text|no|160|Blank|Example: Product strategist, founder, researcher, or customer success lead|Describe the presenter’s relevant role without adding unsupported credentials.|The presenter’s actual role helps establish relevant context and authority.|
presenterBio|Presenter bio and credentials|Event Setup|textarea|no|1200|Blank|Add approved experience, qualifications, achievements, and relevant background.|Only include credentials and claims that can be publicly used.|Registration pages often need a factual presenter section, but credentials must not be invented.|
coPresenters|Additional presenters|Event Setup|textarea|no|1200|Blank|List names, roles, and speaking responsibilities for any additional presenters.|Leave blank for a single-presenter webinar.|Multiple presenters require accurate introductions and clear segment ownership.|
sourceMaterial|Source material|Content & Engagement|textarea|no|4000|Blank|Paste approved facts, notes, research, product details, links, or existing content.|Use this for information the model must rely on rather than infer.|Source material improves factual accuracy and prevents unsupported content.|
agendaInputs|Agenda preferences|Content & Engagement|textarea|no|1500|Blank|List required sections, demonstrations, exercises, stories, or discussion topics.|Leave blank to let the model build the agenda from the promised takeaways.|Some webinars have required segments that cannot be safely inferred.|
audienceKnowledge|Audience knowledge level|Content & Engagement|select|no|30|Mixed audience|Select the expected level|Controls terminology, explanations, examples, and assumed background knowledge.|The same subject requires substantially different explanations at different knowledge levels.|Complete beginners~Basic familiarity~Intermediate~Advanced~Mixed audience
interactionMethods|Interaction methods|Content & Engagement|multi-select|no|120|Auto|Choose interaction formats|Select only methods supported by the planned webinar environment.|Interaction choices affect pacing, presenter transitions, and the run of show.|Auto~Live chat~Polls~Q&A~Short exercises~Breakout discussion~Knowledge quiz~No interaction
audienceQuestions|Likely audience questions|Content & Engagement|textarea|no|1200|Blank|Add common questions, concerns, misunderstandings, or objections.|Used to prepare Q&A prompts and strengthen the teaching sequence.|Known audience questions help make the webinar more useful and relevant.|
evidenceAndExamples|Evidence and examples|Content & Engagement|textarea|no|2000|Blank|Add approved data, examples, demonstrations, case details, or quotations.|Unsupported statistics, testimonials, and results will not be invented.|Specific proof and examples must come from supplied, approved information.|
topicSensitivity|Topic sensitivity|Content & Engagement|select|no|40|General topic|Select when special care is required|This activates cautious wording and relevant verification reminders.|High-stakes subjects require stricter claim handling and appropriate limitations.|General topic~Health or medical~Legal~Financial or investment~Safety or technical~Employment or HR~Political or public policy~Child-related~Other regulated topic
complianceNotes|Compliance requirements|Content & Engagement|textarea|no|2000|Blank|Add jurisdiction, approved disclaimer, prohibited claims, or review requirements.|Provide only requirements that actually apply to this webinar.|Regulated content may require jurisdiction-specific language that the model cannot safely infer.|
tone|Tone|Brand, Offer & Promotion|select|no|40|Clear and natural|Select the preferred tone|The model will keep the tone appropriate for both speaking and registration copy.|Tone materially changes the registration copy and presenter delivery style.|Clear and natural~Conversational~Educational~Warm and supportive~Energetic~Expert~Executive~Technical~Persuasive but restrained
brandVoice|Brand voice|Brand, Offer & Promotion|textarea|no|1000|Blank|Describe preferred vocabulary, personality, rhythm, and phrases to avoid.|Leave blank for a natural, professional, non-corporate voice.|Established brands may require a voice that cannot be inferred from the topic alone.|
registrationCopyLength|Registration page length|Brand, Offer & Promotion|select|no|20|Standard|Select the preferred depth|Controls the depth of the public registration-page copy.|A simple event page and a high-consideration webinar need different copy depth.|Concise~Standard~Detailed
offerType|Webinar offer type|Brand, Offer & Promotion|select|no|40|No commercial offer|Select what follows the webinar|Choose the offer or next step presented during the CTA section.|The CTA structure depends on whether the webinar teaches only or introduces an offer.|No commercial offer~Free resource~Consultation~Product or service~Course or program~Membership~Trial or demo~Another event~Other
offerDetails|Offer details|Brand, Offer & Promotion|textarea|no|2000|Blank|Describe the offer, price, inclusions, eligibility, availability, and approved terms.|Only supplied pricing, deadlines, bonuses, and results may be mentioned.|Accurate CTA copy requires the actual offer details and limitations.|
socialProof|Approved social proof|Brand, Offer & Promotion|textarea|no|1500|Blank|Add verified testimonials, results, client names, ratings, or adoption data.|Leave blank rather than asking the model to create proof.|Social proof is useful only when genuine, approved evidence has been supplied.|
objectionsToAddress|Objections to address|Brand, Offer & Promotion|textarea|no|1200|Blank|List concerns that may prevent registration, participation, trust, or action.|The model will answer objections without using pressure or fear.|Known objections influence registration copy, teaching emphasis, and CTA framing.|
visualDirection|Visual direction|Brand, Offer & Promotion|textarea|no|1200|Blank|Describe preferred slide style, brand visuals, diagrams, demos, or imagery.|Used for presentation guidance, not for inventing unsupported visual evidence.|Webinars benefit from presentation-specific visual planning when preferences exist.|
ctaDestination|CTA destination URL|Follow-Up & Output Settings|url|no|500|Blank|https://www.creatornivo.com/next-step|Leave blank to describe the action without inventing a destination.|The webinar and follow-up email may need a real destination for the primary CTA.|
followUpGoal|Follow-up goal|Follow-Up & Output Settings|select|no|40|Nurture attendees|Select the main follow-up objective|Controls the focus of the post-webinar email.|The follow-up message should support one clear next step rather than several competing goals.|Deliver the replay~Nurture attendees~Book a consultation~Encourage a purchase~Start a trial or demo~Deliver a resource~Join a community~Register for another event
followUpTiming|Follow-up timing|Follow-Up & Output Settings|select|no|30|Within 2–6 hours|Select the recommended send time|Used in the delivery recommendation, not as a fabricated scheduled event.|Timing affects the framing and urgency of the follow-up email.|Immediately~Within 2–6 hours~The next day~Within 2–3 days~Custom timing
replayAvailability|Replay availability|Follow-Up & Output Settings|select|no|30|Auto|Select the replay policy|Choose an actual replay window or let the model avoid making a specific claim.|Replay wording must not invent access, scarcity, or expiration dates.|Auto~No replay~24 hours~3 days~7 days~Ongoing access
postWebinarResource|Post-webinar resource|Follow-Up & Output Settings|textarea|no|1000|Blank|Describe any checklist, workbook, slides, template, recording, or bonus resource.|Only resources that actually exist will be included.|A supplied resource may shape both the closing and the follow-up email.|
emailSenderName|Follow-up sender name|Follow-Up & Output Settings|text|no|120|Blank|Enter the person or brand sending the email|Falls back to the presenter or brand name when available.|A real sender identity improves clarity and prevents invented attribution.|
outputDetail|Presenter content depth|Follow-Up & Output Settings|select|no|40|Detailed speaking notes|Select the preferred script depth|Controls whether the presentation section contains an outline, notes, or fuller narration.|Different presenters need substantially different levels of scripting support.|Concise outline~Detailed speaking notes~Full presenter script
additionalContext|Additional context|Follow-Up & Output Settings|textarea|no|2000|Blank|Add any remaining requirements, restrictions, terminology, or background.|Use this only for information not already covered by another field.|A single controlled field handles relevant edge cases without expanding the form unnecessarily.|
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
  if (sourceType === "date") return { type: "text" };
  if (sourceType === "multi-select") return { type: "textarea" };
  return { type: sourceType };
}

function helpAvoidFor(field) {
  if (
    [
      "sourceMaterial",
      "evidenceAndExamples",
      "socialProof",
      "offerDetails",
      "presenterBio",
      "coPresenters",
    ].includes(field.key)
  ) {
    return "Avoid invented facts, credentials, testimonials, results, prices, deadlines, examples, links, offers, or presenter details that were not supplied.";
  }
  if (field.key === "topicSensitivity" || field.key === "complianceNotes") {
    return "Avoid personalized medical, legal, financial, employment, political, child-safety, or regulated advice unless supplied review requirements support safe general wording.";
  }
  if (field.key === "registrationUrl" || field.key === "ctaDestination") {
    return "Avoid invented, shortened, unapproved, or misleading URLs.";
  }
  if (field.key === "replayAvailability") {
    return "Avoid claiming replay access, expiration, scarcity, or ongoing availability unless it is confirmed.";
  }
  if (field.required) {
    return "Avoid vague placeholders, unsupported promises, guaranteed outcomes, fake urgency, or changing the webinar into a different topic.";
  }
  return "Avoid guessed facts, fake scarcity, fake attendee counts, hidden promotion, manipulative pressure, or unsupported claims.";
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
  const options =
    adapted.type === "select" && rawOptions ? rawOptions.split("~") : undefined;
  const maxLength = Number(maxLengthRaw);
  const isMultiText = sourceType === "multi-select";
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
      ? `${placeholder}; or list supported methods separated by commas.`
      : placeholder,
    hint: `${baseHint}${optionHint}`,
    help: {
      what: required
        ? `Provide the ${label.toLowerCase()} for this webinar package.`
        : `Optional context for the ${label.toLowerCase()} field.`,
      why,
      example: `Good example: ${examples[key] ?? placeholder}`,
      avoid: helpAvoidFor({ key, required }),
    },
  };

  if (adapted.format) field.format = adapted.format;
  if (defaultValue) field.defaultValue = defaultValue;
  if (options) field.options = options;
  if (Number.isFinite(maxLength)) field.maxLength = maxLength;
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
  slug: "webinar-package",
  title: "Webinar Package",
  fieldCount: variables.length,
  requiredKeys: variables
    .filter((variable) => variable.required)
    .map((variable) => variable.key),
  groups,
  variables,
};

if (schema.fieldCount !== 44) {
  throw new Error(`Expected 44 fields, got ${schema.fieldCount}`);
}

if (schema.requiredKeys.length !== 8) {
  throw new Error(`Expected 8 required fields, got ${schema.requiredKeys.length}`);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(schema, null, 2)}\n`);

console.log(
  `Wrote ${path.relative(root, outPath)} with ${variables.length} fields.`,
);
