/**
 * Builds Case Study form schema from the UX brief (47 Complex fields).
 * Does NOT modify the prompt text — only form metadata for UX.
 *
 * Usage: node scripts/build-case-study-form.mjs
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
  "case-study.txt",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "case-study-variables.json",
);

function extractVars(prompt) {
  const set = new Set();
  const re = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  let m;
  while ((m = re.exec(prompt))) set.add(m[1]);
  return [...set];
}

const GROUP_MAP = {
  essentials: {
    id: "essentials",
    title: "Essentials",
    description:
      "Subject, type, goal, audience, client, challenge, solution, results, destination, language, length, sources.",
    defaultOpen: true,
  },
  audience: {
    id: "audience",
    title: "Audience & Positioning",
    description:
      "Industry context, profile, decision stage, angle, differentiator, objections, alternatives.",
    defaultOpen: false,
  },
  facts: {
    id: "facts",
    title: "Facts & Evidence",
    description:
      "Baseline, implementation, timeline, metrics, qualitative outcomes, sources, quotes, limitations.",
    defaultOpen: false,
  },
  brand: {
    id: "brand",
    title: "Brand & Presentation",
    description:
      "Tone, voice, perspective, editorial format, terminology, visuals, extra context.",
    defaultOpen: false,
  },
  publishing: {
    id: "publishing",
    title: "Publishing & Conversion",
    description: "CTA, link, SEO keyword, related offer, and optional extras.",
    defaultOpen: false,
  },
  privacy: {
    id: "privacy",
    title: "Privacy, Approval & Compliance",
    description:
      "Privacy mode, anonymization, approval, regulated topics, jurisdiction, restrictions, as-of date.",
    defaultOpen: false,
  },
};

const REQUIRED = new Set([
  "caseStudySubject",
  "primaryGoal",
  "targetAudience",
  "clientDisplayName",
  "challengeSummary",
  "solutionSummary",
  "resultsSummary",
  "outputLanguage",
]);

const SHOW_WHEN = {
  ctaLink: { key: "ctaGoal", notEquals: "No CTA" },
  ctaText: { key: "ctaGoal", notEquals: "No CTA" },
  anonymizationDetails: {
    key: "privacyMode",
    equals: [
      "Anonymize organization",
      "Anonymize people only",
      "Fully anonymized",
    ],
  },
  jurisdiction: { key: "regulatedTopic", notEquals: "None" },
};

/** Full field schema from the Case Study UX brief (order preserved). */
const FIELDS = [
  {
    key: "caseStudySubject",
    label: "Case study subject",
    group: "essentials",
    type: "text",
    placeholder: "Example: CRM migration for a regional logistics company",
    helper:
      "Name the product, service, project, campaign, initiative, or change being documented.",
    why: "It establishes the central subject and prevents the case study from becoming vague.",
  },
  {
    key: "caseStudyType",
    label: "Case study type",
    group: "essentials",
    type: "select",
    default: "Customer success",
    placeholder: "Select the closest format",
    helper: "Choose the type that best matches the supplied story.",
    options: [
      "Customer success",
      "Implementation story",
      "Internal project",
      "Research or pilot",
      "Nonprofit or public impact",
      "Transformation story",
    ],
    why: "Different case study types require different framing, evidence language, and conclusions.",
  },
  {
    key: "primaryGoal",
    label: "Primary goal",
    group: "essentials",
    type: "select",
    default: "Build trust",
    placeholder: "Choose the main purpose",
    helper: "Select the most important outcome this case study should support.",
    options: [
      "Build trust",
      "Support sales",
      "Explain implementation",
      "Demonstrate impact",
      "Educate prospects",
      "Document learning",
      "Strengthen authority",
      "Other",
    ],
    why: "The goal determines what the case study emphasizes and how it concludes.",
  },
  {
    key: "targetAudience",
    label: "Target audience",
    group: "essentials",
    type: "textarea",
    placeholder:
      "Example: Operations leaders at mid-sized logistics companies evaluating CRM systems",
    helper:
      "Describe who should read the case study and what they are likely evaluating.",
    why: "Audience context materially changes terminology, evidence depth, objections, and calls to action.",
  },
  {
    key: "clientDisplayName",
    label: "Client or subject name",
    group: "essentials",
    type: "text",
    placeholder: "Example: Northbridge Logistics or Anonymous healthcare provider",
    helper: "Enter the approved public name or a temporary anonymous label.",
    why: "The draft requires a consistent way to identify the organization, team, person, or project.",
  },
  {
    key: "challengeSummary",
    label: "Challenge",
    group: "essentials",
    type: "textarea",
    placeholder:
      "Describe the situation, problem, constraints, and why action was needed.",
    helper: "Include only challenges that can be stated accurately and publicly.",
    why: "A case study needs a clear starting problem against which the solution and results can be understood.",
  },
  {
    key: "solutionSummary",
    label: "Solution provided",
    group: "essentials",
    type: "textarea",
    placeholder:
      "Explain what was introduced, changed, delivered, or implemented.",
    helper: "Focus on the actual approach rather than broad promotional claims.",
    why: "It defines what action produced or contributed to the reported outcome.",
  },
  {
    key: "resultsSummary",
    label: "Results summary",
    group: "essentials",
    type: "textarea",
    placeholder:
      "List measurable or qualitative outcomes, including timeframes where known.",
    helper:
      "Use supplied results only; qualitative improvements are acceptable when numbers are unavailable.",
    why: "Results are the core evidence of a case study and determine whether claims can be made credibly.",
  },
  {
    key: "publicationDestination",
    label: "Publication destination",
    group: "essentials",
    type: "select",
    default: "Website page",
    placeholder: "Choose the main destination",
    helper:
      "The structure and formatting will be adapted to the selected destination.",
    options: [
      "Website page",
      "PDF or downloadable asset",
      "Sales enablement",
      "Portfolio",
      "Knowledge base",
      "Email or newsletter feature",
      "Multi-channel reuse",
    ],
    why: "A website article, sales asset, portfolio story, and internal document require different presentation choices.",
  },
  {
    key: "outputLanguage",
    label: "Output language",
    group: "essentials",
    type: "text",
    default: "English",
    placeholder: "Example: English, Ukrainian, German",
    helper: "Specify the language for the complete generated package.",
    why: "The output language cannot always be inferred safely from source material.",
  },
  {
    key: "desiredLength",
    label: "Case study length",
    group: "essentials",
    type: "select",
    default: "Standard: 900–1,500 words",
    placeholder: "Select the preferred depth",
    helper:
      "The range applies mainly to the full case study, not editorial notes or optional extras.",
    options: [
      "Executive one-pager: 500–800 words",
      "Concise: 600–900 words",
      "Standard: 900–1,500 words",
      "Detailed: 1,500–2,500 words",
    ],
    why: "The appropriate level of implementation detail depends on the intended use.",
  },
  {
    key: "sourceMaterial",
    label: "Source material",
    group: "essentials",
    type: "textarea",
    placeholder:
      "Paste notes, interview excerpts, existing copy, project summaries, or approved source facts.",
    helper:
      "Include the strongest available factual material. Do not include confidential data without authorization.",
    why: "Existing source material improves specificity while reducing the risk of unsupported assumptions.",
  },
  {
    key: "industryContext",
    label: "Industry context",
    group: "audience",
    type: "textarea",
    placeholder:
      "Describe relevant market conditions, regulations, workflows, or industry pressures.",
    helper:
      "Add only context that is necessary for readers to understand the challenge.",
    why: "Industry context can explain why the challenge mattered without forcing the model to invent market conditions.",
  },
  {
    key: "clientProfile",
    label: "Client or subject profile",
    group: "audience",
    type: "textarea",
    placeholder:
      "Example: Team size, business model, location, customer type, or operating environment",
    helper: "Include only profile details approved for use.",
    why: "Relevant scale and operating context help readers judge whether the example resembles their situation.",
  },
  {
    key: "buyingStage",
    label: "Reader decision stage",
    group: "audience",
    type: "select",
    default: "Auto",
    placeholder: "Choose or let the model decide",
    helper:
      "Controls how much education, proof, implementation detail, and conversion language to include.",
    options: [
      "Auto",
      "Awareness",
      "Consideration",
      "Evaluation",
      "Decision",
      "Post-purchase or internal",
    ],
    why: "Readers at different stages need different levels of evidence and product detail.",
  },
  {
    key: "storyAngle",
    label: "Story angle",
    group: "audience",
    type: "select",
    default: "Auto",
    placeholder: "Choose the main narrative emphasis",
    helper:
      "Select an angle only when one part of the story should clearly lead.",
    options: [
      "Auto",
      "Problem-to-result",
      "Implementation journey",
      "Before-and-after",
      "Operational improvement",
      "Innovation or transformation",
      "Lessons learned",
    ],
    why: "The angle determines narrative order without requiring multiple separate strategy fields.",
  },
  {
    key: "keyDifferentiator",
    label: "Key differentiator",
    group: "audience",
    type: "textarea",
    placeholder:
      "What was distinctive about the approach, process, expertise, or solution?",
    helper:
      "Use factual distinctions rather than unsupported claims of superiority.",
    why: "It helps the case study communicate why the selected approach was relevant without becoming generic.",
  },
  {
    key: "audienceObjections",
    label: "Audience objections",
    group: "audience",
    type: "multi-select",
    placeholder: "Select objections the story should address",
    helper:
      "Choose only concerns that are genuinely relevant to the intended reader.",
    options: [
      "Credibility",
      "Cost",
      "Implementation effort",
      "Time to value",
      "Technical fit",
      "Risk or disruption",
      "Team adoption",
      "Proof of results",
    ],
    why: "Relevant objections influence which evidence and implementation details should be emphasized.",
  },
  {
    key: "competitiveContext",
    label: "Alternative approaches",
    group: "audience",
    type: "textarea",
    placeholder:
      "Mention prior methods, internal processes, or alternatives that may be discussed.",
    helper:
      "Do not make negative competitor claims unless they are documented and approved.",
    why: "Alternatives can clarify the decision without creating unsupported comparisons.",
  },
  {
    key: "baselineAndContext",
    label: "Starting point and baseline",
    group: "facts",
    type: "textarea",
    placeholder:
      "Describe the situation before implementation, including baseline metrics when available.",
    helper:
      "Include dates, measurement periods, definitions, and scope where known.",
    why: "Results are more meaningful when readers can understand the initial condition and measurement basis.",
  },
  {
    key: "implementationDetails",
    label: "Implementation details",
    group: "facts",
    type: "textarea",
    placeholder:
      "Describe major phases, decisions, integrations, activities, or process changes.",
    helper: "Include enough detail to explain how the solution was applied.",
    why: "It distinguishes a credible case study from a simple testimonial or promotional claim.",
  },
  {
    key: "implementationTimeline",
    label: "Timeline",
    group: "facts",
    type: "textarea",
    placeholder:
      "Example: Discovery in January, rollout over eight weeks, results measured after six months",
    helper: "Include only confirmed dates, durations, and milestones.",
    why: "Timeframes help readers interpret implementation effort and reported outcomes accurately.",
  },
  {
    key: "measurableResults",
    label: "Measurable results",
    group: "facts",
    type: "textarea",
    placeholder:
      "List metrics with values, periods, units, baselines, and measurement methods when known.",
    helper:
      "Do not estimate missing percentages or convert qualitative statements into numbers.",
    why: "Structured metric input supports accurate results sections and prevents invented performance figures.",
  },
  {
    key: "qualitativeOutcomes",
    label: "Qualitative outcomes",
    group: "facts",
    type: "textarea",
    placeholder:
      "Example: Easier onboarding, fewer handoff problems, stronger team confidence",
    helper:
      "Describe observable non-numeric changes without presenting them as measured statistics.",
    why: "Many valid outcomes are important but cannot be represented by a reliable metric.",
  },
  {
    key: "evidenceAndSources",
    label: "Evidence and sources",
    group: "facts",
    type: "textarea",
    placeholder:
      "List reports, analytics, interviews, documents, surveys, or approved source links.",
    helper: "Identify what supports each important result or factual claim.",
    why: "Case-study claims require a clear evidence trail even when public citations are not displayed.",
  },
  {
    key: "approvedQuotes",
    label: "Approved quotations",
    group: "facts",
    type: "textarea",
    placeholder:
      "Paste approved quotes with speaker name, role, and organization where permitted.",
    helper: "Only supplied quotations may be used as direct quotes.",
    why: "Direct quotations must never be generated or attributed without approved source wording.",
  },
  {
    key: "limitationsAndCaveats",
    label: "Limitations and caveats",
    group: "facts",
    type: "textarea",
    placeholder:
      "Note data limits, external factors, incomplete measurements, or results that may not generalize.",
    helper: "Include anything readers need to interpret the outcome fairly.",
    why: "Transparent limitations improve credibility and reduce misleading causal claims.",
  },
  {
    key: "tone",
    label: "Tone",
    group: "brand",
    type: "select",
    default: "Clear and credible",
    placeholder: "Select the preferred tone",
    helper:
      "The tone affects delivery but never overrides accuracy or evidence requirements.",
    options: [
      "Clear and credible",
      "Executive and concise",
      "Technical and precise",
      "Warm and human",
      "Editorial and analytical",
      "Bold but evidence-led",
      "Plain and practical",
      "Match brand voice",
    ],
    why: "Tone changes how the same evidence is presented to different audiences.",
  },
  {
    key: "brandVoice",
    label: "Brand voice",
    group: "brand",
    type: "textarea",
    placeholder:
      "Describe preferred voice, sentence style, formality, and examples of wording to follow.",
    helper: "Leave blank for a natural, professional, evidence-led voice.",
    why: "Specific brand guidance improves consistency without forcing several separate style fields.",
  },
  {
    key: "narrativePerspective",
    label: "Narrative perspective",
    group: "brand",
    type: "select",
    default: "Third-person",
    placeholder: "Choose how the story should be told",
    helper:
      "Interview-led output still uses only supplied and approved quotations.",
    options: [
      "Third-person",
      "First-person plural",
      "Interview-led",
      "Auto",
    ],
    why: "Perspective materially affects voice, attribution, and the relationship between narrator and subject.",
  },
  {
    key: "outputStyle",
    label: "Editorial format",
    group: "brand",
    type: "select",
    default: "Balanced narrative",
    placeholder: "Select the presentation style",
    helper: "Choose the structure that best suits the destination and reader.",
    options: [
      "Balanced narrative",
      "Executive brief",
      "Detailed implementation story",
      "Data-led report",
      "Human-centered story",
      "Auto",
    ],
    why: "A technical implementation report and a human-centered transformation story should not share an identical structure.",
  },
  {
    key: "terminologyPreferences",
    label: "Terminology preferences",
    group: "brand",
    type: "textarea",
    placeholder:
      "List preferred terms, capitalization, product names, and wording to avoid.",
    helper: "Use this for brand terminology rather than general writing instructions.",
    why: "Accurate names and approved terminology are important in client-facing business content.",
  },
  {
    key: "visualEvidenceAvailable",
    label: "Available visual evidence",
    group: "brand",
    type: "textarea",
    placeholder:
      "Example: Dashboard screenshots, process photos, charts, diagrams, before-and-after interface views",
    helper: "List real assets that may support visual callout recommendations.",
    why: "Visual recommendations should be based on assets that actually exist.",
  },
  {
    key: "additionalContext",
    label: "Additional context",
    group: "brand",
    type: "textarea",
    placeholder: "Add any relevant requirement not covered elsewhere.",
    helper:
      "Use one place for important miscellaneous context, exclusions, or preferences.",
    why: "It captures meaningful exceptions without creating several low-value specialist fields.",
  },
  {
    key: "ctaGoal",
    label: "Call-to-action goal",
    group: "publishing",
    type: "select",
    default: "Auto",
    placeholder: "Choose the preferred next step",
    helper:
      "Use one proportional action that fits the case study and reader stage.",
    options: [
      "Auto",
      "Book a demo or consultation",
      "Contact sales or team",
      "Start a trial or application",
      "Download a resource",
      "View related work",
      "No CTA",
    ],
    why: "The closing action should reflect the actual conversion goal rather than a generic sales request.",
  },
  {
    key: "ctaLink",
    label: "CTA destination",
    group: "publishing",
    type: "URL",
    placeholder: "https://example.com/next-step",
    helper: "Enter the real destination. The model must not invent a URL.",
    why: "A usable CTA requires an accurate destination when one is available.",
  },
  {
    key: "ctaText",
    label: "Preferred CTA wording",
    group: "publishing",
    type: "text",
    placeholder: "Example: See how the workflow could fit your team",
    helper: "Leave blank for an automatically written, non-aggressive CTA.",
    why: "Some brands require approved action wording or a specific conversion phrase.",
  },
  {
    key: "seoKeyword",
    label: "Primary SEO keyword",
    group: "publishing",
    type: "text",
    placeholder: "Example: logistics CRM implementation case study",
    helper:
      "Use only when the case study will be published on a discoverable web page.",
    why: "A supplied search phrase can guide metadata and headings without turning the case study into keyword-stuffed copy.",
  },
  {
    key: "conversionOffer",
    label: "Related offer",
    group: "publishing",
    type: "textarea",
    placeholder:
      "Describe the service, product, consultation, resource, or next step connected to the CTA.",
    helper: "Include only real offer details and avoid unsupported promises.",
    why: "The CTA should connect naturally to an actual offer rather than introduce an invented service.",
  },
  {
    key: "optionalExtras",
    label: "Optional output extras",
    group: "publishing",
    type: "multi-select",
    placeholder: "Select reusable assets to include",
    helper: "Choose only assets that will be used with the case study.",
    options: [
      "SEO metadata",
      "Visual callouts",
      "Social teaser",
      "One-page summary",
      "Sales slide summary",
      "Pull quotes",
    ],
    why: "It allows useful repurposing without adding every possible asset to every output.",
  },
  {
    key: "privacyMode",
    label: "Privacy mode",
    group: "privacy",
    type: "select",
    default: "Use supplied names",
    placeholder: "Choose how identities should appear",
    helper:
      "Select anonymization when public use of names or identifying details is not approved.",
    options: [
      "Use supplied names",
      "Anonymize organization",
      "Anonymize people only",
      "Fully anonymized",
    ],
    why: "Case studies frequently contain client, employee, project, or commercially sensitive identities.",
  },
  {
    key: "anonymizationDetails",
    label: "Anonymization instructions",
    group: "privacy",
    type: "textarea",
    placeholder:
      "Specify replacement labels and details that must be generalized, removed, or preserved.",
    helper:
      "Do not include clues that would unintentionally identify the subject.",
    why: "Different anonymization workflows require explicit control over what remains identifiable.",
  },
  {
    key: "approvalStatus",
    label: "Approval status",
    group: "privacy",
    type: "select",
    default: "Draft—approval pending",
    placeholder: "Select the current approval level",
    helper:
      "The output will distinguish draft material from content approved for publication.",
    options: [
      "Draft—approval pending",
      "Facts approved",
      "Quotes approved",
      "Fully approved for publication",
      "Internal use only",
    ],
    why: "The model must not imply that facts, quotes, or publication rights have been approved when they have not.",
  },
  {
    key: "regulatedTopic",
    label: "Regulated or sensitive topic",
    group: "privacy",
    type: "select",
    default: "None",
    placeholder: "Select only when relevant",
    helper:
      "Used to apply cautious language and identify claims requiring authoritative review.",
    options: [
      "None",
      "Health or medical",
      "Legal",
      "Financial or investment",
      "Insurance",
      "Employment or HR",
      "Safety or security",
      "Political or public affairs",
      "Children or education",
      "Other regulated area",
    ],
    why: "High-stakes case studies require stronger qualification and jurisdiction-aware review.",
  },
  {
    key: "jurisdiction",
    label: "Relevant jurisdiction",
    group: "privacy",
    type: "text",
    placeholder: "Example: United Kingdom, California, European Union",
    helper:
      "Specify the country, state, region, or regulatory environment that may affect claims.",
    why: "Legal, financial, medical, employment, and similar requirements can differ by jurisdiction.",
  },
  {
    key: "restrictionsAndDisclosures",
    label: "Restrictions and disclosures",
    group: "privacy",
    type: "textarea",
    placeholder:
      "List prohibited claims, required disclosures, relationship disclosures, or confidentiality limits.",
    helper:
      "Include only applicable restrictions rather than generic legal language.",
    why: "The case study may require specific claim exclusions, commercial disclosures, or confidentiality protections.",
  },
  {
    key: "asOfDate",
    label: "Information current as of",
    group: "privacy",
    type: "date",
    placeholder: "YYYY-MM-DD",
    helper:
      "Useful when results, product capabilities, team details, or project status may change.",
    why: "A factual cutoff prevents changing results or capabilities from being presented as permanently current.",
  },
];

function mapType(briefType) {
  if (briefType === "textarea") return "textarea";
  if (briefType === "select") return "select";
  if (briefType === "number") return "number";
  if (briefType === "URL") return "text";
  if (briefType === "date") return "text";
  if (briefType === "multi-select") return "textarea";
  return "text";
}

function multiSelectHelper(raw) {
  if (raw.type !== "multi-select" || !raw.options?.length) return null;
  return (
    (raw.helper ? raw.helper + " " : "") +
    "Select all that apply (one per line). Options: " +
    raw.options.join("; ") +
    "."
  );
}

function buildField(raw) {
  const groupMeta = GROUP_MAP[raw.group] || GROUP_MAP.essentials;
  const type = mapType(raw.type);
  const options =
    raw.type === "select" && raw.options?.length
      ? [...raw.options]
      : undefined;
  const multiHelper = multiSelectHelper(raw);

  const help = {
    what: raw.label + ".",
    why: raw.why || raw.helper || `Used as ${raw.key} in the case study brief.`,
    example:
      raw.default && raw.default !== "Blank"
        ? raw.default
        : raw.placeholder || "A short factual value you can verify.",
    avoid:
      "Invented metrics, fabricated quotes, unsupported superiority claims, or private details without approval.",
  };

  const field = {
    key: raw.key,
    label: raw.label,
    placeholder:
      raw.type === "multi-select" && raw.options?.length
        ? raw.options.join("\n")
        : raw.placeholder || "Optional — leave blank if unknown",
    required: REQUIRED.has(raw.key),
    type,
    group: groupMeta.id,
    groupTitle: groupMeta.title,
    hint: multiHelper || raw.helper || help.what,
    help,
    fullWidth: type === "textarea",
  };

  if (options?.length) field.options = options;
  if (raw.default && raw.default !== "Blank") field.defaultValue = raw.default;
  if (SHOW_WHEN[raw.key]) field.showWhen = SHOW_WHEN[raw.key];

  return field;
}

function main() {
  const prompt = fs.readFileSync(promptPath, "utf8");
  const promptKeys = new Set(extractVars(prompt));

  if (FIELDS.length !== 47) {
    console.warn(`Expected 47 fields in FIELDS array, got ${FIELDS.length}`);
  }

  const fields = FIELDS.map(buildField);

  for (const f of fields) {
    if (!promptKeys.has(f.key)) {
      console.warn(`Schema key missing from prompt: ${f.key}`);
    }
  }
  for (const k of promptKeys) {
    if (!fields.some((f) => f.key === k)) {
      console.warn(`Prompt key missing from schema: ${k}`);
    }
  }

  const used = new Set(fields.map((f) => f.group));
  const groups = Object.values(GROUP_MAP).filter((g) => used.has(g.id));

  const payload = {
    slug: "case-study",
    title: "Case Study",
    version: 1,
    generatedAt: new Date().toISOString(),
    fieldCount: fields.length,
    requiredKeys: fields.filter((f) => f.required).map((f) => f.key),
    groups,
    variables: fields,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(
    `Wrote ${outPath} — ${fields.length} fields, ${groups.length} groups, required: ${payload.requiredKeys.join(", ")}`,
  );
}

main();
