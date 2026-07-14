import type { TemplateVariable } from "@/types/template";

import {
  extractUserProhibitedPhrases,
  validateGeneratedOutput,
} from "./output-validation";
import { GENERIC_MARKETING_CLICHES } from "./generation-qa-rules";

export type GenerationQaSeverity = "hard_fail" | "warning";

export type GenerationQaIssueCode =
  | "unresolved_placeholder"
  | "unsafe_token"
  | "empty_sentinel_section"
  | "placeholder_url"
  | "output_validation_issue"
  | "url_count_mismatch"
  | "count_control_mismatch"
  | "plain_text_versions_missing"
  | "accessibility_note_empty"
  | "required_disclosure_missing"
  | "user_prohibited_phrase"
  | "marketing_cliche";

export interface GenerationQaIssue {
  severity: GenerationQaSeverity;
  code: GenerationQaIssueCode;
  message: string;
  match?: string;
}

export interface CountControlExpectation {
  name: string;
  expected: number;
  pattern: RegExp;
}

export interface GenerationQaContext {
  variables?: TemplateVariable[];
  values?: Record<string, string>;
  expectedUrlCount?: number;
  countControls?: CountControlExpectation[];
  includePlainTextVersions?: boolean;
  accessibilityEnabled?: boolean;
  requiredDisclosurePhrases?: string[];
}

export interface GenerationQaResult {
  ok: boolean;
  hardFailures: GenerationQaIssue[];
  warnings: GenerationQaIssue[];
}

const UNSAFE_TOKEN_PATTERN = /\bundefined\b|\bnull\b|\[object Object\]/i;
const UNRESOLVED_PLACEHOLDER_PATTERN = /\{\{[a-zA-Z0-9_]+\}\}/;
const URL_PATTERN = /\bhttps?:\/\/[^\s)<>"']+/gi;
const PLACEHOLDER_URL_PATTERNS = [
  /\[(?:link|insert link|add link|url|insert url|click here|here)\]/i,
  /\[(?:here|link|click here)\]\(\s*#\s*\)/i,
  /\b(?:URL_HERE|LINK_HERE|YOUR_URL|INSERT_LINK|ADD_LINK)\b/i,
  /\b(?:https?:\/\/)?(?:www\.)?example\.com(?:\/[^\s)]*)?/i,
];
const EMPTY_SENTINEL_SECTION_PATTERN =
  /(^|\n)\s*(?:#{1,6}\s+)?(?:\*\*)?[A-Z][^\n:*]{1,80}(?:\*\*)?:?\s*\r?\n\s*(?:[-*•]\s*)?(?:None|N\/A|Not provided|Not specified|No notes)\s*(?=\r?\n{2,}|\r?\n?$)/gi;
const EMPTY_ACCESSIBILITY_PATTERN =
  /(^|\n)\s*(?:#{1,6}\s+)?(?:\*\*)?Accessibility(?:\s+(?:note|notes|text))?(?:\*\*)?:?\s*\r?\n\s*(?:[-*•]\s*)?(?:None|N\/A|Not provided|Not specified|No notes)\s*(?=\r?\n{2,}|\r?\n?$)/i;

function collectPatternMatches(pattern: RegExp, content: string): string[] {
  const flags = pattern.flags.includes("g")
    ? pattern.flags
    : `${pattern.flags}g`;
  return [...content.matchAll(new RegExp(pattern.source, flags))]
    .map((match) => match[0]?.trim() ?? "")
    .filter(Boolean);
}

function issue(
  severity: GenerationQaSeverity,
  code: GenerationQaIssueCode,
  message: string,
  match?: string,
): GenerationQaIssue {
  return { severity, code, message, match };
}

function countUrls(content: string): number {
  return collectPatternMatches(URL_PATTERN, content).length;
}

function containsPhrase(content: string, phrase: string): boolean {
  const escaped = phrase
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  const start = /^\w/.test(phrase) ? "\\b" : "";
  const end = /\w$/.test(phrase) ? "\\b" : "";
  return new RegExp(`${start}${escaped}${end}`, "i").test(content);
}

export function assertGeneratedOutputQuality(
  content: string,
  context: GenerationQaContext = {},
): GenerationQaResult {
  const variables = context.variables ?? [];
  const values = context.values ?? {};
  const hardFailures: GenerationQaIssue[] = [];
  const warnings: GenerationQaIssue[] = [];

  for (const match of collectPatternMatches(
    UNRESOLVED_PLACEHOLDER_PATTERN,
    content,
  )) {
    hardFailures.push(
      issue(
        "hard_fail",
        "unresolved_placeholder",
        "Output contains an unresolved template placeholder.",
        match,
      ),
    );
  }

  for (const match of collectPatternMatches(UNSAFE_TOKEN_PATTERN, content)) {
    hardFailures.push(
      issue(
        "hard_fail",
        "unsafe_token",
        "Output contains an unsafe rendered token.",
        match,
      ),
    );
  }

  for (const match of collectPatternMatches(
    EMPTY_SENTINEL_SECTION_PATTERN,
    content,
  )) {
    hardFailures.push(
      issue(
        "hard_fail",
        "empty_sentinel_section",
        "Output contains a section whose only content is an empty sentinel value.",
        match,
      ),
    );
  }

  for (const pattern of PLACEHOLDER_URL_PATTERNS) {
    for (const match of collectPatternMatches(pattern, content)) {
      hardFailures.push(
        issue(
          "hard_fail",
          "placeholder_url",
          "Output contains a fake or placeholder URL.",
          match,
        ),
      );
    }
  }

  const outputValidation = validateGeneratedOutput(content, variables, values);
  for (const validationIssue of outputValidation.issues) {
    hardFailures.push(
      issue(
        "hard_fail",
        validationIssue.code === "user_prohibited_phrase"
          ? "user_prohibited_phrase"
          : "output_validation_issue",
        validationIssue.message,
        validationIssue.match,
      ),
    );
  }

  if (
    context.expectedUrlCount !== undefined &&
    countUrls(content) !== context.expectedUrlCount
  ) {
    hardFailures.push(
      issue(
        "hard_fail",
        "url_count_mismatch",
        `Output contains ${countUrls(content)} URL(s), expected ${context.expectedUrlCount}.`,
      ),
    );
  }

  for (const control of context.countControls ?? []) {
    const actual = collectPatternMatches(control.pattern, content).length;
    if (actual !== control.expected) {
      hardFailures.push(
        issue(
          "hard_fail",
          "count_control_mismatch",
          `${control.name} expected ${control.expected}, got ${actual}.`,
        ),
      );
    }
  }

  if (
    context.includePlainTextVersions &&
    !/\bPlain[- ]Text Versions\b|\bPlain-text version:/i.test(content)
  ) {
    hardFailures.push(
      issue(
        "hard_fail",
        "plain_text_versions_missing",
        "Plain-text versions were requested but are absent from the output.",
      ),
    );
  }

  if (
    context.accessibilityEnabled &&
    EMPTY_ACCESSIBILITY_PATTERN.test(content)
  ) {
    hardFailures.push(
      issue(
        "hard_fail",
        "accessibility_note_empty",
        "Accessibility output is enabled but the accessibility note is empty.",
      ),
    );
  }

  for (const phrase of context.requiredDisclosurePhrases ?? []) {
    if (!containsPhrase(content, phrase)) {
      hardFailures.push(
        issue(
          "hard_fail",
          "required_disclosure_missing",
          `Required disclosure phrase is missing: ${phrase}.`,
          phrase,
        ),
      );
    }
  }

  const prohibitedPhrases = new Set(
    extractUserProhibitedPhrases(variables, values).map((phrase) =>
      phrase.toLowerCase(),
    ),
  );
  for (const phrase of GENERIC_MARKETING_CLICHES) {
    if (!containsPhrase(content, phrase)) continue;
    if (prohibitedPhrases.has(phrase.toLowerCase())) continue;
    warnings.push(
      issue(
        "warning",
        "marketing_cliche",
        "Output contains a generic marketing cliché.",
        phrase,
      ),
    );
  }

  return {
    ok: hardFailures.length === 0,
    hardFailures,
    warnings,
  };
}
