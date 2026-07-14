import type { TextContentResult } from "@/lib/ai/provider";
import type { TemplateVariable } from "@/types/template";

import {
  extractUserProhibitedPhrases,
  getGeneratedOutputValidationMessage,
  sanitizeGeneratedOutput,
  validateGeneratedOutput,
  type GeneratedOutputIssueCategory,
  type GeneratedOutputIssueCode,
  type GeneratedOutputValidationIssue,
  type GeneratedOutputValidationResult,
} from "./output-validation";

export type AutoRepairIssueCode =
  | GeneratedOutputIssueCode
  | "empty_sentinel_section";

export interface AutoRepairIssue {
  code: AutoRepairIssueCode;
  category: GeneratedOutputIssueCategory | "empty_section";
  match: string;
  message: string;
}

export interface AutoRepairAssessment {
  repairable: boolean;
  repairableIssues: AutoRepairIssue[];
  unrepairableIssues: GeneratedOutputValidationIssue[];
}

export interface GeneratedOutputRepairResult {
  attempted: boolean;
  repaired: boolean;
  content: string;
  validation: GeneratedOutputValidationResult;
  assessment: AutoRepairAssessment;
  repairInputTokens: number;
  repairOutputTokens: number;
  repairModel: string | null;
}

export type RepairModelCall = (prompt: string) => Promise<TextContentResult>;

const REPAIRABLE_VALIDATION_CODES = new Set<GeneratedOutputIssueCode>([
  "user_prohibited_phrase",
  "placeholder_url",
  "placeholder_disclosure",
]);

const EMPTY_SENTINEL_SECTION_PATTERN =
  /(^|\n)\s*(?:#{1,6}\s+)?(?:\*\*)?[A-Z][^\n:*]{1,80}(?:\*\*)?:?\s*\r?\n\s*(?:[-*\u2022]\s*)?(?:None|N\/A|Not provided|Not specified|No notes)\s*(?=\r?\n{2,}|\r?\n?$)/gi;

export function isGenerationAutoRepairEnabled(
  value = process.env.ENABLE_GENERATION_AUTO_REPAIR,
): boolean {
  return value === "true";
}

function collectEmptySentinelSectionIssues(content: string): AutoRepairIssue[] {
  return [...content.matchAll(EMPTY_SENTINEL_SECTION_PATTERN)].map((match) => ({
    code: "empty_sentinel_section",
    category: "empty_section",
    match: match[0].trim(),
    message:
      "Generated output contains a section whose only content is an empty sentinel value.",
  }));
}

function toAutoRepairIssue(
  issue: GeneratedOutputValidationIssue,
): AutoRepairIssue {
  return {
    code: issue.code,
    category: issue.category,
    match: issue.match,
    message: issue.message,
  };
}

export function assessGeneratedOutputAutoRepair(
  content: string,
  validation: GeneratedOutputValidationResult,
): AutoRepairAssessment {
  const repairableValidationIssues = validation.issues.filter((issue) =>
    REPAIRABLE_VALIDATION_CODES.has(issue.code),
  );
  const unrepairableIssues = validation.issues.filter(
    (issue) => !REPAIRABLE_VALIDATION_CODES.has(issue.code),
  );
  const emptySentinelIssues = collectEmptySentinelSectionIssues(content);
  const repairableIssues = [
    ...repairableValidationIssues.map(toAutoRepairIssue),
    ...emptySentinelIssues,
  ];

  return {
    repairable:
      repairableIssues.length > 0 && unrepairableIssues.length === 0,
    repairableIssues,
    unrepairableIssues,
  };
}

export function isGeneratedOutputValidAfterRepair(
  content: string,
  validation: GeneratedOutputValidationResult,
): boolean {
  return (
    validation.ok && collectEmptySentinelSectionIssues(content).length === 0
  );
}

export function getAutoRepairFailureMessage(
  content: string,
  validation: GeneratedOutputValidationResult,
): string {
  const validationMessage = getGeneratedOutputValidationMessage(validation);
  if (validationMessage) return validationMessage;

  if (collectEmptySentinelSectionIssues(content).length > 0) {
    return "Output validation failed: generated content contains an empty notes or disclosure section.";
  }

  return "Output validation failed. Please regenerate after adjusting the input.";
}

function formatRepairIssues(issues: AutoRepairIssue[]): string {
  return issues
    .map(
      (issue, index) =>
        `${index + 1}. ${issue.code} (${issue.category}): ${issue.match}`,
    )
    .join("\n");
}

function formatUserRestrictions(
  variables: TemplateVariable[],
  values: Record<string, string>,
): string {
  const prohibitedPhrases = extractUserProhibitedPhrases(variables, values);
  if (prohibitedPhrases.length === 0) {
    return "- No exact prohibited phrases were extracted.";
  }

  return prohibitedPhrases
    .map((phrase) => `- Do not use the exact phrase: ${phrase}`)
    .join("\n");
}

export function buildGeneratedOutputRepairPrompt(input: {
  content: string;
  issues: AutoRepairIssue[];
  variables: TemplateVariable[];
  values: Record<string, string>;
}): string {
  return [
    "You are repairing generated marketing/content output after validation failed.",
    "",
    "Rewrite the generated content only to fix the listed validation errors.",
    "Preserve the same sections, facts, offer, tone, and format.",
    "Remove or replace exact prohibited phrases with grounded wording.",
    "Remove empty None/N/A/Not provided-only sections when listed.",
    "Remove fake placeholder URLs or placeholder disclosure text when listed.",
    "",
    "Do not add new claims.",
    "Do not add new facts.",
    "Do not add URLs.",
    "Do not invent proof, testimonials, metrics, prices, dates, deadlines, discounts, credentials, approvals, or sources.",
    "Do not summarize or explain the repair.",
    "Output only the repaired final content.",
    "",
    "VALIDATION ERRORS",
    formatRepairIssues(input.issues),
    "",
    "USER RESTRICTIONS",
    formatUserRestrictions(input.variables, input.values),
    "",
    "ORIGINAL GENERATED OUTPUT",
    "<<<CREATORNIVO_GENERATED_OUTPUT",
    input.content,
    "CREATORNIVO_GENERATED_OUTPUT",
  ].join("\n");
}

export async function repairGeneratedOutputOnce(input: {
  content: string;
  validation: GeneratedOutputValidationResult;
  variables: TemplateVariable[];
  values: Record<string, string>;
  repairModel: RepairModelCall;
}): Promise<GeneratedOutputRepairResult> {
  const assessment = assessGeneratedOutputAutoRepair(
    input.content,
    input.validation,
  );

  if (!assessment.repairable) {
    return {
      attempted: false,
      repaired: false,
      content: input.content,
      validation: input.validation,
      assessment,
      repairInputTokens: 0,
      repairOutputTokens: 0,
      repairModel: null,
    };
  }

  const repairPrompt = buildGeneratedOutputRepairPrompt({
    content: input.content,
    issues: assessment.repairableIssues,
    variables: input.variables,
    values: input.values,
  });
  const repaired = await input.repairModel(repairPrompt);
  const sanitized = sanitizeGeneratedOutput(
    repaired.text,
    input.variables,
    input.values,
  );
  const validation = validateGeneratedOutput(
    sanitized.content,
    input.variables,
    input.values,
  );
  const finalAssessment = assessGeneratedOutputAutoRepair(
    sanitized.content,
    validation,
  );
  const finalContentIsValid = isGeneratedOutputValidAfterRepair(
    sanitized.content,
    validation,
  );

  return {
    attempted: true,
    repaired: finalContentIsValid,
    content: sanitized.content,
    validation,
    assessment: finalAssessment,
    repairInputTokens: repaired.inputTokens,
    repairOutputTokens: repaired.outputTokens,
    repairModel: repaired.model,
  };
}
