/**
 * Builds the Press Release form schema from the approved 34-field
 * specification. It verifies that every prompt variable has exactly one form
 * field before writing the form JSON.
 *
 * Usage: node scripts/build-press-release-form.mjs
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
  "press-release.txt",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "press-release-variables.json",
);

const groups = [
  {
    id: "essentials",
    title: "Essentials",
    description:
      "Announcement type, company, news summary, audience, facts, date, dateline, goal, length, language, and geographic scope.",
    defaultOpen: true,
  },
  {
    id: "message_evidence",
    title: "Message & Evidence",
    description:
      "Benefits, supporting evidence, references, timing, reader action, sensitive claims, and background context.",
    defaultOpen: false,
  },
  {
    id: "quotes_company",
    title: "Quotes & Company",
    description:
      "Quote controls, authorized speakers, approved quotation material, boilerplate, website, media contact, and brand voice.",
    defaultOpen: false,
  },
  {
    id: "distribution_settings",
    title: "Distribution Settings",
    description:
      "Publication destinations, editorial status, headline style, subheadline, and notes-to-editors controls.",
    defaultOpen: false,
  },
  {
    id: "compliance_final_details",
    title: "Compliance & Final Details",
    description:
      "Release or embargo status, embargo date, and additional requirements.",
    defaultOpen: false,
  },
];

const defaultValues = {
  announcementType: "Product or service launch",
  releaseGoal: "Earn media coverage",
  desiredLength: "Standard",
  outputLanguage: "English",
  readerAction: "Auto",
  includeQuotes: "Off",
  brandVoice: "Clear and professional",
  publicationDestination: "Company newsroom, Media outreach",
  releaseStatus: "Draft for review",
  headlineStyle: "Straight news",
  includeSubheadline: "On",
  includeNotesToEditors: "Off",
  embargoStatus: "For immediate release",
};

const options = {
  announcementType: [
    "Product or service launch",
    "Company news",
    "Partnership",
    "Event",
    "Funding or investment",
    "Research or report",
    "Leadership appointment",
    "Milestone or award",
    "Other announcement",
  ],
  releaseGoal: [
    "Earn media coverage",
    "Build stakeholder awareness",
    "Support a product launch",
    "Increase event attendance",
    "Attract customers or users",
    "Provide an investor update",
    "Improve local visibility",
    "Clarify company information",
  ],
  desiredLength: ["Auto", "Brief", "Standard", "Detailed"],
  outputLanguage: [
    "English",
    "Spanish",
    "French",
    "German",
    "Italian",
    "Portuguese",
    "Polish",
    "Ukrainian",
    "Russian",
    "Other or specified below",
  ],
  includeQuotes: ["On", "Off"],
  brandVoice: [
    "Clear and professional",
    "Formal and corporate",
    "Confident and direct",
    "Technical and precise",
    "Warm and human",
    "Innovative but restrained",
    "Public-sector neutral",
    "Nonprofit and mission-led",
  ],
  publicationDestination: [
    "Company newsroom",
    "Newswire service",
    "Direct media outreach",
    "Trade publications",
    "Local media",
    "Investors or stakeholders",
  ],
  releaseStatus: [
    "Draft for review",
    "Ready for internal approval",
    "Final publication copy",
  ],
  headlineStyle: [
    "Straight news",
    "Benefit-led",
    "Data-led",
    "Product-focused",
    "Event-focused",
    "Executive announcement",
    "Local-news angle",
    "Auto",
  ],
  includeSubheadline: ["On", "Off"],
  includeNotesToEditors: ["On", "Off"],
  embargoStatus: [
    "For immediate release",
    "Embargoed",
    "Publication date only",
    "Do not display a status line",
  ],
};

const showWhen = {
  quoteSpeakers: {
    key: "includeQuotes",
    equals: "On",
  },
  approvedQuotes: {
    key: "includeQuotes",
    equals: "On",
  },
  notesToEditors: {
    key: "includeNotesToEditors",
    equals: "On",
  },
  embargoDate: {
    key: "embargoStatus",
    equals: "Embargoed",
  },
};

const examples = {
  announcementType: "Product or service launch",
  companyName: "Northstar Analytics",
  announcementSummary:
    "Northstar Analytics is launching a workflow dashboard for regional logistics teams.",
  primaryAudience:
    "Technology journalists, logistics operators, and regional business publications",
  keyFacts:
    "Launch date: September 12, 2026. Available in the UK and EU. Integrates with existing delivery-management tools.",
  releaseDate: "2026-09-12",
  datelineLocation: "Berlin, Germany",
  releaseGoal: "Earn media coverage",
  desiredLength: "Standard",
  outputLanguage: "English",
  geographicScope: "United Kingdom and European Union",
  keyBenefits:
    "Helps operations teams see route delays, handoff issues, and late deliveries in one dashboard.",
  supportingEvidence:
    "Pilot customers reported identifying recurring delay patterns during a 60-day internal trial.",
  sourceReferences:
    "Internal launch brief, approved product FAQ, and September 2026 availability note.",
  timingContext:
    "Public launch begins September 12, 2026, after a private beta with selected logistics partners.",
  readerAction: "Visit the newsroom or request a product briefing",
  sensitiveClaims:
    "Do not claim guaranteed delivery improvements or regulatory compliance.",
  relatedContext:
    "The dashboard follows the company’s earlier route-monitoring API release.",
  includeQuotes: "On",
  quoteSpeakers:
    "Ava Brooks, CEO of Northstar Analytics, authorized to comment on product strategy.",
  approvedQuotes:
    "This launch gives regional teams a clearer way to understand where delivery workflows slow down.",
  companyBoilerplate:
    "Northstar Analytics builds workflow visibility tools for regional logistics teams.",
  companyWebsite: "https://example.com",
  mediaContact:
    "Media Relations, press@example.com, +44 20 0000 0000",
  brandVoice: "Clear and professional",
  publicationDestination: "Company newsroom, Media outreach",
  releaseStatus: "Draft for review",
  headlineStyle: "Straight news",
  includeSubheadline: "On",
  includeNotesToEditors: "On",
  notesToEditors:
    "Product screenshots and executive interviews are available by request.",
  embargoStatus: "Embargoed",
  embargoDate: "2026-09-10",
  additionalRequirements:
    "Embargo lifts at 09:00 CET. Use UK English and avoid unsupported market-size claims.",
};

const fieldRows = `
announcementType|Announcement type|essentials|select|yes|40|Select the type of announcement|Helps structure the release around the correct kind of news.|Different announcement types require different leads, evidence, chronology, and emphasis.
companyName|Company or organization|essentials|text|yes|160|Example: Northstar Analytics|Enter the official name that should appear in the release.|The issuing company or organization cannot be safely inferred.
announcementSummary|What are you announcing?|essentials|textarea|yes|1500|Describe the announcement, what is changing, and why it matters.|Include the central news in plain language, not a polished press release.|This provides the central news angle and determines the release’s lead.
primaryAudience|Primary audience|essentials|textarea|yes|600|Example: technology journalists, small-business owners, and industry analysts|Identify the journalists, readers, customers, or stakeholders the news should reach.|Audience information materially changes terminology, emphasis, context, and news value.
keyFacts|Essential facts|essentials|textarea|yes|2000|List verified dates, names, features, amounts, locations, results, and other required facts.|Provide only facts that may be stated publicly.|A press release must be grounded in supplied, verifiable information.
releaseDate|Release date|essentials|date|yes|10|Select the publication date|Used in the dateline and to interpret whether the announcement is upcoming or completed.|The publication date affects tense, timing language, and dateline accuracy.
datelineLocation|Dateline location|essentials|text|yes|120|Example: Berlin, Germany|Enter the city and country or region associated with the announcement.|A conventional press release normally requires an accurate dateline location.
releaseGoal|Primary goal|essentials|select|no|40|Select the main goal|Guides the news angle and final reader action without making the release overly promotional.|The desired outcome determines which facts and implications deserve the strongest emphasis.
desiredLength|Release length|essentials|select|no|30|Select a preferred length|Choose a useful editorial range rather than an exact word count.|The appropriate depth depends on the complexity and importance of the announcement.
outputLanguage|Output language|essentials|select|no|30|Select the release language|The release will use native professional conventions for the selected language.|Language affects grammar, dateline conventions, quotation punctuation, and editorial tone.
geographicScope|Geographic scope|essentials|text|no|200|Example: United Kingdom, European Union, global, or local market|Clarify where the announcement, product, event, or service applies.|Geographic scope prevents the release from implying availability or relevance in unsupported markets.
keyBenefits|Main significance or benefits|message_evidence|textarea|no|1200|Explain who benefits, what improves, and why the announcement matters.|Use specific outcomes and significance rather than advertising slogans.|This helps translate raw news into a relevant story for journalists and readers.
supportingEvidence|Evidence and measurable details|message_evidence|textarea|no|2000|Add verified statistics, research findings, milestones, comparisons, or performance data.|Include methodology, dates, sample sizes, or attribution when relevant.|Evidence can strengthen newsworthiness but must come directly from the user.
sourceReferences|Sources and reference material|message_evidence|textarea|no|4000|Paste source links, document titles, approved background notes, or factual references.|References guide verification but will not be invented or described as independently checked.|References help attribute claims and identify facts that require confirmation.
timingContext|Timing and availability|message_evidence|textarea|no|1000|Add launch dates, event dates, rollout stages, availability, deadlines, or relevant timing.|Only include dates and availability details that are confirmed.|Press releases frequently depend on precise launch, availability, or event timing.
readerAction|Preferred reader action|message_evidence|text|no|240|Example: visit the newsroom, register, download the report, or request an interview|Leave as Auto for one restrained, context-appropriate next step.|It determines the release’s single proportional CTA without adding competing actions.
sensitiveClaims|Claims or wording to avoid|message_evidence|textarea|no|1200|List unapproved claims, confidential topics, legal restrictions, or prohibited wording.|Use this for specific restrictions, not general writing instructions.|Company-specific legal, regulatory, contractual, or confidentiality restrictions cannot be inferred.
relatedContext|Background and context|message_evidence|textarea|no|1500|Add relevant history, earlier announcements, market context, or necessary explanation.|Include only context that helps readers understand the current news.|Relevant background can make unfamiliar or technical announcements understandable.
includeQuotes|Include quotations|quotes_company|toggle|no|5|Select whether to include quotations|Turn on only when an authorized speaker and approved quotation material are available.|Quotations are common in press releases but should not be invented automatically.
quoteSpeakers|Authorized speakers|quotes_company|textarea|no|800|List each speaker’s full name, title, organization, and relevance to the announcement.|Only include people authorized to be quoted publicly.|The model must know exactly who is authorized to speak and how they should be identified.
approvedQuotes|Approved quotation material|quotes_company|textarea|no|2000|Paste approved quotes or exact approved ideas that may be turned into a draft for review.|Unapproved draft wording will be clearly marked outside the publishable release.|It prevents fabricated quotations and distinguishes approved wording from suggested language.
companyBoilerplate|Company boilerplate|quotes_company|textarea|no|1500|Paste the approved “About the company” paragraph or provide verified company facts.|If omitted, use a minimal factual paragraph or a completion placeholder.|The boilerplate contains company facts that should not be inferred or fabricated.
companyWebsite|Company website|quotes_company|URL|no|300|https://example.com|Used only as a factual destination when a website link is appropriate.|The official website cannot be safely invented.
mediaContact|Media contact|quotes_company|textarea|no|500|Add contact name, role, email address, phone number, or media inquiry URL.|Provide only business contact details approved for public publication.|Journalists require a valid contact, but private or guessed information must never be inserted.
brandVoice|Brand voice|quotes_company|select|no|40|Select the preferred voice|The release will remain journalistic and restrained regardless of the selected voice.|Brand voice affects diction and tone without changing factual standards.
publicationDestination|Publication destinations|distribution_settings|multi-select|no|180|Select intended destinations|The release will be formatted for the selected distribution environments.|Newswire, newsroom, trade, local, and stakeholder releases require different levels of context and formality.
releaseStatus|Editorial status|distribution_settings|select|no|30|Select the current status|Controls whether incomplete details appear as review notes or clearly marked placeholders.|The treatment of missing information should differ between an early draft and final publication copy.
headlineStyle|Headline style|distribution_settings|select|no|30|Select a headline approach|Headlines remain factual and avoid clickbait regardless of style.|The preferred angle changes how the same announcement is framed for editors.
includeSubheadline|Include a subheadline|distribution_settings|toggle|no|5|Select whether to include a subheadline|A subheadline will be included only when it adds useful context.|Some newsroom and wire formats benefit from a supporting line, while others require a leaner presentation.
includeNotesToEditors|Include notes to editors|distribution_settings|toggle|no|5|Select whether to include notes to editors|Use for background details, asset availability, interview access, or editorial clarification.|Notes to editors are useful for media distribution but unnecessary for many public newsroom releases.
notesToEditors|Notes to editors content|distribution_settings|textarea|no|1500|Add media assets, interview availability, background notes, pronunciations, or access details.|Keep information factual and separate from the public release body.|The model cannot infer which additional resources or media arrangements are available.
embargoStatus|Embargo status|compliance_final_details|select|no|30|Select release timing|Do not select an embargo unless recipients have agreed to respect it.|Release timing changes the status line and may create a significant distribution restriction.
embargoDate|Embargo date|compliance_final_details|date|no|10|Select the embargo end date|The exact time and time zone may be added in Additional Requirements.|An embargo date must be supplied explicitly and must never be guessed.
additionalRequirements|Additional requirements|compliance_final_details|textarea|no|2000|Add jurisdiction, time zone, required wording, formatting rules, or other final instructions.|Use only for important details not covered elsewhere.|It provides one controlled place for legitimate requirements that do not justify separate fields.
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
  if (sourceType === "date") return { type: "text" };
  if (sourceType === "toggle") return { type: "select" };
  if (sourceType === "multi-select") return { type: "textarea" };
  return { type: sourceType };
}

function helpAvoidFor(field) {
  if (field.key === "announcementSummary") {
    return "Avoid turning this into final copy, adding claims not approved for publication, or burying the actual announcement.";
  }
  if (field.key === "keyFacts") {
    return "Avoid unverified numbers, invented dates, unsupported names, vague superlatives, or facts that are not public.";
  }
  if (field.key === "releaseDate" || field.key === "datelineLocation") {
    return "Avoid guessed dates, cities, countries, time zones, or locations chosen only for prestige.";
  }
  if (field.key === "supportingEvidence") {
    return "Avoid unsupported statistics, missing methodology, unclear sample sizes, or comparisons without a basis.";
  }
  if (field.key === "sensitiveClaims") {
    return "Avoid general style preferences when the field should capture concrete prohibited claims or legal boundaries.";
  }
  if (field.key === "quoteSpeakers" || field.key === "approvedQuotes") {
    return "Avoid invented quotations, unapproved speakers, altered meanings, fake titles, or statements presented as approved when they are only draft ideas.";
  }
  if (field.key === "companyWebsite") {
    return "Avoid invented URLs, tracking-modified links, unrelated pages, or links that are not approved for publication.";
  }
  if (field.key === "mediaContact") {
    return "Avoid private personal details, guessed email formats, personal social profiles, or contact information not approved for publication.";
  }
  if (field.key === "embargoDate") {
    return "Avoid approximate dates, missing time-zone details, or embargoes that recipients have not agreed to respect.";
  }
  if (field.required) {
    return "Avoid vague placeholders, missing facts, unsupported claims, or information that is not approved for public use.";
  }
  return "Avoid guessed facts, promotional exaggeration, fake urgency, fake scarcity, unsupported superlatives, private data, or unapproved claims.";
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
        ? `Provide the ${label.toLowerCase()} for this press release.`
        : `Optional context for the ${label.toLowerCase()} field.`,
      why,
      example: `Good example: ${examples[key] ?? placeholder}`,
      avoid: helpAvoidFor({ key, required }),
    },
  };

  if (adapted.format) field.format = adapted.format;
  if (defaultValues[key]) field.defaultValue = defaultValues[key];
  if (maxLengthRaw) field.maxLength = Number(maxLengthRaw.replace(/,/g, ""));
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
  slug: "press-release",
  title: "Press Release",
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
