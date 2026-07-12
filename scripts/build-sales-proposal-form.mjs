/**
 * Builds the Sales Proposal form schema from the approved 42-field
 * specification. It verifies that every prompt variable has exactly one form
 * field before writing the form JSON.
 *
 * Usage: node scripts/build-sales-proposal-form.mjs
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
  "sales-proposal.txt",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "sales-proposal-variables.json",
);

const groups = [
  {
    id: "essentials",
    title: "Essentials",
    description:
      "Provider, client, offer, proposal context, client needs, decision audience, goal, next step, language, and length.",
    defaultOpen: true,
  },
  {
    id: "client_strategy",
    title: "Client Strategy",
    description:
      "Relationship stage, market context, decision criteria, stakeholders, positioning, alternatives, and objections.",
    defaultOpen: false,
  },
  {
    id: "scope_delivery",
    title: "Scope & Delivery",
    description:
      "Deliverables, method, phases, timeline, start date, client responsibilities, assumptions, and exclusions.",
    defaultOpen: false,
  },
  {
    id: "pricing_commercial_terms",
    title: "Pricing & Commercial Terms",
    description:
      "Optional pricing model, prices, currency, payment terms, add-ons, validity, and commercial notes.",
    defaultOpen: false,
  },
  {
    id: "evidence_brand_output",
    title: "Evidence, Brand & Output",
    description:
      "Differentiators, proof, source material, brand voice, tone, proposal features, and final requirements.",
    defaultOpen: false,
  },
];

const defaultValues = {
  proposalGoal: "Win approval",
  primaryNextStep: "Auto",
  outputLanguage: "English",
  proposalLength: "Standard",
  relationshipStage: "Auto",
  positioningPriority: "Auto",
  includePricing: "Off",
  pricingModel: "Auto",
  tone: "Clear and consultative",
  outputFeatures: "Executive snapshot, Acceptance block",
};

const options = {
  proposalGoal: [
    "Auto",
    "Win approval",
    "Secure budget",
    "Start a pilot",
    "Replace a provider",
    "Expand an engagement",
    "Renew an agreement",
    "Respond to an RFP",
  ],
  proposalLength: ["Auto", "Brief", "Standard", "Detailed"],
  relationshipStage: [
    "Auto",
    "New prospect",
    "After discovery",
    "Requested proposal",
    "Formal RFP",
    "Renewal",
    "Expansion",
    "Partnership discussion",
  ],
  positioningPriority: [
    "Auto",
    "ROI and value",
    "Speed",
    "Quality",
    "Risk reduction",
    "Expertise",
    "Flexibility",
    "Long-term partnership",
  ],
  includePricing: ["Off", "On"],
  pricingModel: [
    "Auto",
    "Fixed fee",
    "Time and materials",
    "Retainer",
    "Subscription",
    "Per unit",
    "Tiered packages",
    "Custom or mixed",
  ],
  tone: [
    "Auto",
    "Clear and consultative",
    "Confident",
    "Formal",
    "Warm",
    "Technical",
    "Executive",
    "Direct",
  ],
  outputFeatures: [
    "Cover page",
    "Contents",
    "Executive snapshot",
    "Implementation table",
    "Risk table",
    "Acceptance block",
    "Email cover note",
  ],
};

const showWhen = {
  pricingModel: { key: "includePricing", equals: "On" },
  pricingDetails: { key: "includePricing", equals: "On" },
  currencyAndTax: { key: "includePricing", equals: "On" },
  paymentTerms: { key: "includePricing", equals: "On" },
  optionalAddOns: { key: "includePricing", equals: "On" },
  proposalValidUntil: { key: "includePricing", equals: "On" },
  commercialNotes: { key: "includePricing", equals: "On" },
};

const examples = {
  providerName: "Acme Consulting",
  clientName: "Northstar Retail Group",
  offerName: "Customer Support Automation Program",
  offerOverview:
    "A six-week implementation that maps support workflows, configures automation, trains the team, and hands over reporting.",
  clientSituation:
    "The client handles support through shared inboxes and wants a clearer escalation process before seasonal demand increases.",
  clientChallenges:
    "Slow response times, inconsistent routing, limited reporting, and manual status updates.",
  desiredOutcomes:
    "Reduce manual triage, improve visibility into response times, and create a repeatable support workflow.",
  decisionAudience:
    "COO, head of support, procurement manager, and technical reviewer.",
  proposalGoal: "Win approval",
  primaryNextStep: "Schedule a proposal review call",
  outputLanguage: "English",
  proposalLength: "Standard",
  relationshipStage: "After discovery",
  industryContext:
    "Retail support volume increases during Q4 and requires faster escalation handling.",
  decisionCriteria:
    "Implementation speed, low disruption, reporting visibility, support quality, and total cost.",
  stakeholdersAndRoles:
    "Head of support owns workflow approval; IT reviews integrations; procurement reviews terms.",
  positioningPriority: "Risk reduction",
  competitorsOrAlternatives:
    "Internal workflow cleanup and one other automation provider.",
  objectionsAndRisks:
    "Concern about team adoption, migration effort, and unclear ownership after launch.",
  deliverables:
    "Workflow map, automation configuration, team training, reporting dashboard, and handover guide.",
  approachAndMethod:
    "Discovery, configuration, review cycles, pilot testing, training, and handover.",
  phasesAndMilestones:
    "Week 1 discovery, weeks 2-4 configuration, week 5 pilot, week 6 training and handover.",
  timeline: "Six weeks after contract signature and access to required systems.",
  proposedStartDate: "2026-09-14",
  clientResponsibilities:
    "Provide system access, approve workflows, attend review sessions, and nominate a support owner.",
  assumptions:
    "Client systems remain available and integration scope stays within the approved support tools.",
  exclusions:
    "Custom software development, 24/7 managed support, and third-party license fees.",
  includePricing: "On",
  pricingModel: "Fixed fee",
  pricingDetails: "Implementation package: $12,000 fixed fee.",
  currencyAndTax: "USD excluding applicable taxes",
  paymentTerms: "50% deposit, 50% on handover.",
  optionalAddOns:
    "Monthly reporting review, additional training sessions, and extended support.",
  proposalValidUntil: "2026-10-01",
  commercialNotes:
    "Third-party software licenses are billed directly by the vendor.",
  differentiators:
    "Prior experience implementing support workflows for retail operations teams.",
  proofAndCaseExamples:
    "Approved case example: reduced manual routing steps for a regional retailer.",
  referencesAndSources:
    "Discovery notes, support workflow audit, and approved pricing sheet.",
  brandVoice: "Professional, practical, collaborative, and concise.",
  tone: "Clear and consultative",
  outputFeatures:
    "Executive snapshot, Implementation table, Risk table, Acceptance block, Email cover note",
  additionalRequirements:
    "Avoid guaranteed ROI claims and mark any missing integration details for review.",
};

const fieldRows = `
providerName|Provider or company name|essentials|text|yes|160|Acme Consulting or Jane Smith|The business, agency, consultant, or provider submitting the proposal.|The proposal must clearly identify the party offering the solution.
clientName|Client or organization|essentials|text|yes|160|Northstar Retail Group|The company, team, or individual receiving the proposal.|A sales proposal must be tailored to a specific recipient rather than written generically.
offerName|Solution or offer name|essentials|text|yes|180|Customer Support Automation Program|Name the service, project, product, package, or solution being proposed.|The offer name anchors the title, solution description, and scope.
offerOverview|Offer overview|essentials|textarea|yes|1200|Explain what you are proposing, how it works, and what it includes at a high level.|Describe the proposed solution without relying on unsupported marketing claims.|The model cannot accurately define the proposed solution without the provider’s actual offer details.
clientSituation|Client’s current situation|essentials|textarea|yes|1500|Describe the client’s current process, environment, opportunity, or relevant background.|Include only known information and avoid assumptions about the client.|The proposal must demonstrate an accurate understanding of the client’s starting point.
clientChallenges|Challenges to address|essentials|textarea|yes|1500|List the main problems, constraints, inefficiencies, or risks the proposal should address.|Combine related problems instead of listing every minor symptom separately.|The proposal’s argument and scope must connect directly to the client’s actual challenges.
desiredOutcomes|Desired outcomes|essentials|textarea|yes|1200|What should improve, change, or become possible if the project succeeds?|Use realistic goals; include measurable targets only when they are approved.|The proposal must explain the value and intended destination of the engagement.
decisionAudience|Decision audience|essentials|textarea|yes|800|CEO, operations director, procurement team, technical reviewers, or other readers.|Describe the people who will review, influence, approve, or use the proposal.|Content depth, terminology, evidence, and commercial emphasis depend on the buying audience.
proposalGoal|Proposal goal|essentials|select|no||Select the main goal|Choose the primary commercial outcome the proposal should support.|Different proposal goals require different emphasis, next steps, and levels of detail.
primaryNextStep|Preferred next step|essentials|text|no|180|Schedule a review call, approve the scope, sign, or start a pilot.|Leave as Auto for the model to choose one appropriate low-friction action.|A proposal needs one clear and commercially appropriate action for the client.
outputLanguage|Output language|essentials|text|yes|50|English|Enter the language in which the complete proposal should be written.|The language cannot always be inferred from company names or source notes.
proposalLength|Proposal length|essentials|select|no||Select the desired depth|Standard suits most proposals; Auto chooses the shortest useful length.|The appropriate depth varies between a simple service offer and a complex multi-phase engagement.
relationshipStage|Sales relationship stage|client_strategy|select|no||Select the current stage|Prevents the proposal from implying conversations or agreements that did not occur.|A new-prospect proposal should read differently from an RFP, renewal, or post-discovery proposal.
industryContext|Industry or market context|client_strategy|text|no|300|Relevant market conditions, regulations, trends, or operational realities.|Add only context that is known and relevant to the decision.|Relevant market context can materially affect urgency, positioning, terminology, and risk.
decisionCriteria|Decision criteria|client_strategy|textarea|no|1000|Budget, implementation speed, security, expertise, support, scalability, or other criteria.|List the factors the client is likely to use when evaluating the proposal.|The proposal should make it easy for decision-makers to evaluate the offer against their real criteria.
stakeholdersAndRoles|Stakeholders and roles|client_strategy|textarea|no|1000|Who approves, evaluates, implements, uses, or funds the proposed work?|Include names only when they are appropriate for the client-facing proposal.|Different stakeholders may require different evidence, explanations, and implementation details.
positioningPriority|Primary positioning angle|client_strategy|select|no||Select the main value angle|Choose the value dimension that should receive the strongest emphasis.|A proposal becomes more persuasive when it prioritizes the value dimension most relevant to the client.
competitorsOrAlternatives|Alternatives being considered|client_strategy|textarea|no|1000|Internal delivery, another provider, delaying the project, or a named alternative.|Include only known alternatives; the proposal will avoid unsupported competitor claims.|The proposal may need to explain relevant trade-offs without attacking competitors.
objectionsAndRisks|Likely objections or concerns|client_strategy|textarea|no|1200|Budget concerns, implementation risk, timing, adoption, security, or internal capacity.|List concerns the proposal should address calmly and factually.|Known objections materially affect scope explanation, evidence, risk handling, and next steps.
deliverables|Deliverables|scope_delivery|textarea|no|2000|List the reports, designs, services, systems, sessions, assets, or other outputs.|Include quantities and formats only when they are confirmed.|Clear deliverables reduce uncertainty and define what the client will receive.
approachAndMethod|Approach and method|scope_delivery|textarea|no|1500|Explain how the work will be performed, managed, reviewed, or validated.|Focus on the process details that help the client evaluate delivery confidence.|The delivery method often differentiates otherwise similar offers.
phasesAndMilestones|Phases and milestones|scope_delivery|textarea|no|1800|Discovery, planning, implementation, testing, launch, handover, or review stages.|Include milestone names, outputs, or approval points when known.|Complex proposals are easier to approve when the work is divided into understandable stages.
timeline|Timeline or duration|scope_delivery|textarea|no|1000|Eight weeks, phased over Q4, or timing dependent on client approvals.|Use ranges or dependencies when exact dates are not confirmed.|Timing is a central evaluation factor in most sales proposals.
proposedStartDate|Proposed start date|scope_delivery|date|no||Select a date|Leave blank when the start depends on approval, contracting, or availability.|A confirmed start date can clarify scheduling without forcing the model to invent one.
clientResponsibilities|Client responsibilities|scope_delivery|textarea|no|1200|Access, approvals, source files, data, feedback, staff availability, or decisions.|Specify what the client must provide for successful delivery.|Client dependencies can affect schedule, cost, and successful implementation.
assumptions|Project assumptions|scope_delivery|textarea|no|1200|State conditions on which the scope, timing, or pricing is based.|Use assumptions to clarify the offer, not to hide important limitations.|Commercial and delivery commitments may depend on specific operating assumptions.
exclusions|Out-of-scope items|scope_delivery|textarea|no|1200|List work, expenses, licenses, support, or services not included.|Include only exclusions that are important for avoiding scope ambiguity.|Explicit exclusions prevent the proposal from unintentionally promising work that is not included.
includePricing|Include pricing|pricing_commercial_terms|toggle|no||Not applicable|Enable this only when approved pricing or commercial terms should appear.|Some proposals include full commercial terms, while others intentionally focus on scope and value.
pricingModel|Pricing model|pricing_commercial_terms|select|no||Select the pricing structure|Choose the commercial model used for the proposed work.|The pricing structure determines how commercial information should be organized and explained.
pricingDetails|Prices and fees|pricing_commercial_terms|textarea|no|2000|List approved prices, rates, package amounts, billing periods, or fee ranges.|Include exact figures only; the model will not invent or estimate missing prices.|Pricing is factual commercial information that must come directly from the provider.
currencyAndTax|Currency and tax treatment|pricing_commercial_terms|text|no|300|EUR excluding VAT, USD including applicable taxes, or similar wording.|Clarify currency and whether taxes are included, excluded, or handled separately.|Prices can be misleading or commercially incomplete without currency and tax treatment.
paymentTerms|Payment terms|pricing_commercial_terms|textarea|no|900|Deposit, milestone billing, monthly invoicing, due dates, or payment schedule.|Enter only approved payment conditions.|Payment timing and structure can materially affect approval and contract expectations.
optionalAddOns|Optional add-ons|pricing_commercial_terms|textarea|no|1200|List optional upgrades, extra services, support plans, or additional packages.|Separate optional items clearly from the required proposal price.|Optional items require clear separation so the client can distinguish base scope from upgrades.
proposalValidUntil|Proposal valid until|pricing_commercial_terms|date|no||Select a date|Use only when the pricing or commercial terms have a genuine validity period.|A real validity date may be commercially important, but must never be invented for urgency.
commercialNotes|Other commercial terms|pricing_commercial_terms|textarea|no|1200|Expenses, travel, licensing, renewal, cancellation, or procurement notes.|Add important commercial conditions not covered by pricing or payment fields.|Some offers contain material commercial conditions that do not fit the main pricing structure.
differentiators|Relevant differentiators|evidence_brand_output|textarea|no|1200|Explain what makes the offer, team, process, or experience especially suitable.|Use specific, supportable differences rather than generic superiority claims.|Differentiators help explain why the proposed provider is a suitable choice.
proofAndCaseExamples|Approved proof and examples|evidence_brand_output|textarea|no|2000|Approved results, case examples, testimonials, credentials, or relevant experience.|Include only material that may be quoted or summarized in the proposal.|Credibility evidence must be supplied and approved rather than fabricated by the model.
referencesAndSources|References or source material|evidence_brand_output|textarea|no|4000|Paste source facts, links, internal notes, RFP requirements, or approved supporting material.|The model will use this material without claiming independent verification.|Source material improves factual accuracy and helps satisfy formal proposal requirements.
brandVoice|Brand voice|evidence_brand_output|textarea|no|800|Professional and practical, premium and concise, friendly and collaborative, or similar.|Describe the established voice rather than general writing-quality rules.|The proposal should sound consistent with the provider’s existing communication style.
tone|Proposal tone|evidence_brand_output|select|no||Select the tone|Choose the overall communication style appropriate for the client and decision.|Tone materially affects how the same commercial proposal is perceived by different audiences.
outputFeatures|Optional proposal features|evidence_brand_output|multi-select|no||Select any additional components|Choose only the structural components useful for this proposal.|Proposal components should reflect the complexity and delivery context rather than follow one fixed document structure.
additionalRequirements|Additional requirements|evidence_brand_output|textarea|no|2000|Add required sections, wording restrictions, confidentiality notes, or other instructions.|Use this for important requirements not already covered by another field.|A single controlled field accommodates genuine exceptions without creating several miscellaneous inputs.
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
  if (sourceType === "toggle") return { type: "select" };
  if (sourceType === "multi-select") return { type: "textarea" };
  return { type: sourceType };
}

function helpAvoidFor(field) {
  if (field.key === "clientSituation" || field.key === "clientChallenges") {
    return "Avoid inventing client problems, prior conversations, approvals, or internal priorities that were not supplied.";
  }
  if (field.key === "desiredOutcomes") {
    return "Avoid guaranteed results, fake ROI, unsupported metrics, or outcomes outside the provider’s control.";
  }
  if (field.key === "deliverables" || field.key === "approachAndMethod") {
    return "Avoid invented quantities, service levels, revision rounds, acceptance criteria, or delivery methods.";
  }
  if (field.key === "pricingDetails" || field.key === "currencyAndTax") {
    return "Avoid estimated prices, hidden fees, invented discounts, missing currency, or unclear tax treatment.";
  }
  if (field.key === "proposalValidUntil") {
    return "Avoid artificial scarcity, fake urgency, or arbitrary validity dates used only to pressure the client.";
  }
  if (field.key === "proofAndCaseExamples") {
    return "Avoid fabricated testimonials, case studies, client names, metrics, ratings, awards, or credentials.";
  }
  if (field.key === "competitorsOrAlternatives") {
    return "Avoid unsupported competitor criticism, fake comparisons, or claims that alternatives cannot work.";
  }
  if (field.required) {
    return "Avoid vague placeholders, unsupported client knowledge, guaranteed outcomes, or facts not approved for the proposal.";
  }
  return "Avoid guessed facts, fake urgency, hidden commercial terms, unsupported claims, private data, or manipulative pressure.";
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
        ? `Provide the ${label.toLowerCase()} for this sales proposal.`
        : `Optional context for the ${label.toLowerCase()} field.`,
      why,
      example: `Good example: ${examples[key] ?? placeholder}`,
      avoid: helpAvoidFor({ key, required }),
    },
  };

  if (defaultValues[key]) field.defaultValue = defaultValues[key];
  if (maxLengthRaw) field.maxLength = Number(maxLengthRaw.replace(/,/g, ""));
  if (sourceType === "date") field.maxLength = 10;
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
  slug: "sales-proposal",
  title: "Sales Proposal",
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
