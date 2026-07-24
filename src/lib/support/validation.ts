import {
  SUPPORT_BODY_MAX_LENGTH,
  SUPPORT_BODY_MIN_LENGTH,
  SUPPORT_SUBJECT_MAX_LENGTH,
  SUPPORT_SUBJECT_MIN_LENGTH,
} from "@/config/support";

export type SupportValidationErrorCode =
  | "subject_required"
  | "subject_too_short"
  | "subject_too_long"
  | "body_required"
  | "body_too_short"
  | "body_too_long";

export class SupportValidationError extends Error {
  constructor(public readonly code: SupportValidationErrorCode) {
    super(code);
    this.name = "SupportValidationError";
  }
}

export function normalizeSupportSubject(raw: unknown): string {
  if (typeof raw !== "string") {
    throw new SupportValidationError("subject_required");
  }
  const subject = raw.trim().replace(/\s+/g, " ");
  if (!subject) {
    throw new SupportValidationError("subject_required");
  }
  if (subject.length < SUPPORT_SUBJECT_MIN_LENGTH) {
    throw new SupportValidationError("subject_too_short");
  }
  if (subject.length > SUPPORT_SUBJECT_MAX_LENGTH) {
    throw new SupportValidationError("subject_too_long");
  }
  return subject;
}

export function normalizeSupportBody(raw: unknown): string {
  if (typeof raw !== "string") {
    throw new SupportValidationError("body_required");
  }
  const body = raw.trim();
  if (!body) {
    throw new SupportValidationError("body_required");
  }
  if (body.length < SUPPORT_BODY_MIN_LENGTH) {
    throw new SupportValidationError("body_too_short");
  }
  if (body.length > SUPPORT_BODY_MAX_LENGTH) {
    throw new SupportValidationError("body_too_long");
  }
  return body;
}

export function supportValidationMessage(
  code: SupportValidationErrorCode,
): string {
  switch (code) {
    case "subject_required":
      return "Subject is required.";
    case "subject_too_short":
      return `Subject must be at least ${SUPPORT_SUBJECT_MIN_LENGTH} characters.`;
    case "subject_too_long":
      return `Subject must be at most ${SUPPORT_SUBJECT_MAX_LENGTH} characters.`;
    case "body_required":
      return "Message is required.";
    case "body_too_short":
      return `Message must be at least ${SUPPORT_BODY_MIN_LENGTH} characters.`;
    case "body_too_long":
      return `Message must be at most ${SUPPORT_BODY_MAX_LENGTH} characters.`;
    default:
      return "Invalid support request.";
  }
}
