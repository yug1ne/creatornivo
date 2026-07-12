/**
 * Builds the Product Hunt Launch form schema from the approved 32-field specification.
 * Does NOT modify the prompt text. It verifies that every prompt variable has
 * exactly one form field before writing the form JSON.
 *
 * Usage: node scripts/build-product-hunt-launch-form.mjs
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
  "product-hunt-launch.txt",
);
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "product-hunt-launch-variables.json",
);

const groups = [
  {
    id: "essentials",
    title: "Essentials",
    description:
      "Product identity, destination, audience, problem, outcome, pricing, and launch objective needed for a usable first result.",
    defaultOpen: true,
  },
  {
    id: "positioning_evidence",
    title: "Positioning & Evidence",
    description:
      "Feature prioritization, differentiation, use-case clarity, claim accuracy, and product availability wording.",
    defaultOpen: false,
  },
  {
    id: "maker_story_offer",
    title: "Maker Story & Offer",
    description:
      "Maker comment context, requested feedback, tone, and any real Product Hunt offer.",
    defaultOpen: false,
  },
  {
    id: "launch_assets_controls",
    title: "Launch Assets & Controls",
    description:
      "Launch tags, gallery messaging, demo placement, CTA direction, regulated-content handling, variants, and special requirements.",
    defaultOpen: false,
  },
];

const defaultValues = {
  productType: "Auto",
  launchGoal: "Feedback and early users",
  outputLanguage: "English",
  productStatus: "Live",
  tone: "Natural and maker-led",
  promoAvailable: "Off",
  ctaFocus: "Try it and share feedback",
  regulatedArea: "None",
  variantCount: "3",
};

const options = {
  pricingType: [
    "Free",
    "Freemium",
    "Paid",
    "Paid with free trial",
    "Open source",
    "Custom pricing",
  ],
  productType: [
    "Auto",
    "SaaS or web app",
    "Mobile app",
    "Desktop app",
    "Browser extension",
    "Developer tool or API",
    "Hardware",
    "Marketplace or community",
    "Other",
  ],
  launchGoal: [
    "Feedback and early users",
    "Product awareness",
    "Beta testers",
    "Waitlist sign-ups",
    "Partnerships",
    "Launch validation",
  ],
  productStatus: ["Live", "Public beta", "Private beta", "Waitlist", "Coming soon"],
  tone: [
    "Natural and maker-led",
    "Friendly and concise",
    "Technical and precise",
    "Bold but grounded",
    "Warm and story-led",
  ],
  promoAvailable: ["On", "Off"],
  ctaFocus: [
    "Try it and share feedback",
    "Try the product",
    "Join the waitlist",
    "Request access",
    "Explore the demo",
    "Learn more",
  ],
  regulatedArea: [
    "None",
    "Health or medical",
    "Finance or investing",
    "Legal",
    "Employment or HR",
    "Insurance",
    "Safety or security",
    "Children",
    "Other regulated area",
  ],
  variantCount: ["1", "3", "5"],
};

const showWhen = {
  promoDetails: { key: "promoAvailable", equals: "On" },
  jurisdiction: { key: "regulatedArea", notEquals: "None" },
};

const examples = {
  productName: "Creatornivo",
  productUrl: "https://www.creatornivo.com",
  productSummary:
    "A structured AI workspace that helps creators turn briefs into platform-ready content.",
  targetAudience: "Solo founders, marketers, and creators publishing weekly.",
  coreProblem: "Blank-page friction and inconsistent prompting slow down content production.",
  keyOutcome: "Create more consistent first drafts without rebuilding every prompt.",
  pricingType: "Freemium",
  productType: "SaaS or web app",
  launchGoal: "Feedback and early users",
  outputLanguage: "English",
  keyFeatures: "Template library, saved prompts, generation limits, Markdown export.",
  mainUseCases: "LinkedIn posts, newsletters, launch copy, product descriptions.",
  differentiation:
    "Template-first generation with honest limits and no fake social proof.",
  proofPoints: "Use only verified launch facts and product capabilities.",
  availability: "Public beta is available on the website.",
  productStatus: "Public beta",
  competitorContext:
    "Alternative to rebuilding prompts manually in a general AI chat interface.",
  makerNames: "Alex, solo founder and builder.",
  makerStory:
    "Built after noticing creators repeating the same prompt setup for every channel.",
  buildJourney:
    "Started with core templates, then added saved prompts, usage limits, and billing.",
  feedbackRequest:
    "Which templates would make your weekly publishing workflow easier?",
  tone: "Natural and maker-led",
  promoAvailable: "Off",
  promoDetails: "Launch week Pro plan discount for Product Hunt visitors.",
  launchTags: "Productivity, Marketing, Writing",
  galleryPlan:
    "Hero screenshot, template picker, generation form, saved content library.",
  demoVideoUrl: "https://www.youtube.com/watch?v=example",
  ctaFocus: "Try it and share feedback",
  regulatedArea: "None",
  jurisdiction: "United States",
  variantCount: "3",
  additionalRequirements: "Avoid fake urgency, fake rankings, or invented user counts.",
};

const fieldRows = `
productName|Product name|essentials|text|yes|100|Creatornivo|Enter the public product name exactly as it should appear.|The launch package needs a consistent product name across titles, comments, and copy.
productUrl|Product URL|essentials|URL|yes|500|https://www.creatornivo.com|Provide the real destination hunters should visit.|Product Hunt launch copy must not invent or guess the product link.
productSummary|What does the product do?|essentials|textarea|yes|800|A structured AI workspace that helps creators turn briefs into platform-ready content.|Explain the product in plain language.|The package needs a clear factual description before it can create positioning.
targetAudience|Who is it for?|essentials|textarea|yes|600|Solo founders, marketers, and creators publishing weekly.|Describe the people who should care about the launch.|Audience context controls the angle, wording, objections, and CTA.
coreProblem|Problem it solves|essentials|textarea|yes|700|Blank-page friction and inconsistent prompting slow down content production.|State the main problem or frustration the product addresses.|A specific problem makes the Product Hunt messaging useful instead of generic.
keyOutcome|Main user outcome|essentials|text|yes|250|Create more consistent first drafts without rebuilding every prompt.|Name the realistic outcome users can expect.|The outcome anchors benefits without requiring exaggerated claims.
pricingType|Pricing type|essentials|select|yes|40|Select pricing type|Choose the pricing model that is currently true.|Pricing affects positioning, CTA wording, and expectation setting.
productType|Product type|essentials|select|no|40|Select product type|Choose the closest product category or leave Auto.|Product type helps the output fit Product Hunt conventions and user expectations.
launchGoal|Primary launch goal|essentials|select|no|40|Select the launch goal|Choose the main launch objective.|The launch goal controls the priority of feedback, awareness, sign-ups, partnerships, or validation.
outputLanguage|Output language|essentials|text|no|60|English|Enter the language or regional variant for the output.|The launch copy should match the language the maker will publish in.
keyFeatures|Key features|positioning_evidence|textarea|no|1200|Template library, saved prompts, generation limits, Markdown export.|List the most important actual product capabilities.|Features help create concrete copy without inventing product functionality.
mainUseCases|Main use cases|positioning_evidence|textarea|no|1000|LinkedIn posts, newsletters, launch copy, product descriptions.|Describe practical situations where the product is useful.|Use cases make the launch more understandable to Product Hunt readers.
differentiation|What makes it different?|positioning_evidence|textarea|no|900|Template-first generation with honest limits and no fake social proof.|Explain the real difference from alternatives.|Differentiation helps positioning while avoiding unsupported superiority claims.
proofPoints|Proof and verified results|positioning_evidence|textarea|no|1500|Use only verified launch facts and product capabilities.|Add only approved metrics, testimonials, customer facts, or evidence.|Proof can support credibility, but only when it is real and approved.
availability|Availability|positioning_evidence|textarea|no|700|Public beta is available on the website.|Explain who can access the product and any real limitations.|Availability prevents misleading CTAs for waitlists, private betas, or limited access.
productStatus|Current product status|positioning_evidence|select|no|30|Select product status|Choose the current launch stage.|The output must not present a beta, waitlist, or coming-soon product as fully live.
competitorContext|Alternative or competitor context|positioning_evidence|textarea|no|1000|Alternative to rebuilding prompts manually in a general AI chat interface.|Describe fair comparison context without attacking competitors.|It helps frame the product honestly without unsupported comparison claims.
makerNames|Maker or team details|maker_story_offer|text|no|300|Alex, solo founder and builder.|Add the maker names, roles, or team context to mention.|Maker context makes the first comment and replies sound human and specific.
makerStory|Why you created it|maker_story_offer|textarea|no|1200|Built after noticing creators repeating the same prompt setup for every channel.|Explain the motivation or origin story behind the product.|A real maker story helps the launch feel authentic without fabricated drama.
buildJourney|Build journey|maker_story_offer|textarea|no|1200|Started with core templates, then added saved prompts, usage limits, and billing.|Summarize meaningful build milestones or tradeoffs.|Build journey details support a credible maker-led first comment.
feedbackRequest|Feedback you want|maker_story_offer|textarea|no|600|Which templates would make your weekly publishing workflow easier?|Ask for specific useful feedback from the Product Hunt community.|Specific feedback requests work better than generic engagement-bait.
tone|Maker voice|maker_story_offer|select|no|40|Select maker voice|Choose the voice that fits the maker and product.|Tone keeps launch copy aligned with the maker’s natural style.
promoAvailable|Product Hunt offer|maker_story_offer|toggle|no|5|Off|Turn on only when there is a real launch offer.|The prompt must not invent discounts, scarcity, codes, or promotional terms.
promoDetails|Offer details|maker_story_offer|textarea|no|700|Launch week Pro plan discount for Product Hunt visitors.|Add exact offer terms, dates, codes, and eligibility.|Offer details must be precise when a promotion is used.
launchTags|Preferred launch tags|launch_assets_controls|text|no|200|Productivity, Marketing, Writing|List Product Hunt topics or tags under consideration.|Tags help suggest launch positioning without pretending Product Hunt approved them.
galleryPlan|Gallery assets or ideas|launch_assets_controls|textarea|no|1500|Hero screenshot, template picker, generation form, saved content library.|Describe available launch visuals or concepts.|Gallery notes guide screenshot captions and visual messaging.
demoVideoUrl|Demo video URL|launch_assets_controls|URL|no|500|https://www.youtube.com/watch?v=example|Provide a real demo video link if one exists.|The output must not invent demo links or claim a video exists.
ctaFocus|Primary call to action|launch_assets_controls|select|no|40|Select primary CTA|Choose the main action for hunters.|CTA focus keeps the package from asking for too many actions at once.
regulatedArea|Regulated or sensitive area|launch_assets_controls|select|no|40|Select only when relevant|Choose a category when the product touches a regulated or high-stakes area.|Regulated topics require extra claim caution and may need jurisdiction context.
jurisdiction|Relevant jurisdiction|launch_assets_controls|text|no|150|United States|Enter the country, region, or market relevant to regulated claims.|Jurisdiction can affect safety, legal, financial, medical, or employment wording.
variantCount|Number of tagline options|launch_assets_controls|select|no|1|3|Choose how many tagline options to generate.|Variant count controls output size without adding extra fields.
additionalRequirements|Additional requirements|launch_assets_controls|textarea|no|2000|Avoid fake urgency, fake rankings, or invented user counts.|Add any final constraints that do not fit elsewhere.|This catches unusual requirements without changing the prompt structure.
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
  if (sourceType === "toggle") return { type: "select" };
  return { type: sourceType };
}

function helpAvoidFor(field) {
  if (field.key === "productUrl" || field.key === "demoVideoUrl") {
    return "Avoid fake URLs, unpublished links, or destinations that do not match the launch.";
  }
  if (field.required) {
    return "Avoid vague placeholders, invented facts, or wording that overstates what the product can do.";
  }
  if (field.key === "proofPoints") {
    return "Avoid invented user counts, rankings, reviews, metrics, or customer results.";
  }
  if (field.key === "promoDetails") {
    return "Avoid fake scarcity, unclear eligibility, or promotional terms that are not approved.";
  }
  if (field.key === "competitorContext") {
    return "Avoid unsupported superiority claims, attacks, or comparison points you cannot verify.";
  }
  return "Avoid guessed details, fake social proof, fake urgency, or claims that are not supported by the supplied facts.";
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
        ? `Provide the ${label.toLowerCase()} for this Product Hunt launch.`
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
  if (sourceType === "textarea" || sourceType === "URL" || field.maxLength > 500) {
    field.fullWidth = true;
  }

  if (sourceType === "toggle") {
    field.hint = `${baseHint} Choose On or Off.`;
    field.help.what =
      "Choose whether a real Product Hunt launch offer exists. Offer details appear only when this is On.";
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
  slug: "product-hunt-launch",
  title: "Product Hunt Launch",
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
