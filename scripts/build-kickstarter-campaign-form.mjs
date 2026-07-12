/**
 * Builds the Kickstarter Campaign form schema from the approved 43-field
 * specification. It verifies that every prompt variable has exactly one form
 * field before writing the form JSON.
 *
 * Usage: node scripts/build-kickstarter-campaign-form.mjs
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
  "kickstarter-campaign.txt",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "kickstarter-campaign-variables.json",
);

const groups = [
  {
    id: "essentials",
    title: "Essentials",
    description:
      "Project, audience, funding, rewards, creator context, output language, and must-follow requirements needed for a useful first campaign draft.",
    defaultOpen: true,
  },
  {
    id: "story_positioning",
    title: "Story & Positioning",
    description:
      "Origin, problem, solution, differentiation, current progress, credibility, audience motivation, and approved evidence.",
    defaultOpen: false,
  },
  {
    id: "rewards_funding",
    title: "Rewards & Funding",
    description:
      "Reward format, limited rewards, shipping, budget, stretch goals, campaign duration, and launch timing.",
    defaultOpen: false,
  },
  {
    id: "delivery_risk",
    title: "Delivery & Risk",
    description:
      "Production, milestones, fulfillment, suppliers, risks, mitigation, and prototype or manufacturing evidence.",
    defaultOpen: false,
  },
  {
    id: "voice_media_compliance",
    title: "Voice, Media & Compliance",
    description:
      "Campaign tone, narrative voice, media assets, video output, sources, sensitive claims, evidence support, and restrictions.",
    defaultOpen: false,
  },
];

const groupIdsByTitle = Object.fromEntries(
  groups.map((group) => [group.title, group.id]),
);

const defaultValues = {
  projectStage: "Prototype or early version",
  outputLanguage: "English",
  rewardFormat: "Auto-detect from rewards",
  campaignDurationDays: "30",
  tone: "Authentic and confident",
  campaignVoice: "Creator-led and conversational",
  campaignVideoApproach: "Auto",
  sensitiveClaimArea: "None",
};

const showWhen = {
  shippingPlan: { key: "rewardFormat", equals: ["Physical", "Mixed"] },
  prototypeAndManufacturingEvidence: {
    key: "projectCategory",
    equals: "Design & Technology",
  },
  claimSupport: { key: "sensitiveClaimArea", notEquals: "None" },
};

const numberBounds = {
  fundingGoal: { min: 1 },
  campaignDurationDays: { min: 1, max: 60 },
};

const examples = {
  projectName: "Foldlight Modular Desk Lamp",
  projectCategory: "Design & Technology",
  projectSummary:
    "A modular desk lamp with adjustable light panels for small creative workspaces.",
  projectPromise:
    "Help backers build a calmer, better-lit workspace without replacing their whole desk setup.",
  primaryAudience:
    "Design-conscious remote workers, students, and creators who need flexible lighting in small rooms.",
  fundingGoal: "25000",
  fundingCurrency: "USD",
  fundingPurpose:
    "Tooling, first production run, quality checks, packaging, and fulfillment preparation.",
  rewardTiers:
    "$10 Supporter update pack; $49 Early lamp kit; $79 Standard lamp kit; estimated delivery Q2 2027.",
  creatorIdentity:
    "A small industrial-design team with experience prototyping home-office accessories.",
  projectStage: "Prototype or early version",
  outputLanguage: "English",
  additionalRequirements:
    "No fake urgency, no invented reviews, and no delivery dates beyond supplied estimates.",
  originStory:
    "The project started after the team struggled to keep a shared apartment workspace comfortable after dark.",
  backerProblem:
    "Small desks often need focused light without bulky lamps, exposed cables, or harsh glare.",
  projectSolution:
    "Interchangeable panels let backers direct light for reading, sketching, video calls, or ambient work.",
  keyDifferences:
    "Flat-pack design, replaceable panels, repairable hinges, and warm/cool light presets.",
  currentProgress:
    "Two working prototypes have been assembled and tested for brightness, hinge stability, and desk fit.",
  creatorCredibility:
    "The team has previously shipped small-batch desk accessories through a local maker studio.",
  audienceMotivation:
    "Backers want a practical tool that also feels intentional and good-looking in a visible workspace.",
  evidenceAndValidation:
    "Prototype photos, brightness tests, and notes from five informal workspace trials are available.",
  rewardFormat: "Physical",
  rewardLimitsAndEarlyBirds:
    "Early lamp kit is limited to 200 units only if that quantity is confirmed in the reward setup.",
  shippingPlan:
    "Ships to the United States, Canada, EU, and United Kingdom; customs and VAT collected where applicable if confirmed.",
  budgetBreakdown:
    "Tooling, materials, assembly, testing, packaging, freight, fulfillment, and contingency.",
  stretchGoals:
    "Additional color panels only after the base lamp is funded and production remains feasible.",
  campaignDurationDays: "30",
  plannedLaunchDate: "2026-09-15",
  productionPlan:
    "Finalize tooling, order components, assemble pilot run, complete quality checks, package units, and begin fulfillment.",
  timelineMilestones:
    "Tooling after campaign close, pilot run, production batch, QC, packaging, regional fulfillment.",
  fulfillmentPlan:
    "Use a regional fulfillment partner for packed lamp kits and send tracking when available.",
  partnersSuppliers:
    "Confirmed hinge supplier and packaging vendor; final assembly partner under review.",
  knownRisks:
    "Tooling delays, component lead times, color consistency, freight changes, and quality-control rework.",
  mitigationPlan:
    "Buffer production time, order sample parts before full production, communicate delays monthly, and hold a small contingency reserve.",
  prototypeAndManufacturingEvidence:
    "Working prototype photos, hinge stress notes, brightness test chart, and supplier sample invoices.",
  tone: "Authentic and confident",
  campaignVoice: "Creator-led and conversational",
  mediaAssets:
    "Prototype photos, exploded-view diagram, desk setup shots, short assembly clip, and team photo.",
  campaignVideoApproach: "Full 2–3 minute script",
  sourceMaterials:
    "Paste approved product notes, prototype data, reward details, budget notes, and source links.",
  sensitiveClaimArea: "None",
  claimSupport:
    "Approved testing notes, certification status, legal review notes, or claims to avoid.",
  restrictions:
    "Do not claim waterproofing, medical benefits, certified safety approval, existing backers, or guaranteed delivery.",
};

const fieldRows = `
projectName|Project name|Essentials|text|yes|120|Blank|Example: Foldlight Modular Desk Lamp|Enter the public name of the project or product.|The project name anchors campaign titles, story copy, rewards, and calls to action.|
projectCategory|Project category|Essentials|select|yes|40|Blank|Choose the closest category|Select the category that best matches what you are creating.|Category affects campaign structure, proof expectations, risks, terminology, and backer questions.|Design & Technology~Games~Film & Video~Publishing & Comics~Music & Performance~Art & Photography~Food & Craft~Fashion~Journalism~Other Creative Project
projectSummary|What are you creating?|Essentials|textarea|yes|1200|Blank|Describe the project, what it does or contains, and what backers will help bring to life.|Focus on the concrete project rather than general company promotion.|The model cannot safely infer the project’s function, scope, format, or deliverable.|
projectPromise|Core project promise|Essentials|text|no|220|Blank|What should a backer understand or feel after seeing the campaign?|Use one clear benefit, creative promise, or main takeaway.|It helps unify the campaign around one memorable backer-facing message.|
primaryAudience|Primary backers|Essentials|textarea|yes|700|Blank|Describe the people most likely to care about and support this project.|Include relevant interests, needs, experience level, or community context.|Audience knowledge materially changes positioning, language, proof, rewards, and FAQ topics.|
fundingGoal|Funding goal|Essentials|number|yes|12|Blank|Example: 25000|Enter the intended Kickstarter funding goal without currency symbols.|The campaign must explain what the requested amount makes possible without inventing a target.|
fundingCurrency|Funding currency|Essentials|text|yes|12|Blank|Example: USD, EUR, GBP or CAD|Use the currency selected in the Kickstarter project editor.|Funding and reward amounts must use a consistent, user-confirmed currency.|
fundingPurpose|What will funding pay for?|Essentials|textarea|yes|1000|Blank|Explain the main production, development, printing, manufacturing, or fulfillment needs.|Include only real planned uses of funds.|Backers need a credible explanation of why funding is necessary and how it supports delivery.|
rewardTiers|Reward tiers|Essentials|textarea|yes|2000|Blank|List each reward with its pledge amount, contents, limits, and delivery estimate when known.|One reward per line is sufficient. Do not include unconfirmed prices or dates.|Rewards determine campaign value, funding logic, fulfillment expectations, and FAQ content.|
creatorIdentity|Creator or team|Essentials|textarea|no|600|Blank|Describe the creator, team, studio, or organization behind the project.|Use only public, approved identity and experience details.|Kickstarter backers need to understand who is responsible for the project.|
projectStage|Current project stage|Essentials|select|no|40|Prototype or early version|Choose the current stage|Be honest about whether this is a concept, prototype, production-ready project, or new run.|Stage controls proof, risk wording, timeline confidence, and Design & Technology review concerns.|Concept only~Prototype or early version~Validated prototype~Production-ready~In production~Funding a new edition or run
outputLanguage|Output language|Essentials|text|no|60|English|Example: English, Ukrainian, German, or Spanish|Enter the language for the generated campaign package.|The campaign copy should be generated in the audience-facing language.|
additionalRequirements|Additional requirements|Essentials|textarea|no|2000|Blank|Add remaining instructions, must-use wording, exclusions, or launch constraints.|Use only for requirements not already captured in another field.|This keeps edge cases controlled without adding unnecessary form fields.|
originStory|How the project began|Story & Positioning|textarea|no|1000|Blank|Explain the real moment, need, observation, or creative spark behind the project.|Leave blank if the origin story is not public or not relevant.|A truthful origin story can make the campaign feel creator-led and specific.|
backerProblem|Problem or opportunity|Story & Positioning|textarea|no|900|Blank|Describe the real need, frustration, creative opportunity, or gap the project addresses.|Avoid exaggerating the problem or turning it into fear-based copy.|The story needs a credible reason for backers to care.|
projectSolution|How the project answers it|Story & Positioning|textarea|no|1000|Blank|Describe how the project works, what it contains, or how it responds to the need.|Use factual, project-specific details rather than generic benefits.|This turns the summary into a clear campaign narrative.|
keyDifferences|What makes it distinctive?|Story & Positioning|textarea|no|800|Blank|List only confirmed differences, design choices, creative angle, or production approach.|Do not invent superiority, awards, or unsupported comparisons.|Differentiation helps positioning without relying on hype.|
currentProgress|Progress so far|Story & Positioning|textarea|no|1200|Blank|List prototypes, drafts, samples, testing, partnerships, production steps, or completed work.|Separate confirmed progress from future plans.|Current progress determines credibility and risk framing.|
creatorCredibility|Relevant experience|Story & Positioning|textarea|no|900|Blank|Add approved skills, past work, shipped projects, production experience, or collaborators.|Do not add credentials or achievements that cannot be published.|Backers need evidence that the creator can reasonably attempt the project.|
audienceMotivation|Why will people back it?|Story & Positioning|textarea|no|700|Blank|Explain why the audience may want to support this project now.|Use practical, creative, emotional, community, or collector motivations that are actually supported.|Backer motivation shapes the campaign opening, reward positioning, and CTA.|
evidenceAndValidation|Evidence and validation|Story & Positioning|textarea|no|1500|Blank|Add approved prototype evidence, test notes, community feedback, press, samples, or data.|Only include proof that really exists and may be used publicly.|Evidence strengthens credibility while preventing invented social proof.|
rewardFormat|Main reward format|Rewards & Funding|select|no|40|Auto-detect from rewards|Choose the closest reward format|Select the dominant reward type or let the model infer it from the supplied tiers.|Reward format controls shipping, fulfillment, access, and risk language.|Auto-detect from rewards~Physical~Digital~Experience or service~Mixed~Support without reward
rewardLimitsAndEarlyBirds|Limited or early rewards|Rewards & Funding|textarea|no|800|Blank|List confirmed limited quantities, early-bird tiers, or availability rules.|Leave blank if limits are not configured and verified.|Limited rewards can be mentioned only when the user supplies real limits.|
shippingPlan|Shipping plan|Rewards & Funding|textarea|no|1500|Blank|List shipping regions, costs, timing assumptions, taxes, customs, VAT, or local pickup notes.|Shown only for physical or mixed rewards.|Shipping details materially affect reward clarity and fulfillment risk.|
budgetBreakdown|Budget breakdown|Rewards & Funding|textarea|no|1800|Blank|Explain planned use of funds by category when known.|Use exact categories only when they are real; otherwise provide narrative context.|Backers often need a transparent explanation of how funds support delivery.|
stretchGoals|Stretch goals|Rewards & Funding|textarea|no|1200|Blank|List only confirmed stretch goals and what they unlock after the base project is viable.|Leave blank if stretch goals are not defined.|Stretch goals should not distract from or endanger the base project.|
campaignDurationDays|Campaign duration|Rewards & Funding|number|no|2|30|Example: 30|Enter a planned duration from 1 to 60 days.|Kickstarter campaign timing affects deadline wording and planning notes.|
plannedLaunchDate|Planned launch date|Rewards & Funding|date|no|10|Blank|Example: 2026-09-15|Enter an ISO-style date when the launch date is known.|A launch date plus duration can support a tentative end date without inventing timing.|
productionPlan|Production plan|Delivery & Risk|textarea|no|1500|Blank|Describe how the project will be made after the campaign closes.|Include production, development, printing, manufacturing, assembly, QA, or creative work.|Production detail helps make the campaign credible and backer-safe.|
timelineMilestones|Timeline and milestones|Delivery & Risk|textarea|no|1500|Blank|List the major steps from campaign close through production and delivery.|Use approximate milestones when dates are not confirmed.|Milestones let the output explain progress without inventing exact dates.|
fulfillmentPlan|Fulfillment plan|Delivery & Risk|textarea|no|1300|Blank|Explain delivery method, access process, fulfillment partners, pickup, or digital delivery.|Include only confirmed delivery arrangements.|Fulfillment details shape rewards, FAQ, shipping notes, and risks.|
partnersSuppliers|Partners and suppliers|Delivery & Risk|textarea|no|1000|Blank|List confirmed suppliers, manufacturers, collaborators, printers, studios, or fulfillment partners.|Do not imply contracts, endorsements, certifications, or capacity not supplied.|Partner and supplier context affects production credibility and risk.|
knownRisks|Known risks|Delivery & Risk|textarea|no|1500|Blank|List realistic project, production, supplier, software, licensing, customs, or scheduling risks.|Be candid; do not promise that uncertainty is eliminated.|Kickstarter requires honest risk communication rather than guaranteed delivery.|
mitigationPlan|Risk mitigation|Delivery & Risk|textarea|no|1500|Blank|Explain how the creator will reduce, monitor, communicate, or respond to known risks.|Use concrete plans rather than generic reassurance.|Risk sections are stronger when each meaningful risk has an actual response plan.|
prototypeAndManufacturingEvidence|Prototype and production proof|Delivery & Risk|textarea|no|1800|Blank|Add working prototype evidence, manufacturing readiness, samples, tests, or supplier proof.|Shown for Design & Technology projects.|Design and technology campaigns need clear evidence of real project progress.|
tone|Campaign tone|Voice, Media & Compliance|select|no|40|Authentic and confident|Select a tone|Choose the tone the public campaign should use.|Tone controls how the story, risks, CTA, and creator voice feel to backers.|Authentic and confident~Warm and personal~Bold and energetic~Calm and transparent~Playful and creative~Technical and precise~Premium and refined~Community-focused
campaignVoice|Narrative voice|Voice, Media & Compliance|select|no|40|Creator-led and conversational|Select the narrative voice|Choose whose voice the campaign should feel like.|Kickstarter campaigns need a credible public voice rather than generic marketing copy.|Creator-led and conversational~Founder or team-led~Documentary and factual~Artist-led and reflective~Community-centered~Product-focused
mediaAssets|Available media|Voice, Media & Compliance|textarea|no|1500|Blank|List available photos, prototypes, diagrams, samples, demos, charts, videos, or team images.|Do not imply media exists unless it is supplied.|Media notes help place existing assets without inventing footage or proof.|
campaignVideoApproach|Campaign video output|Voice, Media & Compliance|select|no|40|Auto|Select video output|Choose whether to generate a full script, short script, outline, or omit the video section.|Video output should match the user’s actual campaign needs and available media.|Auto~Full 2–3 minute script~Short 60–90 second script~Outline only~No video section
sourceMaterials|Sources and reference content|Voice, Media & Compliance|textarea|no|4000|Blank|Paste approved source notes, links, specs, drafts, references, or research.|Use source materials as factual reference; do not copy long copyrighted passages.|Source material improves accuracy and helps avoid unsupported claims.|
sensitiveClaimArea|Sensitive claim area|Voice, Media & Compliance|select|no|40|None|Select if the project touches a sensitive area|Use when claims involve health, finance, legal, safety, environmental, political, child-related, or regulated topics.|Sensitive areas require stricter claim handling and review notes.|None~Medical or health~Financial or investment~Legal or regulatory~Safety or child-related~Environmental claims~Political or public-interest~Other regulated area
claimSupport|Evidence for sensitive claims|Voice, Media & Compliance|textarea|no|2000|Blank|Provide approved evidence, review notes, disclaimers, or limits for sensitive claims.|Shown only when a sensitive claim area is selected.|High-stakes claims need explicit support or must be flagged for review.|
restrictions|Claims and content to avoid|Voice, Media & Compliance|textarea|no|1500|Blank|List words, claims, promises, topics, proof points, or positioning to avoid.|Use this for legal, brand, platform, rights, privacy, or factual limits.|Restrictions prevent unsupported claims, rights issues, and misleading campaign copy.|
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
  if (sourceType === "date") return { type: "text" };
  return { type: sourceType };
}

function helpAvoidFor(field) {
  if (
    [
      "evidenceAndValidation",
      "creatorCredibility",
      "mediaAssets",
      "sourceMaterials",
      "partnersSuppliers",
      "claimSupport",
    ].includes(field.key)
  ) {
    return "Avoid invented evidence, credentials, media, supplier relationships, approvals, testimonials, test results, links, or sources.";
  }
  if (
    [
      "fundingGoal",
      "fundingCurrency",
      "rewardTiers",
      "rewardLimitsAndEarlyBirds",
      "budgetBreakdown",
      "shippingPlan",
      "plannedLaunchDate",
    ].includes(field.key)
  ) {
    return "Avoid unconfirmed prices, quantities, delivery dates, funding details, taxes, customs terms, limits, or scarcity claims.";
  }
  if (field.key === "sensitiveClaimArea" || field.key === "restrictions") {
    return "Avoid medical, legal, financial, safety, environmental, political, or child-related claims without supplied support and review.";
  }
  if (field.required) {
    return "Avoid vague placeholders, unsupported promises, fake urgency, fake scarcity, or changing the campaign into a different project.";
  }
  return "Avoid guessed facts, fake social proof, fake urgency, pressure, hidden assumptions, or unsupported Kickstarter claims.";
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
  const defaultValue =
    defaultRaw !== "Blank" && defaultValues[key] ? defaultValues[key] : undefined;

  const field = {
    key,
    label,
    group: groupIdsByTitle[groupTitle],
    groupTitle,
    type: adapted.type,
    required,
    placeholder,
    hint:
      sourceType === "date"
        ? `${baseHint} Use YYYY-MM-DD when possible.`
        : baseHint,
    help: {
      what: required
        ? `Provide the ${label.toLowerCase()} before generating the Kickstarter campaign.`
        : `Optional context for the ${label.toLowerCase()} field.`,
      why,
      example: `Good example: ${examples[key] ?? placeholder}`,
      avoid: helpAvoidFor({ key, required }),
    },
  };

  if (defaultValue) field.defaultValue = defaultValue;
  if (options) field.options = options;
  if (Number.isFinite(maxLength)) field.maxLength = maxLength;
  if (showWhen[key]) field.showWhen = showWhen[key];
  if (numberBounds[key]?.min !== undefined) field.min = numberBounds[key].min;
  if (numberBounds[key]?.max !== undefined) field.max = numberBounds[key].max;
  if (sourceType === "textarea" || maxLength > 500) field.fullWidth = true;

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
  slug: "kickstarter-campaign",
  title: "Kickstarter Campaign",
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
