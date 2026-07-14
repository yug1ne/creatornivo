import type { TemplateVariable } from "@/types/template";

import {
  classifyOptionalFieldRiskCategories,
  getTemplateInitialValue,
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
  | "unsupported_visual_detail"
  | "user_prohibited_phrase";

export type GeneratedOutputIssueCategory =
  | OptionalFieldRiskCategory
  | "restriction";

export interface GeneratedOutputValidationIssue {
  code: GeneratedOutputIssueCode;
  category: GeneratedOutputIssueCategory;
  match: string;
  message: string;
}

export interface GeneratedOutputValidationResult {
  ok: boolean;
  issues: GeneratedOutputValidationIssue[];
}

export interface GeneratedOutputSanitizationChange {
  category: OptionalFieldRiskCategory | "empty_section";
  removed: string;
  reason: string;
}

export interface GeneratedOutputSanitizationResult {
  content: string;
  changed: boolean;
  changes: GeneratedOutputSanitizationChange[];
}

interface OutputValidationContext {
  blankOptionalCategories: Set<OptionalFieldRiskCategory>;
  providedValues: string[];
  hasTemplateContext: boolean;
}

interface OutputPatternRule {
  code: GeneratedOutputIssueCode;
  category: OptionalFieldRiskCategory;
  pattern: RegExp;
  message: string;
  requiresBlankOptionalCategory?: boolean;
  ignoreWhenUserProvided?: boolean;
}

interface OutputSanitizerRule {
  category: OptionalFieldRiskCategory;
  pattern: RegExp;
  reason: string;
  scope: "line" | "sentence";
  requiresBlankOptionalCategory?: boolean;
  allowWithoutTemplateContext?: boolean;
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
    code: "unsupported_url_instruction",
    category: "url",
    pattern:
      /\b(?:i(?:'|’)ll|i will|we(?:'|’)ll|we will)\s+include\s+(?:a\s+)?link\b[^.!?\n]*\bbelow\b/gi,
    message: "Generated output asks the reader to use a missing link.",
    requiresBlankOptionalCategory: true,
    ignoreWhenUserProvided: true,
  },
  {
    code: "unsupported_url_instruction",
    category: "url",
    pattern: /\blink in bio\b/gi,
    message: "Generated output references a missing profile or bio link.",
    requiresBlankOptionalCategory: true,
    ignoreWhenUserProvided: true,
  },
  {
    code: "unsupported_url_instruction",
    category: "url",
    pattern:
      /^\s*(?:[-*•]\s*)?(?:download|get|visit|book|click|follow)\s+(?!whether\b|if\b)[^\n.?!]{2,100}$/gim,
    message: "Generated output contains a standalone CTA that depends on a missing link.",
    requiresBlankOptionalCategory: true,
    ignoreWhenUserProvided: true,
  },
  {
    code: "placeholder_commercial",
    category: "commercial",
    pattern:
      /\[(?:insert price|price|insert discount|discount|promo code|coupon code|insert promo code|offer details|insert offer details)\]/gi,
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
      /\[(?:insert statistic|statistic|insert proof|proof point|add source|customer quote|testimonial|citation|source)\]/gi,
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
    pattern: /\[(?:contact details|insert contact|phone number|email address|contact)\]/gi,
    message: "Generated output contains a contact placeholder.",
  },
  {
    code: "placeholder_contact",
    category: "contact",
    pattern: /\b(?:name|email)@example\.com\b/gi,
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
      /\[(?:insert image|add image|insert screenshot|add screenshot|upload product photo|image|screenshot)\]/gi,
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

const OUTPUT_SANITIZER_RULES: OutputSanitizerRule[] = [
  {
    category: "url",
    pattern:
      /\[(?:here|link|click here)\]\(\s*#\s*\)|\[(?:link if allowed|insert link|add link|insert url|add url|link|url)\]|\b(?:URL_HERE|LINK_HERE|YOUR_URL|INSERT_LINK|ADD_LINK)\b|\b(?:https?:\/\/)?(?:www\.)?example\.com(?:\/[^\s)]*)?/i,
    reason: "placeholder URL or link",
    scope: "line",
    requiresBlankOptionalCategory: true,
    allowWithoutTemplateContext: true,
  },
  {
    category: "url",
    pattern:
      /\b(?:i(?:'|’)ll|i will|we(?:'|’)ll|we will)\s+include\s+(?:a\s+)?link\b.*\bbelow\b/i,
    reason: "missing link-below instruction",
    scope: "sentence",
    requiresBlankOptionalCategory: true,
  },
  {
    category: "url",
    pattern:
      /\b(?:check|click|visit|open|see|use|book|download|follow)\s+(?:this\s+|the\s+)?(?:link|url)\s+(?:below|here)\b/i,
    reason: "missing link CTA",
    scope: "sentence",
    requiresBlankOptionalCategory: true,
  },
  {
    category: "url",
    pattern: /\blink in bio\b/i,
    reason: "missing profile link",
    scope: "sentence",
    requiresBlankOptionalCategory: true,
  },
  {
    category: "url",
    pattern:
      /^\s*(?:[-*•]\s*)?(?:download|get|visit|book|click|follow)\s+(?!whether\b|if\b)[^\n.?!]{2,100}$/i,
    reason: "standalone CTA without supplied destination",
    scope: "line",
    requiresBlankOptionalCategory: true,
  },
  {
    category: "commercial",
    pattern:
      /\[(?:insert price|price|insert discount|discount|promo code|coupon code|insert promo code|offer details|insert offer details)\]|\b(?:PRICE_HERE|DISCOUNT_HERE|PROMO_CODE|PROMO_CODE_HERE|COUPON_CODE|OFFER_HERE)\b/i,
    reason: "commercial placeholder",
    scope: "line",
    requiresBlankOptionalCategory: true,
    allowWithoutTemplateContext: true,
  },
  {
    category: "commercial",
    pattern: /\buse\s+(?:promo\s+|coupon\s+)?code\s+\[[^\]]+\]/i,
    reason: "placeholder promo code",
    scope: "sentence",
    requiresBlankOptionalCategory: true,
  },
  {
    category: "commercial",
    pattern: /\bsave\s+(?:XX|X{1,3})\s?%|\b(?:XX|X{1,3})\s?%\s+(?:off|discount|savings)\b/i,
    reason: "placeholder discount",
    scope: "sentence",
    requiresBlankOptionalCategory: true,
  },
  {
    category: "commercial",
    pattern: /\boffer\s+(?:ends|expires)\s+\[(?:date|deadline|time)\]/i,
    reason: "placeholder offer deadline",
    scope: "sentence",
    requiresBlankOptionalCategory: true,
  },
  {
    category: "commercial",
    pattern: /^\s*(?:[-*•]\s*)?limited spots available\.?\s*$/i,
    reason: "unsupplied scarcity line",
    scope: "line",
    requiresBlankOptionalCategory: true,
  },
  {
    category: "timing",
    pattern:
      /\[(?:date|time|location|address|insert date|insert time|insert location|insert address)\]|\b(?:DATE_HERE|TIME_HERE|LOCATION_HERE|ADDRESS_HERE)\b|\bTBD\s+(?:date|time|location|address)\b/i,
    reason: "timing or location placeholder",
    scope: "line",
    requiresBlankOptionalCategory: true,
    allowWithoutTemplateContext: true,
  },
  {
    category: "timing",
    pattern: /\b(?:join us on|visit us at)\s+\[(?:date|time|location|address)\]/i,
    reason: "missing date or location sentence",
    scope: "sentence",
    requiresBlankOptionalCategory: true,
  },
  {
    category: "proof",
    pattern:
      /\[(?:insert statistic|statistic|insert proof|proof point|add source|customer quote|testimonial|citation|source)\]|\b(?:STATISTIC_HERE|SOURCE_HERE|CITATION_HERE|PROOF_HERE)\b/i,
    reason: "proof or evidence placeholder",
    scope: "line",
    requiresBlankOptionalCategory: true,
    allowWithoutTemplateContext: true,
  },
  {
    category: "proof",
    pattern: /\baccording to\s+\[(?:source|citation|study|research)\]/i,
    reason: "placeholder source citation",
    scope: "sentence",
    requiresBlankOptionalCategory: true,
  },
  {
    category: "proof",
    pattern: /\bXX\s?%\s+of\s+(?:customers|users|creators|teams)\b/i,
    reason: "placeholder statistic",
    scope: "sentence",
    requiresBlankOptionalCategory: true,
  },
  {
    category: "proof",
    pattern: /\b(?:award-winning|certified by)\s+\[(?:name|organization|source)\]/i,
    reason: "placeholder credential",
    scope: "sentence",
    requiresBlankOptionalCategory: true,
  },
  {
    category: "disclosure",
    pattern:
      /\[(?:sponsor name|affiliate disclosure|partnership details|disclosure|partner name)\]/i,
    reason: "disclosure placeholder",
    scope: "line",
    requiresBlankOptionalCategory: true,
    allowWithoutTemplateContext: true,
  },
  {
    category: "disclosure",
    pattern: /\bsponsored by\s+\[(?:brand|sponsor name|company)\]/i,
    reason: "placeholder sponsor",
    scope: "sentence",
    requiresBlankOptionalCategory: true,
  },
  {
    category: "disclosure",
    pattern: /\buse my affiliate link\b/i,
    reason: "unsupplied affiliate link",
    scope: "sentence",
    requiresBlankOptionalCategory: true,
  },
  {
    category: "contact",
    pattern:
      /\b(?:name|email)@example\.com\b|\b555[-.\s]?\d{3}[-.\s]?\d{4}\b|@yourhandle\b|\[(?:phone number|email address|contact details|insert contact|contact)\]|\bCONTACT_HERE\b/i,
    reason: "contact placeholder",
    scope: "line",
    requiresBlankOptionalCategory: true,
    allowWithoutTemplateContext: true,
  },
  {
    category: "visual",
    pattern:
      /\[(?:insert image|add image|insert screenshot|add screenshot|upload product photo|image|screenshot)\]|\b(?:IMAGE_HERE|SCREENSHOT_HERE|VISUAL_HERE)\b/i,
    reason: "visual placeholder",
    scope: "line",
    requiresBlankOptionalCategory: true,
    allowWithoutTemplateContext: true,
  },
];

export const OUTPUT_SANITIZER_PATTERN_COUNT = OUTPUT_SANITIZER_RULES.length;

function getStringValue(value: unknown): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (
    /^(undefined|null|N\/A|\[object Object\]|No preference|Not specified)$/i.test(
      trimmed,
    )
  ) {
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
    const defaultValue = getStringValue(getTemplateInitialValue(variable));
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

  return {
    blankOptionalCategories,
    providedValues,
    hasTemplateContext: variables.length > 0,
  };
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

function testPattern(pattern: RegExp, content: string): boolean {
  const flags = pattern.flags.replace("g", "");
  return new RegExp(pattern.source, flags).test(content);
}

const USER_RESTRICTION_FIELD_KEYS = new Set([
  "additionalRequirements",
  "avoidTopicsAndPhrases",
  "brandSafetyRestrictions",
  "claimsAndEvidence",
  "claimsAndRestrictions",
  "claimsRestrictions",
  "claimsToSupport",
  "complianceNotes",
  "contentToAvoid",
  "doNotUse",
  "mandatoryRestrictions",
  "policyRestrictions",
  "privacyRestrictions",
  "prohibitedClaims",
  "regulatedRequirements",
  "restrictions",
  "restrictionsAndDisclosures",
  "sensitiveRequirements",
  "wordsToAvoid",
]);

const USER_RESTRICTION_KEY_PATTERN =
  /(?:avoid|doNotUse|do_not_use|restriction|prohibited|forbidden|compliance|privacy|sensitive|regulated|claimsAndRestrictions|claimsRestrictions|contentToAvoid|wordsToAvoid|additionalRequirements)/i;

const RESTRICTION_LEAD_PATTERN =
  /\b(?:avoid|do not use|don't use|dont use|do not include|don't include|dont include|never use|must not include|exclude|prohibited|forbidden)\b/i;

const QUOTED_PHRASE_PATTERN = /["“”'‘’]([^"“”'‘’\r\n]{2,120})["“”'‘’]/g;

function isUserRestrictionField(variable: TemplateVariable): boolean {
  const key = variable.key.trim();
  if (USER_RESTRICTION_FIELD_KEYS.has(key)) return true;

  return USER_RESTRICTION_KEY_PATTERN.test(
    `${variable.key} ${variable.label}`,
  );
}

function cleanForbiddenPhraseCandidate(candidate: string): string {
  return candidate
    .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
    .replace(
      /^(?:avoid|do not use|don't use|dont use|do not include|don't include|dont include|never use|must not include|exclude|prohibited|forbidden)\s*/i,
      "",
    )
    .replace(/^(?:the\s+)?(?:word|words|phrase|phrases)\s+/i, "")
    .trim()
    .replace(/^["“”'‘’]+|["“”'‘’]+$/g, "")
    .replace(/[.:;,\s]+$/g, "")
    .replace(/^["“”'‘’]+|["“”'‘’]+$/g, "")
    .trim();
}

function splitForbiddenPhraseList(value: string): string[] {
  return value
    .split(/\r?\n|,|;|\s+\|\s+/)
    .map(cleanForbiddenPhraseCandidate)
    .filter(Boolean);
}

function collectForbiddenPhrasesFromValue(value: string): string[] {
  const phrases = new Set<string>();

  for (const match of value.matchAll(QUOTED_PHRASE_PATTERN)) {
    const phrase = cleanForbiddenPhraseCandidate(match[1] ?? "");
    if (phrase) phrases.add(phrase);
  }

  for (const line of value.split(/\r?\n/)) {
    if (!RESTRICTION_LEAD_PATTERN.test(line)) continue;
    for (const phrase of splitForbiddenPhraseList(line)) {
      phrases.add(phrase);
    }
  }

  return [...phrases].filter((phrase) => phrase.length >= 2);
}

export function extractUserProhibitedPhrases(
  variables: TemplateVariable[] = [],
  values: Record<string, string> = {},
): string[] {
  const phrases = new Map<string, string>();

  for (const variable of variables) {
    if (!isUserRestrictionField(variable)) continue;

    const value = getStringValue(values[variable.key]);
    if (!value) continue;

    for (const phrase of collectForbiddenPhrasesFromValue(value)) {
      const normalized = normalizeForComparison(phrase);
      if (!normalized) continue;
      phrases.set(normalized, phrase);
    }
  }

  return [...phrases.values()];
}

function buildExactPhrasePattern(phrase: string): RegExp {
  const escaped = phrase
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  const hasWordBoundaryStart = /^\w/.test(phrase);
  const hasWordBoundaryEnd = /\w$/.test(phrase);

  return new RegExp(
    `${hasWordBoundaryStart ? "\\b" : ""}${escaped}${
      hasWordBoundaryEnd ? "\\b" : ""
    }`,
    "i",
  );
}

function findUserProhibitedPhraseMatches(
  content: string,
  variables: TemplateVariable[],
  values: Record<string, string>,
): string[] {
  const matches: string[] = [];

  for (const phrase of extractUserProhibitedPhrases(variables, values)) {
    if (buildExactPhrasePattern(phrase).test(content)) {
      matches.push(phrase);
    }
  }

  return matches;
}

function isRuleEnabled(
  rule: OutputSanitizerRule,
  context: OutputValidationContext,
): boolean {
  if (!rule.requiresBlankOptionalCategory) return true;
  if (context.blankOptionalCategories.has(rule.category)) return true;

  return !context.hasTemplateContext && rule.allowWithoutTemplateContext === true;
}

function isProtectedOutputLine(line: string): boolean {
  return (
    /^\s*(?:[-*•]\s*)?posting notes?\s*:/i.test(line) ||
    /\bcheck whether external links are allowed\b/i.test(line) ||
    /\bcheck (?:the )?(?:platform|subreddit|community) link rules\b/i.test(line)
  );
}

function getPreservableProvidedValues(
  context: OutputValidationContext,
): string[] {
  return context.providedValues.filter((value) => {
    const normalized = normalizeForComparison(value);
    return (
      normalized.length >= 4 &&
      !/^(auto|yes|no|minimal|no button|1)$/.test(normalized)
    );
  });
}

function containsProvidedValue(
  content: string,
  context: OutputValidationContext,
): boolean {
  return isCoveredByProvidedValue(content, getPreservableProvidedValues(context));
}

function matchingRule(
  content: string,
  context: OutputValidationContext,
  scope: OutputSanitizerRule["scope"],
): OutputSanitizerRule | null {
  if (!content.trim()) return null;
  if (containsProvidedValue(content, context)) return null;

  return (
    OUTPUT_SANITIZER_RULES.find(
      (rule) =>
        rule.scope === scope &&
        isRuleEnabled(rule, context) &&
        testPattern(rule.pattern, content),
    ) ?? null
  );
}

function splitIntoSentences(line: string): string[] {
  const parts = line.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g);
  return parts && parts.length > 0 ? parts : [line];
}

function cleanLineAfterSentenceRemoval(line: string): string {
  return line
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function collapseOutputBlankLines(content: string): string {
  const lines = content.split(/\r?\n/);
  const collapsed: string[] = [];

  for (const line of lines) {
    const previous = collapsed[collapsed.length - 1];
    if (!line.trim() && previous !== undefined && !previous.trim()) {
      continue;
    }
    collapsed.push(line);
  }

  return collapsed.join("\n").trim();
}

function isPostingNotesHeading(line: string): boolean {
  return /^\s*(?:#{1,6}\s+)?(?:\*\*)?Posting Notes(?:\*\*)?:?\s*$/i.test(
    line,
  );
}

function isEmptyPostingNotesSentinel(line: string): boolean {
  return /^\s*(?:[-*•]\s*)?(?:None|N\/A|Not provided|Not specified)\s*$/i.test(
    line,
  );
}

function isLikelyOutputSectionHeading(line: string): boolean {
  return (
    /^\s*#{1,6}\s+\S/.test(line) ||
    /^\s*\*\*[^*\r\n]{2,80}\*\*:?\s*$/.test(line)
  );
}

function removeEmptyPostingNotesSectionByLines(
  content: string,
): GeneratedOutputSanitizationResult | null {
  const lines = content.split(/\r?\n/);
  const removedBlocks: string[] = [];
  const keptLines: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!isPostingNotesHeading(line)) {
      keptLines.push(line);
      continue;
    }

    let sentinelIndex = index + 1;
    while (sentinelIndex < lines.length && !lines[sentinelIndex].trim()) {
      sentinelIndex += 1;
    }

    if (
      sentinelIndex >= lines.length ||
      !isEmptyPostingNotesSentinel(lines[sentinelIndex])
    ) {
      keptLines.push(line);
      continue;
    }

    let nextContentIndex = sentinelIndex + 1;
    while (nextContentIndex < lines.length && !lines[nextContentIndex].trim()) {
      nextContentIndex += 1;
    }

    if (
      nextContentIndex < lines.length &&
      !isLikelyOutputSectionHeading(lines[nextContentIndex])
    ) {
      keptLines.push(line);
      continue;
    }

    removedBlocks.push(lines.slice(index, nextContentIndex).join("\n").trim());
    index = nextContentIndex - 1;
  }

  if (removedBlocks.length === 0) return null;

  const sanitizedContent = collapseOutputBlankLines(keptLines.join("\n"));
  return {
    content: sanitizedContent,
    changed: sanitizedContent !== content,
    changes: removedBlocks.map((block) => ({
      category: "empty_section",
      removed: block,
      reason: "Removed empty Posting Notes section.",
    })),
  };
}

function removeEmptyPostingNotesSection(
  content: string,
): GeneratedOutputSanitizationResult | null {
  const lineBasedResult = removeEmptyPostingNotesSectionByLines(content);
  if (lineBasedResult) return lineBasedResult;

  const pattern =
    /(^|\n)([ \t]*(?:#{1,6}[ \t]+)?(?:\*\*)?Posting Notes(?:\*\*)?:?[ \t]*\r?\n[ \t]*(?:[-*вЂў][ \t]*)?(?:None|N\/A|Not provided|Not specified)[ \t]*)(?=(?:\r?\n[ \t]*){2,}|\r?\n?$)/gi;
  const removedBlocks: string[] = [];
  const contentWithoutEmptyNotes = content.replace(
    pattern,
    (match, leadingNewline: string, block: string) => {
      removedBlocks.push(block.trim());
      return leadingNewline === "\n" ? "\n" : "";
    },
  );

  if (removedBlocks.length === 0) return null;

  const sanitizedContent = collapseOutputBlankLines(contentWithoutEmptyNotes);
  return {
    content: sanitizedContent,
    changed: sanitizedContent !== content,
    changes: removedBlocks.map((block) => ({
      category: "empty_section",
      removed: block,
      reason: "Removed empty Posting Notes section.",
    })),
  };
}

export function sanitizeGeneratedOutput(
  content: string,
  variables: TemplateVariable[] = [],
  values: Record<string, string> = {},
): GeneratedOutputSanitizationResult {
  const context = buildOutputValidationContext(variables, values);
  const changes: GeneratedOutputSanitizationChange[] = [];
  const sanitizedLines: string[] = [];
  const emptyPostingNotesResult = removeEmptyPostingNotesSection(content);
  const sourceContent = emptyPostingNotesResult?.content ?? content;

  if (emptyPostingNotesResult) {
    changes.push(...emptyPostingNotesResult.changes);
  }
  const initialChangeCount = changes.length;

  for (const line of sourceContent.split(/\r?\n/)) {
    if (!line.trim()) {
      sanitizedLines.push(line);
      continue;
    }

    if (isProtectedOutputLine(line)) {
      sanitizedLines.push(line);
      continue;
    }

    const lineRule = matchingRule(line, context, "line");
    if (lineRule) {
      changes.push({
        category: lineRule.category,
        removed: line.trim(),
        reason: lineRule.reason,
      });
      continue;
    }

    const keptSentences: string[] = [];
    for (const sentence of splitIntoSentences(line)) {
      const sentenceRule = matchingRule(sentence, context, "sentence");
      if (sentenceRule) {
        changes.push({
          category: sentenceRule.category,
          removed: sentence.trim(),
          reason: sentenceRule.reason,
        });
        continue;
      }
      keptSentences.push(sentence.trim());
    }

    const cleanedLine = cleanLineAfterSentenceRemoval(keptSentences.join(" "));
    if (cleanedLine) {
      sanitizedLines.push(cleanedLine);
    }
  }

  if (emptyPostingNotesResult && changes.length === initialChangeCount) {
    return emptyPostingNotesResult;
  }

  if (changes.length === 0) {
    return {
      content,
      changed: false,
      changes,
    };
  }

  const sanitizedContent = collapseOutputBlankLines(sanitizedLines.join("\n"));

  return {
    content: sanitizedContent,
    changed: sanitizedContent !== content,
    changes,
  };
}

export function validateGeneratedOutput(
  content: string,
  variables: TemplateVariable[] = [],
  values: Record<string, string> = {},
): GeneratedOutputValidationResult {
  const context = buildOutputValidationContext(variables, values);
  const issues: GeneratedOutputValidationIssue[] = [];
  const seen = new Set<string>();

  for (const match of findUserProhibitedPhraseMatches(
    content,
    variables,
    values,
  )) {
    const key = `user_prohibited_phrase:restriction:${match.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    issues.push({
      code: "user_prohibited_phrase",
      category: "restriction",
      match,
      message:
        "Generated output contains a phrase explicitly prohibited by the user.",
    });
  }

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

  const prohibitedPhrase = result.issues.find(
    (issue) => issue.code === "user_prohibited_phrase",
  );
  if (prohibitedPhrase) {
    return `Output validation failed: generated content contains a phrase explicitly prohibited by the user: "${prohibitedPhrase.match}".`;
  }

  const categories = [
    ...new Set(result.issues.map((issue) => issue.category)),
  ].join(", ");

  return `Output validation failed: generated content contains placeholder or unsupported ${categories} details. Please regenerate after adding the missing optional information or remove the placeholder before using the result.`;
}
