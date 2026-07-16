import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import {
  AUTH_RATE_LIMIT_GENERIC_MESSAGE,
  authRateLimitPolicies,
  isAuthRateLimitEnabled,
  type AuthRateLimitAction,
  type AuthRateLimitPolicy,
} from "@/config/auth-rate-limit";
import { getSafeEmailHash, normalizeEmail } from "@/lib/auth/credentials";
import { getRateLimitClientKey } from "@/lib/auth/request";

export class AuthRateLimitError extends Error {
  readonly status = 429;

  constructor(message = AUTH_RATE_LIMIT_GENERIC_MESSAGE) {
    super(message);
    this.name = "AuthRateLimitError";
  }
}

/** Shown when real Production cannot enforce Upstash limits (fail-closed). */
export const AUTH_RATE_LIMIT_UNAVAILABLE_MESSAGE =
  "This action is temporarily unavailable. Please try again later.";

export class AuthRateLimitUnavailableError extends Error {
  readonly status = 503;

  constructor(message = AUTH_RATE_LIMIT_UNAVAILABLE_MESSAGE) {
    super(message);
    this.name = "AuthRateLimitUnavailableError";
  }
}

export type AuthRateLimitConsume = (
  bucket: string,
  policy: AuthRateLimitPolicy,
) => Promise<boolean>;

export type AuthRateLimitEnv = {
  /** Vercel deployment target: production | preview | development */
  vercelEnv?: string | undefined;
  /** Node environment; used only when VERCEL_ENV is unset (non-Vercel hosts). */
  nodeEnv?: string | undefined;
};

/**
 * Auth abuse endpoints that must not run without rate limiting on real Production.
 * export_data / delete_account / change_password stay fail-open for availability.
 */
export const AUTH_RATE_LIMIT_FAIL_CLOSED_ACTIONS = new Set<AuthRateLimitAction>([
  "login",
  "register",
  "forgot_password",
  "reset_password",
  "resend_verification",
]);

let warnedDisabled = false;
const limiterCache = new Map<string, Ratelimit>();

function warnRateLimitDisabled(): void {
  if (process.env.NODE_ENV === "development" && !warnedDisabled) {
    console.warn(
      "[auth-rate-limit] Upstash is not configured; skipping auth rate limits",
    );
    warnedDisabled = true;
  }
}

/**
 * True only for the real Production deployment.
 * - Prefer VERCEL_ENV === "production" (Preview is NOT production even if NODE_ENV=production).
 * - If VERCEL_ENV is unset (local / non-Vercel), fall back to NODE_ENV === "production".
 */
export function isRealProductionDeployment(
  env: AuthRateLimitEnv = {},
): boolean {
  const vercelEnv = env.vercelEnv ?? process.env.VERCEL_ENV;
  if (vercelEnv === "production") return true;
  if (vercelEnv === "preview" || vercelEnv === "development") return false;
  const nodeEnv = env.nodeEnv ?? process.env.NODE_ENV;
  return nodeEnv === "production";
}

/**
 * Whether this action must fail closed when Upstash is missing or errors.
 * Real Production only; Vercel Preview and local dev remain fail-open.
 */
export function shouldFailClosedWhenRateLimitUnavailable(
  action: AuthRateLimitAction,
  env: AuthRateLimitEnv = {},
): boolean {
  if (!AUTH_RATE_LIMIT_FAIL_CLOSED_ACTIONS.has(action)) return false;
  return isRealProductionDeployment(env);
}

function getUpstashLimiter(
  bucket: string,
  policy: AuthRateLimitPolicy,
): Ratelimit {
  const cacheKey = `${bucket}:${policy.windowSeconds}:${policy.maxAttempts}`;
  const existing = limiterCache.get(cacheKey);
  if (existing) return existing;

  const redis = Redis.fromEnv();
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      policy.maxAttempts,
      `${policy.windowSeconds} s`,
    ),
    prefix: `creatornivo:auth:${bucket}`,
  });
  limiterCache.set(cacheKey, limiter);
  return limiter;
}

async function consumeWithUpstash(
  bucket: string,
  policy: AuthRateLimitPolicy,
): Promise<boolean> {
  const limiter = getUpstashLimiter(bucket, policy);
  const result = await limiter.limit(bucket);
  return result.success;
}

export async function checkAuthRateLimits(input: {
  action: AuthRateLimitAction;
  ipKey: string;
  email?: string;
  enabled?: boolean;
  consume?: AuthRateLimitConsume;
  /** Override NODE_ENV for tests. Defaults to process.env.NODE_ENV. */
  nodeEnv?: string;
  /** Override VERCEL_ENV for tests. Defaults to process.env.VERCEL_ENV. */
  vercelEnv?: string;
}): Promise<void> {
  const env: AuthRateLimitEnv = {
    nodeEnv: input.nodeEnv ?? process.env.NODE_ENV,
    vercelEnv: input.vercelEnv ?? process.env.VERCEL_ENV,
  };
  const enabled = input.enabled ?? isAuthRateLimitEnabled();
  if (!enabled) {
    warnRateLimitDisabled();
    if (shouldFailClosedWhenRateLimitUnavailable(input.action, env)) {
      console.error(
        `[auth-rate-limit] ${input.action} blocked: rate limiting is not configured in real Production`,
      );
      throw new AuthRateLimitUnavailableError();
    }
    return;
  }

  const policies = authRateLimitPolicies[input.action];
  const consume = input.consume ?? consumeWithUpstash;

  try {
    const ipPolicy = "ip" in policies ? policies.ip : undefined;
    if (ipPolicy) {
      const allowed = await consume(`${input.action}:ip:${input.ipKey}`, ipPolicy);
      if (!allowed) {
        throw new AuthRateLimitError();
      }
    }

    const accountPolicy = "account" in policies ? policies.account : undefined;
    if (accountPolicy && input.email) {
      const emailHash = getSafeEmailHash(normalizeEmail(input.email));
      if (emailHash !== "missing") {
        const allowed = await consume(
          `${input.action}:account:${emailHash}`,
          accountPolicy,
        );
        if (!allowed) {
          throw new AuthRateLimitError();
        }
      }
    }
  } catch (error) {
    if (
      error instanceof AuthRateLimitError ||
      error instanceof AuthRateLimitUnavailableError
    ) {
      throw error;
    }

    console.error("[auth-rate-limit] Upstash check failed", error);
    if (shouldFailClosedWhenRateLimitUnavailable(input.action, env)) {
      throw new AuthRateLimitUnavailableError();
    }

    if (env.nodeEnv === "development") {
      console.warn(
        "[auth-rate-limit] Skipping auth rate limit after Upstash error in development",
      );
    }
    return;
  }
}

export async function enforceAuthRateLimit(input: {
  action: AuthRateLimitAction;
  request: Request;
  email?: string;
}): Promise<void> {
  await checkAuthRateLimits({
    action: input.action,
    ipKey: getRateLimitClientKey(input.request),
    email: input.email,
  });
}
