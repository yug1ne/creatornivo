import { PLANS, type Plan } from "@/config/plans";

import type { UserUsageSnapshot } from "@/lib/usage";
import {
  EMAIL_VERIFICATION_REQUIRED_CODE,
  EMAIL_VERIFICATION_REQUIRED_MESSAGE,
} from "@/lib/auth/email-verification";
import {
  GENERATION_DISABLED_MESSAGE,
  getQuotaExceededCopy,
} from "@/lib/usage/quota-copy";

/** JSON body for HTTP 429 when generation quota is exhausted. */
export type QuotaExceededBody = {
  error: string;
  code: "quota_exceeded";
  plan: Plan;
  limit: number;
  remaining: 0;
  resetAt: string;
  message: string;
};

export type ParsedGenerationError = {
  message: string;
  code?: string;
  showUpgradeLink: boolean;
};

export function buildQuotaExceededBody(
  snapshot: UserUsageSnapshot,
  now = new Date(),
): QuotaExceededBody {
  const copy = getQuotaExceededCopy(snapshot.plan, snapshot.resetAt, now);

  return {
    ...copy,
    code: "quota_exceeded",
    plan: snapshot.plan,
    limit: snapshot.limit,
    remaining: 0,
    resetAt: snapshot.resetAt,
  };
}

/** Seconds until `resetAt` — used for the Retry-After response header. */
export function getRetryAfterSeconds(resetAt: string, now = new Date()): number {
  const resetMs = new Date(resetAt).getTime();
  if (Number.isNaN(resetMs)) {
    return 0;
  }

  return Math.max(0, Math.ceil((resetMs - now.getTime()) / 1000));
}

/** Maps API error JSON to a user-facing message (generate workspace). */
export function parseGenerationApiError(
  data: Record<string, unknown>,
): ParsedGenerationError {
  if (data.code === "generation_disabled") {
    return {
      message: GENERATION_DISABLED_MESSAGE,
      code: "generation_disabled",
      showUpgradeLink: false,
    };
  }

  if (data.code === EMAIL_VERIFICATION_REQUIRED_CODE) {
    return {
      message:
        typeof data.error === "string"
          ? data.error
          : EMAIL_VERIFICATION_REQUIRED_MESSAGE,
      code: EMAIL_VERIFICATION_REQUIRED_CODE,
      showUpgradeLink: false,
    };
  }

  if (data.code === "quota_exceeded") {
    const message =
      typeof data.message === "string"
        ? data.message
        : typeof data.error === "string"
          ? data.error
          : "Generation limit reached.";

    return {
      message,
      code: "quota_exceeded",
      showUpgradeLink: data.plan === PLANS.FREE,
    };
  }

  // Legacy reservation quota code (older clients / fallback)
  if (data.code === "quota" && typeof data.error === "string") {
    return {
      message: data.error,
      code: "quota",
      showUpgradeLink: false,
    };
  }

  return {
    message:
      typeof data.error === "string" ? data.error : "Generation failed.",
    showUpgradeLink: false,
  };
}