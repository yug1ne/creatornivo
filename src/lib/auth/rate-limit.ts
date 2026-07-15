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

/** Register is fail-closed in production when rate limiting is unavailable. */
export const AUTH_RATE_LIMIT_UNAVAILABLE_MESSAGE =
  "Registration is temporarily unavailable. Please try again later.";

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
 * Register is the only action that fails closed when rate limiting cannot run
 * in production. Login/reset/export/delete stay fail-open for availability.
 */
export function shouldFailClosedWhenRateLimitUnavailable(
  action: AuthRateLimitAction,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  return action === "register" && nodeEnv === "production";
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
}): Promise<void> {
  const nodeEnv = input.nodeEnv ?? process.env.NODE_ENV;
  const enabled = input.enabled ?? isAuthRateLimitEnabled();
  if (!enabled) {
    warnRateLimitDisabled();
    if (shouldFailClosedWhenRateLimitUnavailable(input.action, nodeEnv)) {
      console.error(
        "[auth-rate-limit] Register blocked: rate limiting is not configured in production",
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
    if (shouldFailClosedWhenRateLimitUnavailable(input.action, nodeEnv)) {
      throw new AuthRateLimitUnavailableError();
    }

    if (nodeEnv === "development") {
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
