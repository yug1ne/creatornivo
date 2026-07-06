import { PLANS, type Plan } from "@/config/plans";

import type { UserUsageSnapshot } from "@/lib/usage";

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

/** Plan-specific short error + longer guidance for the client UI. */
export function getQuotaExceededCopy(
  plan: Plan,
): Pick<QuotaExceededBody, "error" | "message"> {
  if (plan === PLANS.FREE) {
    return {
      error: "You've reached your daily generation limit",
      message:
        "Your daily limit resets at midnight UTC. Upgrade to Pro for 100 generations per month.",
    };
  }

  return {
    error: "You've reached your monthly generation limit",
    message:
      "Your monthly limit resets at the start of the next calendar month (UTC).",
  };
}

export function buildQuotaExceededBody(
  snapshot: UserUsageSnapshot,
): QuotaExceededBody {
  const copy = getQuotaExceededCopy(snapshot.plan);

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