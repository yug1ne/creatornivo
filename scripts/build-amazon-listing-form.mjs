/**
 * Builds the Amazon Listing form schema from the approved 31-field specification.
 * Does NOT modify the prompt text. It verifies that every prompt variable has
 * exactly one form field before writing the form JSON.
 *
 * Usage: node scripts/build-amazon-listing-form.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const promptPath = path.join(root, "prisma", "template-prompts", "amazon-listing.txt");
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "amazon-listing-variables.json",
);

const groups = [
  {
    id: "essentials",
    title: "Essentials",
    description:
      "Minimum product, customer, marketplace, and positioning information needed to create a valid first listing.",
    defaultOpen: true,
  },
  {
    id: "product_facts_purchase_info",
    title: "Product Facts & Purchase Info",
    description:
      "Objective details that affect purchase decisions, product accuracy, compatibility, care, safety, and package expectations.",
    defaultOpen: false,
  },
  {
    id: "search_positioning",
    title: "Search & Positioning",
    description:
      "Keyword research, positioning preferences, brand tone, and wording restrictions without turning the form into an SEO questionnaire.",
    defaultOpen: false,
  },
  {
    id: "compliance_variations_sources",
    title: "Compliance, Variations & Sources",
    description:
      "Regulated claims, Seller Central category rules, product variations, existing listings, source material, and unusual requirements.",
    defaultOpen: false,
  },
];

const defaultValues = {
  outputLanguage: "English",
  listingGoal: "Balanced conversion and discoverability",
  positioningAngle: "Auto",
  toneStyle: "Clear and natural",
  productRiskType: "Standard consumer product",
  hasVariations: "False",
};

const options = {
  listingGoal: [
    "Balanced conversion and discoverability",
    "Improve discoverability",
    "Improve purchase confidence",
    "Premium positioning",
    "New product launch",
    "Refresh an existing listing",
  ],
  positioningAngle: [
    "Auto",
    "Practical value",
    "Premium quality",
    "Durability",
    "Ease of use",
    "Performance",
    "Space saving",
    "Eco-conscious",
    "Giftable",
    "Specialized use",
  ],
  toneStyle: [
    "Clear and natural",
    "Concise and factual",
    "Warm and helpful",
    "Premium and refined",
    "Technical and precise",
    "Energetic but credible",
    "Minimalist",
    "Brand-led",
  ],
  productRiskType: [
    "Standard consumer product",
    "Health or medical product",
    "Dietary supplement",
    "Food or beverage",
    "Beauty or cosmetic product",
    "Children’s product",
    "Electrical or safety product",
    "Other regulated product",
  ],
  hasVariations: ["True", "False"],
};

const showWhen = {
  claimsAndEvidence: {
    key: "productRiskType",
    notEquals: "Standard consumer product",
  },
  variationDetails: { key: "hasVariations", equals: "True" },
};

const examples = {
  marketplace: "Amazon.com US",
  outputLanguage: "English",
  productName: "Adjustable Bamboo Drawer Organizer",
  brandName: "Northside Home",
  productCategory: "Kitchen drawer organizers",
  targetCustomer:
    "Apartment renters and homeowners who want tidier kitchen drawers without custom cabinetry.",
  productFacts:
    "Expandable bamboo organizer, 7 compartments, fits drawers from 13 to 20 inches wide, non-slip feet, no tools required.",
  keyDifferentiators:
    "Expandable width, smooth bamboo finish, removable dividers, and stable non-slip base.",
  primaryUseCases:
    "Organizing cutlery, cooking tools, office supplies, and small household items.",
  listingGoal: "Balanced conversion and discoverability",
  specifications:
    "Expands from 13 to 20 inches wide, 17 inches deep, 2 inches high.",
  materialsIngredients: "Bamboo body with silicone feet.",
  dimensionsWeight: "13 to 20 in W x 17 in D x 2 in H, 2.4 lb.",
  packageContents: "One expandable organizer and four removable dividers.",
  compatibilityFit:
    "Fits drawers at least 13 inches wide, 17 inches deep, and 2.25 inches tall.",
  careInstructions: "Wipe clean with a damp cloth and dry immediately.",
  safetyWarnings: "Keep away from open flame and do not soak in water.",
  warrantySupport: "One-year limited warranty and email support.",
  primaryKeywords: "bamboo drawer organizer, expandable cutlery tray",
  secondaryKeywords:
    "kitchen drawer organizer, utensil organizer, silverware tray, office drawer organizer",
  positioningAngle: "Practical value",
  toneStyle: "Clear and natural",
  mustUseOrAvoidWording:
    "Use exact dimensions. Avoid best, guaranteed, indestructible, and eco-friendly.",
  productRiskType: "Standard consumer product",
  claimsAndEvidence:
    "Food-contact safe finish documented by supplier certificate dated May 2026.",
  sellerCentralRules:
    "No medical claims, no competitor brand names, no promotional language in title.",
  hasVariations: "False",
  variationDetails: "Available in natural bamboo and black finish, small and large sizes.",
  currentListing: "Paste current title, bullets, description, and backend terms.",
  referenceSource:
    "Product spec sheet, packaging copy, supplier material statement, and approved photos.",
  additionalContext: "Prioritize clarity over maximum character use.",
};

const fieldRows = `
marketplace|Amazon Marketplace|essentials|text|yes|80|Amazon.com US|Specify the marketplace and country for the listing.|Marketplace context affects language, assumptions, limits, and category caution.
outputLanguage|Output Language|essentials|text|no|40|English|Choose the language for the output.|Listing copy should match the language used in the target marketplace.
productName|Product Name|essentials|text|yes|180|Adjustable Bamboo Drawer Organizer|Enter the exact product name or working product name.|The title, bullets, and description need a stable product identity.
brandName|Brand Name|essentials|text|no|100|Northside Home|Add the brand name if it should appear in the listing.|Brand context may affect title phrasing, store tone, and A+ section framing.
productCategory|Product Category|essentials|text|yes|120|Kitchen drawer organizers|Describe the Amazon category or product type.|Category context affects feature emphasis, compliance caution, and buyer expectations.
targetCustomer|Target Customer|essentials|textarea|yes|700|Apartment renters and homeowners who want tidier kitchen drawers without custom cabinetry.|Describe the specific buyer and situation.|Buyer context guides benefits, objections, use cases, and wording.
productFacts|Verified Product Facts|essentials|textarea|yes|2000|Expandable bamboo organizer, 7 compartments, fits drawers from 13 to 20 inches wide, non-slip feet, no tools required.|Provide only confirmed product facts that may be used publicly.|This is the factual source of truth for the listing.
keyDifferentiators|Key Differentiators|essentials|textarea|no|1000|Expandable width, smooth bamboo finish, removable dividers, and stable non-slip base.|Explain what is meaningfully different or useful about the product.|Differentiators help positioning without inventing superiority claims.
primaryUseCases|Primary Use Cases|essentials|textarea|no|800|Organizing cutlery, cooking tools, office supplies, and small household items.|List the main real-world uses for the product.|Use cases make the listing more concrete and buyer-focused.
listingGoal|Primary Listing Goal|essentials|select|no|50|Select listing goal|Choose the main optimization goal.|The goal changes the balance between discovery, confidence, launch, and premium positioning.
specifications|Technical Specifications|product_facts_purchase_info|textarea|no|1500|Expands from 13 to 20 inches wide, 17 inches deep, 2 inches high.|Add measurable specs that affect purchase decisions.|Specifications prevent vague copy and reduce buyer uncertainty.
materialsIngredients|Materials or Ingredients|product_facts_purchase_info|textarea|no|1200|Bamboo body with silicone feet.|List materials, ingredients, finish, or composition.|Materials and ingredients can affect buyer trust, fit, care, and compliance.
dimensionsWeight|Dimensions and Weight|product_facts_purchase_info|text|no|300|13 to 20 in W x 17 in D x 2 in H, 2.4 lb.|Provide dimensions, weight, size, or capacity.|Physical details often determine whether the product fits the buyer’s needs.
packageContents|What Is Included|product_facts_purchase_info|textarea|no|700|One expandable organizer and four removable dividers.|List exactly what the buyer receives.|Package contents reduce confusion and prevent implied extras.
compatibilityFit|Compatibility or Fit|product_facts_purchase_info|textarea|no|900|Fits drawers at least 13 inches wide, 17 inches deep, and 2.25 inches tall.|Describe fit, compatibility, supported models, or exclusions.|Compatibility details prevent misleading universal-fit claims.
careInstructions|Care Instructions|product_facts_purchase_info|textarea|no|700|Wipe clean with a damp cloth and dry immediately.|Add care, usage, maintenance, or storage instructions.|Care instructions help set accurate expectations after purchase.
safetyWarnings|Safety Warnings|product_facts_purchase_info|textarea|no|1000|Keep away from open flame and do not soak in water.|Add warnings, age limits, hazards, or safe-use notes.|Safety wording must not be invented or omitted when material.
warrantySupport|Warranty or Support|product_facts_purchase_info|textarea|no|700|One-year limited warranty and email support.|Describe warranty, support, returns, or customer help details.|Support details can improve purchase confidence when confirmed.
primaryKeywords|Primary Keywords|search_positioning|textarea|no|700|bamboo drawer organizer, expandable cutlery tray|Add the most important search terms from research.|Keywords guide discovery without forcing keyword stuffing.
secondaryKeywords|Secondary Keywords|search_positioning|textarea|no|1000|kitchen drawer organizer, utensil organizer, silverware tray, office drawer organizer|Add supporting search terms, synonyms, and buyer language.|Secondary keywords help coverage while staying natural.
positioningAngle|Positioning Angle|search_positioning|select|no|40|Select positioning angle|Choose the angle that best fits the product and buyer.|Positioning controls which benefits receive emphasis.
toneStyle|Tone and Style|search_positioning|select|no|40|Select tone and style|Choose the writing style for the listing.|Tone affects clarity, confidence, and category fit.
mustUseOrAvoidWording|Required or Avoided Wording|search_positioning|textarea|no|800|Use exact dimensions. Avoid best, guaranteed, indestructible, and eco-friendly.|List phrases to include or avoid.|Wording constraints prevent unsafe claims and preserve brand language.
productRiskType|Product Risk Type|compliance_variations_sources|select|no|50|Select product risk type|Choose a risk category only when relevant.|Regulated or safety-sensitive products need stricter claim handling.
claimsAndEvidence|Claims and Supporting Evidence|compliance_variations_sources|textarea|no|2500|Food-contact safe finish documented by supplier certificate dated May 2026.|Provide evidence for regulated, performance, safety, or health-related claims.|Claims should appear only when supported by supplied evidence.
sellerCentralRules|Seller Central Category Rules|compliance_variations_sources|textarea|no|2000|No medical claims, no competitor brand names, no promotional language in title.|Paste relevant category, marketplace, or Seller Central rules.|Specific rules take priority over generic listing advice.
hasVariations|Product Has Variations|compliance_variations_sources|toggle|no||False|Choose whether this product has variations.|Variation families need distinct notes for sizes, colors, models, or packs.
variationDetails|Variation Details|compliance_variations_sources|textarea|no|1200|Available in natural bamboo and black finish, small and large sizes.|Describe confirmed variations, differences, and naming rules.|Variation details prevent mixing attributes across different SKUs.
currentListing|Current Listing|compliance_variations_sources|textarea|no|4000|Paste current title, bullets, description, and backend terms.|Paste existing copy if this is a refresh or optimization.|Current copy lets the output improve what exists rather than starting blind.
referenceSource|Product Source Material|compliance_variations_sources|textarea|no|4000|Product spec sheet, packaging copy, supplier material statement, and approved photos.|Add source notes, spec sheets, packaging copy, or approved references.|Source material helps keep the listing anchored to verified facts.
additionalContext|Additional Context|compliance_variations_sources|textarea|no|2000|Prioritize clarity over maximum character use.|Add any final constraints or context that does not fit elsewhere.|This captures unusual requirements without adding extra prompt variables.
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
  if (sourceType === "toggle") return { type: "select" };
  return { type: sourceType };
}

function helpAvoidFor(field) {
  if (field.key === "claimsAndEvidence") {
    return "Avoid unsupported medical, safety, performance, environmental, or compliance claims.";
  }
  if (field.key === "sellerCentralRules") {
    return "Avoid guessing marketplace rules or treating generic guidance as category-specific policy.";
  }
  if (field.key === "primaryKeywords" || field.key === "secondaryKeywords") {
    return "Avoid keyword stuffing, competitor brand terms, or irrelevant search terms.";
  }
  if (field.key === "productFacts") {
    return "Avoid future features, unverified results, ratings, awards, or claims not backed by product source material.";
  }
  if (field.required) {
    return "Avoid vague placeholders, invented product facts, or claims the product cannot support.";
  }
  return "Avoid guessed details, fake proof, review language, urgency, competitor claims, or unsupported superlatives.";
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
        ? `Provide the ${label.toLowerCase()} for this Amazon listing.`
        : `Optional context for the ${label.toLowerCase()} field.`,
      why,
      example: `Good example: ${examples[key] ?? placeholder}`,
      avoid: helpAvoidFor({ key, required }),
    },
  };

  if (defaultValues[key]) field.defaultValue = defaultValues[key];
  if (maxLengthRaw) field.maxLength = Number(maxLengthRaw);
  if (options[key]) field.options = options[key];
  if (showWhen[key]) field.showWhen = showWhen[key];
  if (sourceType === "textarea" || field.maxLength > 500) {
    field.fullWidth = true;
  }

  if (sourceType === "toggle") {
    field.hint = `${baseHint} Choose True or False.`;
    field.help.what =
      "Choose whether the product is sold as a variation family. Variation details appear only when this is True.";
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
  slug: "amazon-listing",
  title: "Amazon Listing",
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
