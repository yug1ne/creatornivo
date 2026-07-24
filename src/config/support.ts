/** User-facing support thread limits (Phase C). */

export const SUPPORT_SUBJECT_MAX_LENGTH = 140;
export const SUPPORT_BODY_MAX_LENGTH = 8000;
export const SUPPORT_SUBJECT_MIN_LENGTH = 3;
export const SUPPORT_BODY_MIN_LENGTH = 10;

export const SUPPORT_THREAD_LIST_LIMIT = 50;

export type SupportThreadStatusValue = "open" | "answered" | "closed";
export type SupportMessageSenderValue = "USER" | "ADMIN" | "SYSTEM";

export const SUPPORT_STATUS_LABELS: Record<SupportThreadStatusValue, string> = {
  open: "Open",
  answered: "Answered",
  closed: "Closed",
};
