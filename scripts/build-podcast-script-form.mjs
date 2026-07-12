/**
 * Builds the Podcast Script form schema from the approved 44-field
 * specification. It verifies that every prompt variable has exactly one form
 * field before writing the form JSON.
 *
 * Usage: node scripts/build-podcast-script-form.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const promptPath = path.join(root, "prisma", "template-prompts", "podcast-script.txt");
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "podcast-script-variables.json",
);

const groups = [
  {
    id: "essentials",
    title: "Essentials",
    description:
      "Episode subject, objective, audience, core content, format, language, target duration, host identity, podcast identity, listener action, and source material.",
    defaultOpen: true,
  },
  {
    id: "episode_structure",
    title: "Episode Structure",
    description:
      "Script depth, opening, segment count, required sections, examples, transitions, listener interaction, and recurring show elements.",
    defaultOpen: false,
  },
  {
    id: "voice_delivery",
    title: "Voice & Delivery",
    description:
      "Host voice, pacing, energy, language complexity, humor, pronunciation guidance, and words or phrases to avoid.",
    defaultOpen: false,
  },
  {
    id: "guests_sponsors_conversion",
    title: "Guests, Sponsors & Conversion",
    description:
      "Guest participation, interview boundaries, sponsor messages, sponsor placement, and CTA details.",
    defaultOpen: false,
  },
  {
    id: "publishing_discovery_safety",
    title: "Publishing, Discovery & Safety",
    description:
      "Publishing context, series continuity, sensitive-content handling, show notes, discovery keywords, links, and additional requirements.",
    defaultOpen: false,
  },
];

const groupIdsByTitle = Object.fromEntries(
  groups.map((group) => [group.title, group.id]),
);

const defaultValues = {
  primaryGoal: "Educate or explain",
  episodeFormat: "Solo monologue",
  outputLanguage: "English",
  episodeLength: "20–40 minutes",
  desiredListenerAction: "Auto",
  scriptDepth: "Hybrid script",
  openingStyle: "Auto",
  segmentCount: "4",
  transitionStyle: "Natural and subtle",
  audienceInteraction: "Auto",
  tone: "Clear and natural",
  pacing: "Balanced",
  energyLevel: "Moderate",
  readingLevel: "General audience",
  humorLevel: "Light when natural",
  hasGuest: "Off",
  interviewQuestionCount: "10",
  hasSponsor: "Off",
  sponsorPlacement: "Mid-roll",
  episodeContext: "Evergreen episode",
  contentRisk: "General content",
  showNotesLevel: "Standard",
};

const showWhen = {
  guestDetails: { key: "hasGuest", equals: "On" },
  guestTopicsAndBoundaries: { key: "hasGuest", equals: "On" },
  interviewQuestionCount: { key: "hasGuest", equals: "On" },
  sponsorBrief: { key: "hasSponsor", equals: "On" },
  sponsorPlacement: { key: "hasSponsor", equals: "On" },
  seriesContext: { key: "episodeContext", equals: "Series episode" },
  jurisdiction: {
    key: "contentRisk",
    equals: [
      "Legal",
      "Financial or tax",
      "Political or current events",
      "Regulated products",
    ],
  },
};

const examples = {
  episodeTopic: "Why small creators struggle to stay consistent",
  primaryGoal: "Educate or explain",
  targetAudience:
    "Solo creators who understand content strategy but struggle to keep a weekly publishing rhythm.",
  coreMessage:
    "A repeatable content workflow beats rebuilding every prompt from scratch.",
  keyPoints:
    "Templates reduce decision fatigue, saved prompts preserve what works, and consistency improves when the workflow is simple.",
  episodeFormat: "Solo monologue",
  outputLanguage: "English",
  episodeLength: "20–40 minutes",
  hostName: "Alex Morgan",
  podcastName: "The Independent Creator Show",
  desiredListenerAction: "Follow or subscribe",
  sourceMaterial:
    "Use only the supplied workflow notes; do not invent creator counts, revenue, or research.",
  scriptDepth: "Hybrid script",
  openingStyle: "Provocative question",
  segmentCount: "4",
  mustIncludeSections: "Opening hook, main discussion, key takeaways, closing outro",
  requiredStoriesExamples:
    "Use the approved example of a creator saving three reusable prompt formats.",
  transitionStyle: "Conversational callbacks",
  audienceInteraction: "Reflection question, comment prompt",
  recurringElements: "End each episode with one practical workflow question.",
  tone: "Clear and natural",
  hostVoice:
    "Practical, warm, slightly wry; short sentences around important points.",
  pacing: "Balanced",
  energyLevel: "Moderate",
  readingLevel: "General audience",
  humorLevel: "Light when natural",
  pronunciationNotes: "Creatornivo: creator-NEE-voh",
  phrasesToAvoid: "game-changing, unlock the power of, in today's fast-paced world",
  hasGuest: "Off",
  guestDetails:
    "Jordan Lee, independent newsletter operator, approved intro: writes about sustainable creator workflows.",
  guestTopicsAndBoundaries:
    "Ask about repeatable systems; avoid revenue, private clients, and unapproved metrics.",
  interviewQuestionCount: "8",
  hasSponsor: "Off",
  sponsorBrief:
    "Sponsor: Creatornivo. Approved message: structured AI templates for consistent publishing. URL: https://www.creatornivo.com",
  sponsorPlacement: "Mid-roll",
  ctaDetails: "Visit https://www.creatornivo.com to try the free templates.",
  episodeContext: "Evergreen episode",
  seriesContext:
    "Part two of a three-part series about turning scattered ideas into a publishing workflow.",
  contentRisk: "General content",
  jurisdiction: "United States",
  showNotesLevel: "Standard",
  discoveryKeywords: "creator workflow, content consistency, prompt library",
  linksAndResources: "https://www.creatornivo.com/resources",
  additionalRequirements:
    "Avoid fake urgency, fake testimonials, unsupported results, and invented customer stories.",
};

const fieldRows = `
episodeTopic|Episode topic|Essentials|text|yes|200 characters|Blank|Example: Why small creators struggle to stay consistent|State the main subject or question the episode should explore.|The model cannot determine the episode’s central subject without user input.|
primaryGoal|Primary goal|Essentials|select|yes|40 characters|Educate or explain|Select the main purpose|Choose the most important result the episode should achieve.|The same topic requires a different structure depending on the intended outcome.|Educate or explain~Entertain~Inspire or motivate~Share a story~Build authority~Promote an offer~Interview or explore~Discuss current events
targetAudience|Target listeners|Essentials|textarea|yes|700 characters|Blank|Who are they, what do they know, and why would they listen?|Describe the intended listeners, their knowledge level, interests, or challenges.|Audience knowledge and motivation materially affect language, examples, depth, and pacing.|
coreMessage|Core message|Essentials|textarea|yes|800 characters|Blank|What should listeners understand, feel, or remember afterward?|Summarize the episode’s main takeaway in one or two clear ideas.|A defined takeaway prevents the episode from becoming unfocused.|
keyPoints|Key points and facts|Essentials|textarea|yes|1,500 characters|Blank|List the arguments, facts, examples, steps, or questions that must appear.|Include the essential material the script must cover.|These details determine the factual substance and progression of the episode.|
episodeFormat|Episode format|Essentials|select|yes|32 characters|Solo monologue|Select a format|Choose the format that best matches how the episode will be recorded.|Each podcast format requires a different script architecture and speaker treatment.|Solo monologue~Interview~Co-hosted discussion~Educational tutorial~Narrative storytelling~Panel discussion~News or commentary~Hybrid format
outputLanguage|Output language|Essentials|text|yes|80 characters|English|Example: English, Ukrainian, Spanish|Specify the language in which the complete output should be written.|The recording script and supporting material must use the user’s publishing language.|
episodeLength|Target duration|Essentials|select|yes|24 characters|20–40 minutes|Select the target length|The script will use an approximate spoken-word target rather than an exact runtime guarantee.|Duration determines script depth, segment timing, question count, and approximate word count.|5–10 minutes~10–20 minutes~20–40 minutes~40–60 minutes~More than 60 minutes~Let the model decide
hostName|Host name|Essentials|text|no|120 characters|Blank|Example: Alex Morgan|Used in the introduction and closing when appropriate.|A supplied host name makes the spoken introduction usable without manual replacement.|
podcastName|Podcast name|Essentials|text|no|120 characters|Blank|Example: The Independent Creator Show|Leave blank when the show name should not be mentioned.|The show name may be required for a recording-ready introduction and outro.|
desiredListenerAction|Listener action|Essentials|select|no|32 characters|Auto|Select the main action|Choose one primary action or let the model select a low-pressure conclusion.|The episode closing should support the user’s actual goal without adding competing calls to action.|Auto~Follow or subscribe~Visit a website~Join an email list~Download a resource~Buy or try an offer~Share the episode~No promotional action
sourceMaterial|Sources and reference material|Essentials|textarea|no|4,000 characters|Blank|Paste verified facts, quotes, research notes, links, or source excerpts.|Only supplied or clearly established information may be presented as factual.|Source material improves factual precision and prevents unsupported research claims.|
scriptDepth|Script detail|Episode Structure|select|no|32 characters|Hybrid script|Choose the level of detail|Select a complete script, flexible talking points, or a combination of both.|Different hosts need different levels of scripting and improvisational freedom.|Full word-for-word script~Detailed talking points~Hybrid script
openingStyle|Opening style|Episode Structure|select|no|32 characters|Auto|Choose how the episode begins|Controls the opening moments before the main host introduction.|The opening style materially changes the first minute and listener-retention approach.|Auto~Cold open~Provocative question~Short story~Surprising fact~Episode preview~Direct introduction
segmentCount|Number of segments|Episode Structure|number|no|2 digits|4|Example: 4|Use 2–8 for most episodes or leave the default.|This gives the user direct control over the episode’s structural complexity.|
mustIncludeSections|Sections to include|Episode Structure|multi-select|no|9 selections|Auto|Select any required sections|Choose only sections that are important to this episode.|Some shows have required structural elements that cannot be inferred reliably.|Opening hook~Host introduction~Topic context~Main discussion~Practical example~Listener question~Key takeaways~Call to action~Closing outro
requiredStoriesExamples|Stories or examples|Episode Structure|textarea|no|1,500 characters|Blank|Describe any real story, case, analogy, demonstration, or example to include.|Do not include private details or stories that are not approved for publication.|User-supplied examples make the episode specific without requiring fabricated anecdotes.|
transitionStyle|Transition style|Episode Structure|select|no|32 characters|Natural and subtle|Select a transition style|Controls how the script moves between topics and segments.|Transition style affects how formal, conversational, or tightly produced the episode feels.|Natural and subtle~Clear signposting~Conversational callbacks~Story-led transitions~Fast and minimal~Auto
audienceInteraction|Listener interaction|Episode Structure|multi-select|no|7 selections|Auto|Select interaction elements|Add only interaction methods that fit the episode naturally.|The user may want participation beyond a standard promotional CTA.|Auto~Reflection question~Listener challenge~Comment prompt~Q&A invitation~Poll suggestion~Listener submission request~No interaction
recurringElements|Recurring show elements|Episode Structure|textarea|no|800 characters|Blank|Add recurring segment names, catchphrases, rituals, or intro conventions.|Include only established elements the show already uses.|Existing show conventions must be supplied rather than invented.|
tone|Tone|Voice & Delivery|select|no|32 characters|Clear and natural|Select the overall tone|Choose the dominant tone; the model will avoid exaggerated delivery.|Tone affects vocabulary, sentence rhythm, framing, and emotional intensity.|Clear and natural~Conversational~Warm and personal~Energetic~Analytical~Calm and thoughtful~Humorous~Serious~Investigative
hostVoice|Host voice or style|Voice & Delivery|textarea|no|1,200 characters|Blank|Describe how the host normally speaks or paste a short approved sample.|Mention sentence style, personality, preferred expressions, or level of formality.|A supplied voice description helps the script sound like the actual host.|
pacing|Pacing|Voice & Delivery|select|no|24 characters|Balanced|Select the speaking pace|Controls information density and the amount of space between ideas.|Pacing determines sentence length, pauses, segment density, and estimated runtime.|Slow and reflective~Relaxed~Balanced~Fast-moving~Auto
energyLevel|Energy level|Voice & Delivery|select|no|24 characters|Moderate|Select the delivery energy|Choose how restrained or animated the host should sound.|Energy is distinct from tone and changes spoken delivery instructions.|Low and intimate~Calm~Moderate~High~Variable by segment
readingLevel|Language complexity|Voice & Delivery|select|no|28 characters|General audience|Select a language level|Adjusts vocabulary and explanation depth without oversimplifying the subject.|Audience familiarity does not always indicate the desired vocabulary level.|Very accessible~General audience~Informed audience~Professional~Specialist
humorLevel|Humor level|Voice & Delivery|select|no|28 characters|Light when natural|Select the humor level|Humor will not be forced into serious or sensitive sections.|Humor can substantially change the host’s language and episode rhythm.|None~Very subtle~Light when natural~Frequent~Strong comedic style
pronunciationNotes|Pronunciation notes|Voice & Delivery|textarea|no|1,000 characters|Blank|Add phonetic spellings for names, brands, places, or technical terms.|Use this for words the host may need help pronouncing while recording.|Pronunciation guidance is a practical requirement for recording-ready scripts.|
phrasesToAvoid|Words or phrases to avoid|Voice & Delivery|textarea|no|800 characters|Blank|List unwanted expressions, clichés, claims, topics, or brand language.|Use one field for all wording and style restrictions.|The user may have brand-specific or subject-specific restrictions the model cannot infer.|
hasGuest|Include a guest|Guests, Sponsors & Conversion|toggle|no|1 value|Off|Not applicable|Enable this when another person will participate in the episode.|Guest participation activates a substantially different script workflow.|
guestDetails|Guest details|Guests, Sponsors & Conversion|textarea|no|1,500 characters|Blank|Provide the guest’s name, role, expertise, project, and approved introduction.|Include only information that may be stated publicly.|A guest introduction and relevant questions require accurate supplied background information.|
guestTopicsAndBoundaries|Guest topics and boundaries|Guests, Sponsors & Conversion|textarea|no|1,500 characters|Blank|List priority questions, approved themes, sensitive areas, or topics to avoid.|Helps create a focused and respectful conversation.|Interview goals and boundaries cannot be inferred safely from a guest’s identity.|
interviewQuestionCount|Interview question count|Guests, Sponsors & Conversion|number|no|2 digits|10|Example: 10|The model may add optional follow-ups without exceeding the planned episode length.|The number of questions directly affects interview depth and timing.|
hasSponsor|Include a sponsor message|Guests, Sponsors & Conversion|toggle|no|1 value|Off|Not applicable|Enable only when an actual sponsor, partner, or approved promotional message exists.|Sponsor copy must never be inserted or invented automatically.|
sponsorBrief|Sponsor brief|Guests, Sponsors & Conversion|textarea|no|2,000 characters|Blank|Add the sponsor name, approved message, offer, facts, URL, and required disclosure.|Only supplied and approved claims may appear in the sponsor read.|Accurate sponsor copy requires approved commercial information and disclosure details.|
sponsorPlacement|Sponsor placement|Guests, Sponsors & Conversion|select|no|24 characters|Mid-roll|Select the placement|Controls where the sponsor read appears in the episode.|Sponsor placement affects transitions, pacing, and segment timing.|Pre-roll~Early episode~Mid-roll~Before closing~Multiple placements~Let the model decide
ctaDetails|CTA details|Guests, Sponsors & Conversion|textarea|no|1,000 characters|Blank|Provide the destination, offer, URL, deadline, or exact action when applicable.|Leave blank for a natural CTA based on the selected listener action.|Specific calls to action require accurate destinations and offer details.|
episodeContext|Publishing context|Publishing, Discovery & Safety|select|no|32 characters|Evergreen episode|Select the episode context|Helps the model decide how much date context and series continuity to include.|Publishing context changes framing, references, disclosures, and the useful lifespan of the episode.|Evergreen episode~Timely topic~Series episode~Product or project launch~Sponsored or branded~Internal or private
seriesContext|Series context|Publishing, Discovery & Safety|textarea|no|1,200 characters|Blank|Explain previous episodes, the series theme, and what comes next.|Include only the context listeners need to understand this installment.|A series episode may require continuity that is unavailable from the topic alone.|
contentRisk|Sensitive content type|Publishing, Discovery & Safety|select|no|36 characters|General content|Select the closest category|Used to apply cautious wording and verification notes when necessary.|High-stakes subjects require stronger accuracy, scope, and disclaimer controls.|General content~Health or medical~Legal~Financial or tax~Political or current events~Children or family safety~Regulated products
jurisdiction|Relevant jurisdiction|Publishing, Discovery & Safety|textarea|no|300 characters|Blank|Example: United States federal law, England and Wales, European Union|State the country, state, or region when rules may vary by location.|Jurisdiction can materially change legal, financial, political, and regulated-content accuracy.|
showNotesLevel|Show notes detail|Publishing, Discovery & Safety|select|no|24 characters|Standard|Select the show notes level|Controls the amount of supporting text generated for publication.|Different publishing workflows require different levels of supporting material.|None~Concise~Standard~Detailed
discoveryKeywords|Discovery keywords|Publishing, Discovery & Safety|textarea|no|500 characters|Blank|Add natural phrases listeners may use to find this episode.|Use relevant topic phrases, not repetitive keyword stuffing.|User-supplied terminology can improve title and show-note discoverability.|
linksAndResources|Links and resources|Publishing, Discovery & Safety|textarea|no|2,000 characters|Blank|List approved websites, books, tools, profiles, studies, or resources.|The model must not invent URLs or sources that are not supplied.|Show notes often require exact links and resource names that cannot be inferred.|
additionalRequirements|Additional requirements|Publishing, Discovery & Safety|textarea|no|2,000 characters|Blank|Add any final instructions that are not covered elsewhere.|Use this for important production, formatting, disclosure, or content requirements.|One controlled miscellaneous field supports legitimate requirements without creating several narrow fields.|
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

function parseMaxLength(raw) {
  const match = raw.match(/^([\d,]+)\s+(characters|digits)$/);
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
      "linksAndResources",
      "sponsorBrief",
      "guestDetails",
      "guestTopicsAndBoundaries",
    ].includes(field.key)
  ) {
    return "Avoid invented facts, links, credentials, quotations, sponsor claims, guest details, or private information that was not supplied.";
  }
  if (field.key === "contentRisk" || field.key === "jurisdiction") {
    return "Avoid treating high-stakes legal, financial, medical, political, or regulated topics as personalized professional advice.";
  }
  if (field.key === "requiredStoriesExamples") {
    return "Avoid fake personal stories, customer stories, case studies, testimonials, or dialogue presented as real.";
  }
  if (field.key === "phrasesToAvoid") {
    return "Avoid leaving out phrases that would violate brand, compliance, sensitivity, or editorial rules.";
  }
  if (field.key === "hasSponsor" || field.key === "hasGuest") {
    return "Avoid enabling this unless the guest or sponsor information is real, approved, and meant to appear in the episode.";
  }
  if (field.required) {
    return "Avoid vague placeholders, unsupported claims, broad topics without a clear angle, or changing the requested episode into a different subject.";
  }
  return "Avoid guessed facts, fake urgency, fabricated social proof, overstuffed CTAs, or requirements that are not actually intended for this episode.";
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
  const options =
    sourceType === "toggle"
      ? ["On", "Off"]
      : type === "select" && rawOptions
        ? rawOptions.split("~")
        : undefined;
  const maxLength = parseMaxLength(maxLengthRaw);
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
    type,
    required,
    placeholder: isMultiText
      ? `${placeholder}; or list multiple choices separated by commas.`
      : placeholder,
    hint: `${baseHint}${optionHint}`,
    help: {
      what: required
        ? `Provide the ${label.toLowerCase()} for this podcast episode.`
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
  slug: "podcast-script",
  title: "Podcast Script",
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
