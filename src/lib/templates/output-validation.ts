import type { TemplateVariable } from "@/types/template";

import {
  classifyOptionalFieldRiskCategories,
  type OptionalFieldRiskCategory,
} from "./utils";

export type GeneratedOutputIssueCode =
  | "placeholder_url"
  | "placeholder_commercial"
  | "placeholder_timing"
  | "placeholder_proof"
  | "placeholder_disclosure"
  | "placeholder_contact"
  | "placeholder_visual"
  | "unsupported_url_instruction"
  | "unsupported_commercial_detail"
  | "unsupported_timing_detail"
  | "unsupported_proof_detail"
  | "unsupported_disclosure_detail"
  | "unsupported_visual_detail";

export interface GeneratedOutputValidationIssue {
  code: GeneratedOutputIssueCode;
  category: OptionalFieldRiskCategory;
  match: string;
  message: string;
}

export interface GeneratedOutputValidationResult {
  ok: boolean;
  issues: GeneratedOutputValidationIssue[];
}

interface OutputValidationContext {
  blankOptionalCategories: Set<OptionalFieldRiskCategory>;
  providedValues: string[];
}

interface OutputPatternRule {
  code: GeneratedOutputIssueCode;
  category: OptionalFieldRiskCategory;
  pattern: RegExp;
  message: string;
  requiresBlankOptionalCategory?: boolean;
  ignoreWhenUserProvided?: boolean;
}

const OUTPUT_PLACEHOLDER_RULES: OutputPatternRule[] = [
  {
    code: "placeholder_url",
    category: "url",
    pattern: /\[(?:here|link|click here)\]\(\s*#\s*\)/gi,
    message: "Generated output contains a placeholder link.",
  },
  {
    code: "placeholder_url",
    category: "url",
    pattern: /\[(?:link if allowed|insert link|add link|insert url|add url|link|url)\]/gi,
    message: "Generated output contains a placeholder URL instruction.",
  },
  {
    code: "placeholder_url",
    category: "url",
    pattern: /\b(?:URL_HERE|LINK_HERE|YOUR_URL|INSERT_LINK|ADD_LINK)\b/gi,
    message: "Generated output contains a placeholder URL token.",
  },
  {
    code: "placeholder_url",
    category: "url",
    pattern: /\b(?:https?:\/\/)?(?:www\.)?example\.com(?:\/[^\s)]*)?/gi,
    message: "Generated output contains example.com without a supplied URL.",
    requiresBlankOptionalCategory: true,
    ignoreWhenUserProvided: true,
  },
  {
    code: "unsupported_url_instruction",
    category: "url",
    pattern:
      /\b(?:check|click|visit|open|see|use|book|download)\s+(?:the\s+)?(?:link|url)\s+(?:below|here)\b/gi,
    message: "Generated output asks the reader to use a missing link.",
    requiresBlankOptionalCategory: true,
    ignoreWhenUserProvided: true,
  },
  {
    code: "placeholder_commercial",
    category: "commercial",
    pattern:
      /\[(?:insert price|price|insert discount|discount|promo code|coupon code|insert promo code)\]/gi,
    message: "Generated output contains a commercial placeholder.",
  },
  {
    code: "placeholder_commercial",
    category: "commercial",
    pattern:
      /\b(?:PRICE_HERE|DISCOUNT_HERE|PROMO_CODE|PROMO_CODE_HERE|COUPON_CODE|OFFER_HERE)\b/gi,
    message: "Generated output contains a commercial placeholder token.",
  },
  {
    code: "unsupported_commercial_detail",
    category: "commercial",
    pattern: /[$€£]\s?\d[\d,.]*(?:\.\d{2})?|\b\d+\s?(?:USD|EUR|GBP)\b/gi,
    message: "Generated output contains a price that was not supplied.",
    requiresBlankOptionalCategory: true,
    ignoreWhenUserProvided: true,
  },
  {
    code: "unsupported_commercial_detail",
    category: "commercial",
    pattern: /\b\d{1,3}\s?%\s+(?:off|discount|savings|save)\b/gi,
    message: "Generated output contains a discount that was not supplied.",
    requiresBlankOptionalCategory: true,
    ignoreWhenUserProvided: true,
  },
  {
    code: "unsupported_commercial_detail",
    category: "commercial",
    pattern:
      /\b(?:promo|coupon|discount)\s+code\s*[:#-]?\s*[A-Z0-9][A-Z0-9_-]{2,}\b/gi,
    message: "Generated output contains a promo code that was not supplied.",
    requiresBlankOptionalCategory: true,
    ignoreWhenUserProvided: true,
  },
  {
    code: "unsupported_commercial_detail",
    category: "commercial",
    pattern:
      /\b(?:ends|expires|valid until|deadline)\s+(?:today|tonight|tomorrow|soon|on\s+[A-Z][a-z]+\s+\d{1,2}(?:,\s+\d{4})?)\b/gi,
    message: "Generated output contains a deadline or urgency claim that was not supplied.",
    requiresBlankOptionalCategory: true,
    ignoreWhenUserProvided: true,
  },
  {
    code: "placeholder_timing",
    category: "timing",
    pattern: /\[(?:date|time|location|address|insert date|insert location)\]/gi,
    message: "Generated output contains a date, time, or location placeholder.",
  },
  {
    code: "placeholder_timing",
    category: "timing",
    pattern: /\b(?:DATE_HERE|TIME_HERE|LOCATION_HERE|ADDRESS_HERE)\b/gi,
    message: "Generated output contains a timing or location placeholder token.",
  },
  {
    code: "unsupported_timing_detail",
    category: "timing",
    pattern: /\bTBD\b/gi,
    message: "Generated output contains TBD for a blank date or location field.",
    requiresBlankOptionalCategory: true,
    ignoreWhenUserProvided: true,
  },
  {
    code: "placeholder_proof",
    category: "proof",
    pattern:
      /\[(?:insert statistic|statistic|insert proof|proof point|testimonial|citation|source)\]/gi,
    message: "Generated output contains a proof or evidence placeholder.",
  },
  {
    code: "placeholder_proof",
    category: "proof",
    pattern: /\b(?:STATISTIC_HERE|SOURCE_HERE|CITATION_HERE|PROOF_HERE)\b/gi,
    message: "Generated output contains a proof placeholder token.",
  },
  {
    code: "unsupported_proof_detail",
    category: "proof",
    pattern: /\baccording to research\b/gi,
    message: "Generated output cites research without supplied source material.",
    requiresBlankOptionalCategory: true,
    ignoreWhenUserProvided: true,
  },
  {
    code: "unsupported_proof_detail",
    category: "proof",
    pattern: /\b(?:testimonial|customer review|review quote)\s*[:—-]/gi,
    message: "Generated output contains a testimonial or review that was not supplied.",
    requiresBlankOptionalCategory: true,
    ignoreWhenUserProvided: true,
  },
  {
    code: "placeholder_disclosure",
    category: "disclosure",
    pattern: /\[(?:sponsor name|affiliate disclosure|disclosure|partner name)\]/gi,
    message: "Generated output contains a disclosure placeholder.",
  },
  {
    code: "unsupported_disclosure_detail",
    category: "disclosure",
    pattern: /\b(?:affiliate disclosure|sponsored by|paid partnership with)\s*[:—-]?\s+\S+/gi,
    message: "Generated output contains a disclosure or affiliation that was not supplied.",
    requiresBlankOptionalCategory: true,
    ignoreWhenUserProvided: true,
  },
  {
    code: "placeholder_contact",
    category: "contact",
    pattern: /\[(?:contact details|insert contact|phone number|email address)\]/gi,
    message: "Generated output contains a contact placeholder.",
  },
  {
    code: "placeholder_contact",
    category: "contact",
    pattern: /\bname@example\.com\b/gi,
    message: "Generated output contains a placeholder email address.",
  },
  {
    code: "placeholder_contact",
    category: "contact",
    pattern: /\b555[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    message: "Generated output contains a placeholder phone number.",
  },
  {
    code: "placeholder_contact",
    category: "contact",
    pattern: /@yourhandle\b/gi,
    message: "Generated output contains a placeholder social handle.",
  },
  {
    code: "placeholder_visual",
    category: "visual",
    pattern:
      /\[(?:insert image|add image|insert screenshot|add screenshot|image|screenshot)\]/gi,
    message: "Generated output contains a visual placeholder.",
  },
  {
    code: "placeholder_visual",
    category: "visual",
    pattern: /\b(?:IMAGE_HERE|SCREENSHOT_HERE|VISUAL_HERE)\b/gi,
    message: "Generated output contains a visual placeholder token.",
  },
  {
    code: "unsupported_visual_detail",
    category: "visual",
    pattern: /\bsupplied\s+(?:asset|image|screenshot|photo)\b/gi,
    message: "Generated output claims a visual asset was supplied.",
    requiresBlankOptionalCategory: true,
    ignoreWhenUserProvided: true,
  },
];

function getStringValue(value: unknown): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (/^(undefined|null|N\/A|\[object Object\])$/i.test(trimmed)) {
    return "";
  }
  return trimmed;
}

function normalizeForComparison(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function isCoveredByProvidedValue(
  match: string,
  providedValues: string[],
): boolean {
  const normalizedMatch = normalizeForComparison(match);
  if (!normalizedMatch) return false;

  return providedValues.some((value) => {
    const normalizedValue = normalizeForComparison(value);
    return (
      normalizedValue.includes(normalizedMatch) ||
      normalizedMatch.includes(normalizedValue)
    );
  });
}

function buildOutputValidationContext(
  variables: TemplateVariable[],
  values: Record<string, string>,
): OutputValidationContext {
  const blankOptionalCategories = new Set<OptionalFieldRiskCategory>();
  const providedValues: string[] = [];

  for (const variable of variables) {
    const suppliedValue = getStringValue(values[variable.key]);
    const defaultValue = getStringValue(variable.defaultValue);
    const effectiveValue = suppliedValue || defaultValue;

    if (effectiveValue) {
      providedValues.push(effectiveValue);
    }

    if (variable.required || defaultValue || suppliedValue) {
      continue;
    }

    for (const category of classifyOptionalFieldRiskCategories(variable)) {
      blankOptionalCategories.add(category);
    }
  }

  return { blankOptionalCategories, providedValues };
}

function collectMatches(pattern: RegExp, content: string): string[] {
  const flags = pattern.flags.includes("g")
    ? pattern.flags
    : `${pattern.flags}g`;
  const matcher = new RegExp(pattern.source, flags);
  return [...content.matchAll(matcher)]
    .map((match) => match[0]?.trim() ?? "")
    .filter(Boolean);
}

export function validateGeneratedOutput(
  content: string,
  variables: TemplateVariable[] = [],
  values: Record<string, string> = {},
): GeneratedOutputValidationResult {
  const context = buildOutputValidationContext(variables, values);
  const issues: GeneratedOutputValidationIssue[] = [];
  const seen = new Set<string>();

  for (const rule of OUTPUT_PLACEHOLDER_RULES) {
    if (
      rule.requiresBlankOptionalCategory &&
      !context.blankOptionalCategories.has(rule.category)
    ) {
      continue;
    }

    for (const match of collectMatches(rule.pattern, content)) {
      if (
        rule.ignoreWhenUserProvided &&
        isCoveredByProvidedValue(match, context.providedValues)
      ) {
        continue;
      }

      const key = `${rule.code}:${rule.category}:${match.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      issues.push({
        code: rule.code,
        category: rule.category,
        match,
        message: rule.message,
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

export function getGeneratedOutputValidationMessage(
  result: GeneratedOutputValidationResult,
): string | null {
  if (result.ok) return null;

  const categories = [
    ...new Set(result.issues.map((issue) => issue.category)),
  ].join(", ");

  return `Output validation failed: generated content contains placeholder or unsupported ${categories} details. Please regenerate after adding the missing optional information or remove the placeholder before using the result.`;
}
