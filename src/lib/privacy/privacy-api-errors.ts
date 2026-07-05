import { AUTH_RATE_LIMIT_GENERIC_MESSAGE } from "@/config/auth-rate-limit";

export function getPrivacyActionError(
  status: number,
  data: { error?: unknown },
  fallback: string,
): string {
  if (status === 429) {
    return typeof data.error === "string"
      ? data.error
      : AUTH_RATE_LIMIT_GENERIC_MESSAGE;
  }

  return typeof data.error === "string" ? data.error : fallback;
}