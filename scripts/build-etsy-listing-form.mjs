/**
 * Builds the Etsy Listing form schema from the approved 36-field specification.
 * Does NOT modify the prompt text. It verifies that every prompt variable has
 * exactly one form field before writing the form JSON.
 *
 * Usage: node scripts/build-etsy-listing-form.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const promptPath = path.join(root, "prisma", "template-prompts", "etsy-listing.txt");
const outPath = path.join(
  root,
  "src",
  "config",
  "template-forms",
  "etsy-listing-variables.json",
);

const groups = [
  {
    id: "essentials",
    title: "Essentials",
    description:
      "Minimum product, buyer, seller-role, language, tone, and length information needed to create a useful Etsy listing.",
    defaultOpen: true,
  },
  {
    id: "item_details",
    title: "Item Details",
    description:
      "Materials, dimensions, variations, contents, personalization, vintage, and production-partner information when relevant.",
    defaultOpen: false,
  },
  {
    id: "fulfillment_buyer_information",
    title: "Fulfillment & Buyer Information",
    description:
      "Processing, shipping, returns, digital files, compatibility, licensing, and buyer instructions.",
    defaultOpen: false,
  },
  {
    id: "seo_brand",
    title: "SEO & Brand",
    description:
      "Search phrases, category attributes, listing emphasis, title count, shop voice, and required wording.",
    defaultOpen: false,
  },
  {
    id: "claims_restrictions",
    title: "Claims & Restrictions",
    description:
      "Evidence, sensitive-product safety facts, and restrictions that prevent unsupported claims.",
    defaultOpen: false,
  },
];

const defaultValues = {
  productFormat: "Physical item",
  sellerRole: "Made by seller",
  outputLanguage: "English",
  tone: "Clear and natural",
  descriptionLength: "Standard",
  personalizationEnabled: "Off",
  listingFocus: "Search-balanced",
  titleVariantCount: "3",
  sensitiveCategory: "Off",
};

const options = {
  productFormat: [
    "Physical item",
    "Instant digital download",
    "Made-to-order digital item",
  ],
  sellerRole: [
    "Made by seller",
    "Designed by seller",
    "Sourced creative supply",
    "Handpicked vintage item",
  ],
  tone: [
    "Clear and natural",
    "Warm and handmade",
    "Minimal and modern",
    "Playful and friendly",
    "Elegant and refined",
    "Rustic and personal",
    "Technical and precise",
  ],
  descriptionLength: ["Auto", "Short", "Standard", "Detailed"],
  personalizationEnabled: ["On", "Off"],
  listingFocus: [
    "Search-balanced",
    "Benefits-first",
    "Details-first",
    "Gift-focused",
    "Story-led",
    "Minimal",
  ],
  titleVariantCount: ["1", "3", "5"],
  sensitiveCategory: ["On", "Off"],
};

const showWhen = {
  materialsOrComponents: { key: "productFormat", equals: "Physical item" },
  dimensionsAndSizing: { key: "productFormat", equals: "Physical item" },
  variations: { key: "productFormat", equals: "Physical item" },
  shippingDelivery: { key: "productFormat", equals: "Physical item" },
  returnExchangeNotes: { key: "productFormat", equals: "Physical item" },
  processingTime: {
    key: "productFormat",
    equals: ["Physical item", "Made-to-order digital item"],
  },
  digitalFileDetails: {
    key: "productFormat",
    equals: ["Instant digital download", "Made-to-order digital item"],
  },
  softwareCompatibility: {
    key: "productFormat",
    equals: ["Instant digital download", "Made-to-order digital item"],
  },
  usageLicense: {
    key: "productFormat",
    equals: ["Instant digital download", "Made-to-order digital item"],
  },
  personalizationDetails: { key: "personalizationEnabled", equals: "On" },
  vintageDetails: { key: "sellerRole", equals: "Handpicked vintage item" },
  productionPartnerDetails: {
    allOf: [
      { key: "productFormat", equals: "Physical item" },
      { key: "sellerRole", equals: "Designed by seller" },
    ],
  },
  safetyComplianceFacts: { key: "sensitiveCategory", equals: "On" },
};

const examples = {
  productFormat: "Physical item",
  sellerRole: "Made by seller",
  productName: "Printable Weekly Meal Planner",
  productOverview:
    "A printable PDF meal-planning bundle with weekly menus, grocery lists, pantry inventory pages, and simple prep notes.",
  targetBuyer:
    "Busy families and home cooks who want a simple weekly planning routine.",
  keySellingPoints:
    "Editable Canva version, US Letter and A4 PDFs, Sunday and Monday start options, clean minimalist layout.",
  essentialSpecs:
    "Digital PDF and Canva template, 12 pages, US Letter and A4 sizes, instant download, no physical item shipped.",
  primaryUseOccasion: "Weekly meal planning, grocery prep, and family routines.",
  outputLanguage: "English",
  tone: "Clear and natural",
  descriptionLength: "Standard",
  materialsOrComponents:
    "100% cotton canvas with brass zipper and cotton lining.",
  dimensionsAndSizing: "10 in x 7 in x 2 in.",
  variations: "Natural, black, and sage green.",
  setContents:
    "One printable planner PDF, one Canva template link, and setup instructions.",
  personalizationEnabled: "Off",
  personalizationDetails: "Buyer can add a family name on the cover page.",
  vintageDetails:
    "1980s ceramic vase with small glaze marks shown in the listing photos.",
  productionPartnerDetails:
    "Printed by a production partner using the seller's original artwork.",
  processingTime:
    "Instant download after purchase, or 3-5 business days for made-to-order personalization.",
  shippingDelivery: "Ships in protective packaging with tracking.",
  returnExchangeNotes:
    "Digital downloads are not returnable after access unless required by law.",
  digitalFileDetails: "PDF, PNG, and Canva template link.",
  softwareCompatibility: "Works with a Canva free account and any PDF reader.",
  usageLicense:
    "Personal use only; resale or redistribution is not included.",
  buyerInstructions:
    "Download files from Etsy Purchases and Reviews, then open the instruction PDF first.",
  priorityKeywords:
    "printable meal planner, weekly menu planner, grocery list printable",
  categoryAttributes:
    "Digital prints, planner templates, meal planning, PDF download",
  listingFocus: "Search-balanced",
  titleVariantCount: "3",
  shopVoice: "Warm, practical, and calm, with short sentences.",
  requiredTerms:
    "Use printable, instant download, and meal planner. Avoid guaranteed, best-selling, and handmade if not applicable.",
  proofAndCredentials:
    "Based on original seller artwork and verified file specifications only.",
  sensitiveCategory: "Off",
  safetyComplianceFacts:
    "For children's wall art, use non-toxic ink certification only if supplied.",
  restrictionsAndContext:
    "Do not invent shipping times, reviews, bestseller status, or scarcity.",
};

const fieldRows = `
productFormat|Product format|essentials|select|yes|60|Physical item|Choose whether the listing is physical, instant digital, or made-to-order digital.|The format controls the listing structure, delivery language, and which item-detail fields appear.
sellerRole|Your role in creating it|essentials|select|yes|80|Made by seller|Choose how you are involved in making, designing, sourcing, or selecting the item.|Seller involvement affects handmade, designed, sourced, vintage, and production-partner wording.
productName|Product name|essentials|text|yes|160|Printable Weekly Meal Planner|Enter the exact product name or working listing name.|The listing title, description, and tags need a clear item identity.
productOverview|What are you selling?|essentials|textarea|yes|1200|A printable PDF meal-planning bundle with weekly menus, grocery lists, pantry inventory pages, and simple prep notes.|Describe the product in plain language.|The overview anchors the customer-facing description without inventing features.
targetBuyer|Ideal buyer|essentials|text|yes|300|Busy families and home cooks who want a simple weekly planning routine.|Describe the shopper and buying context.|Buyer context guides benefits, use cases, tone, and search phrasing.
keySellingPoints|Main selling points|essentials|textarea|yes|1000|Editable Canva version, US Letter and A4 PDFs, Sunday and Monday start options, clean minimalist layout.|List the strongest supported reasons to choose the product.|Selling points help the listing feel specific without using fake urgency or unsupported proof.
essentialSpecs|Essential product facts|essentials|textarea|yes|1500|Digital PDF and Canva template, 12 pages, US Letter and A4 sizes, instant download, no physical item shipped.|Provide the factual details the buyer must understand.|Specs prevent vague copy and keep claims tied to supplied facts.
primaryUseOccasion|Use or occasion|essentials|text|no|300|Weekly meal planning, grocery prep, and family routines.|Add a real use case, event, room, season, or occasion when relevant.|Use or occasion helps shape title angles and tags without forcing fake demand.
outputLanguage|Listing language|essentials|text|no|60|English|Choose the language for the generated listing.|The prompt keeps titles, descriptions, and tags in one consistent shop language.
tone|Writing tone|essentials|select|no|80|Clear and natural|Choose the writing style for the listing.|Tone affects clarity, warmth, precision, and category fit.
descriptionLength|Description length|essentials|select|no|40|Standard|Choose how detailed the Etsy description should be.|Length controls detail without changing the required Etsy-specific output sections.
materialsOrComponents|Materials or components|item_details|textarea|no|1000|100% cotton canvas with brass zipper and cotton lining.|List confirmed materials, ingredients, components, or finish details.|Material details are used for physical items and attribute suggestions when supplied.
dimensionsAndSizing|Dimensions and sizing|item_details|textarea|no|1000|10 in x 7 in x 2 in.|Add measurements, size, capacity, or sizing notes.|Sizing helps buyers decide fit and prevents vague physical-product claims.
variations|Available variations|item_details|textarea|no|1200|Natural, black, and sage green.|List confirmed colors, sizes, styles, bundles, or options.|Variation details prevent the listing from mixing attributes across options.
setContents|What the buyer receives|item_details|textarea|no|800|One printable planner PDF, one Canva template link, and setup instructions.|List exactly what is included in the order.|Contents reduce confusion and prevent implied extras.
personalizationEnabled|Personalization available|item_details|toggle|no|20|Off|Choose whether the buyer can personalize this item.|Personalization details appear only when the item actually supports buyer input.
personalizationDetails|Personalization details|item_details|textarea|no|1200|Buyer can add a family name on the cover page.|Explain what buyers can personalize and what information they must provide.|Personalization copy needs clear instructions without requesting unnecessary sensitive data.
vintageDetails|Vintage item details|item_details|textarea|no|1000|1980s ceramic vase with small glaze marks shown in the listing photos.|Add era, condition, provenance, repairs, or maker details when known.|Vintage details must distinguish confirmed facts from estimates.
productionPartnerDetails|Production partner details|item_details|textarea|no|1200|Printed by a production partner using the seller's original artwork.|Describe the seller's design role and partner's production or fulfillment role.|Production-partner context prevents misleading handmade or manufacturing claims.
processingTime|Processing time|fulfillment_buyer_information|text|no|300|Instant download after purchase, or 3-5 business days for made-to-order personalization.|Add preparation or processing timing when relevant.|Processing time is separate from carrier transit and should not imply unsupported guarantees.
shippingDelivery|Shipping and delivery|fulfillment_buyer_information|textarea|no|1200|Ships in protective packaging with tracking.|Describe shipping, packaging, handling, or delivery expectations.|Shipping information is used only for physical items and should not invent delivery promises.
returnExchangeNotes|Returns and exchanges|fulfillment_buyer_information|textarea|no|1000|Digital downloads are not returnable after access unless required by law.|Add confirmed returns, exchanges, or cancellation notes.|Return wording should match the seller's actual policy and product format.
digitalFileDetails|Digital files included|fulfillment_buyer_information|textarea|no|1400|PDF, PNG, and Canva template link.|List the digital files, formats, sizes, or access method.|Digital file details keep download listings clear and avoid physical-delivery language.
softwareCompatibility|Software and compatibility|fulfillment_buyer_information|textarea|no|1000|Works with a Canva free account and any PDF reader.|Describe required apps, devices, accounts, or compatibility limits.|Compatibility prevents unsupported universal-fit or every-application claims.
usageLicense|Digital usage license|fulfillment_buyer_information|textarea|no|1200|Personal use only; resale or redistribution is not included.|Explain allowed use, commercial rights, resale limits, or redistribution rules.|License context prevents the listing from implying rights the buyer does not receive.
buyerInstructions|Buyer instructions|fulfillment_buyer_information|textarea|no|1200|Download files from Etsy Purchases and Reviews, then open the instruction PDF first.|Add setup, ordering, download, personalization, or use instructions.|Instructions help buyers know what to do after purchase without adding unsupported steps.
priorityKeywords|Priority search phrases|seo_brand|textarea|no|1000|printable meal planner, weekly menu planner, grocery list printable|Add researched phrases or shopper language to consider.|Keywords guide Etsy tags and titles but should not override product accuracy.
categoryAttributes|Category and attributes|seo_brand|textarea|no|1000|Digital prints, planner templates, meal planning, PDF download|Add likely category, attribute, material, color, room, style, occasion, or recipient notes.|Attribute context helps create suggestions without pretending Etsy's editor is static.
listingFocus|Listing emphasis|seo_brand|select|no|60|Search-balanced|Choose the main emphasis for the listing.|Focus changes the balance between benefits, details, gifting, story, and minimal copy.
titleVariantCount|Number of title options|seo_brand|select|no|10|3|Choose how many Etsy title options to generate.|The prompt creates exactly this number of title options.
shopVoice|Shop voice|seo_brand|textarea|no|700|Warm, practical, and calm, with short sentences.|Describe the shop's preferred voice or style notes.|Shop voice keeps wording consistent with the seller's brand.
requiredTerms|Required words or phrases|seo_brand|textarea|no|800|Use printable, instant download, and meal planner. Avoid guaranteed, best-selling, and handmade if not applicable.|List words to include or avoid.|Required wording is checked against accuracy and may be flagged if unsafe.
proofAndCredentials|Evidence and credentials|claims_restrictions|textarea|no|1500|Based on original seller artwork and verified file specifications only.|Provide evidence for claims, credentials, testing, provenance, or rights.|The prompt uses supplied proof only and avoids broad unsupported claims.
sensitiveCategory|Sensitive or regulated item|claims_restrictions|toggle|no|20|Off|Choose whether this item involves safety, child, medical, cosmetic, food, legal, or regulated claims.|Sensitive items need extra safeguards and verified safety facts.
safetyComplianceFacts|Safety and compliance facts|claims_restrictions|textarea|no|2000|For children's wall art, use non-toxic ink certification only if supplied.|Add verified warnings, age guidance, ingredients, testing, or compliance facts.|Safety wording must be supplied by the seller and should not imply legal review.
restrictionsAndContext|Additional requirements|claims_restrictions|textarea|no|2000|Do not invent shipping times, reviews, bestseller status, or scarcity.|Add final restrictions, missing context, or unusual requirements.|Restrictions prevent unsafe copy and capture constraints that do not fit elsewhere.
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
  if (field.key === "priorityKeywords" || field.key === "categoryAttributes") {
    return "Avoid keyword stuffing, irrelevant trends, competitor names, protected names, or misleading attributes.";
  }
  if (
    field.key === "proofAndCredentials" ||
    field.key === "safetyComplianceFacts"
  ) {
    return "Avoid certifications, tests, approvals, safety claims, or legal conclusions that are not explicitly supplied.";
  }
  if (field.key === "personalizationDetails") {
    return "Avoid asking buyers for unrelated sensitive information, credentials, financial data, or unnecessary personal details.";
  }
  if (field.key === "vintageDetails") {
    return "Avoid invented rarity, provenance, collector value, authenticity, or historical significance.";
  }
  if (field.key === "productionPartnerDetails") {
    return "Avoid implying the seller personally manufactured the item when a partner produced or fulfilled it.";
  }
  if (field.required) {
    return "Avoid vague placeholders, invented product facts, fake proof, scarcity, reviews, or unsupported claims.";
  }
  return "Avoid guessed facts, fake urgency, fake reviews, unsupported superlatives, or policy language that the seller did not provide.";
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
        ? `Provide the ${label.toLowerCase()} for this Etsy listing.`
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
    field.hint = `${baseHint} Choose On or Off.`;
    field.help.what =
      key === "personalizationEnabled"
        ? "Choose whether buyers can personalize this item. Personalization details appear only when this is On."
        : "Choose whether this item needs sensitive or regulated claim safeguards. Safety facts appear only when this is On.";
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
  slug: "etsy-listing",
  title: "Etsy Listing",
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
