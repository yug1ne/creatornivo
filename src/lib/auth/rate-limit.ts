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
}): Promise<void> {
  const enabled = input.enabled ?? isAuthRateLimitEnabled();
  if (!enabled) {
    warnRateLimitDisabled();
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
    if (error instanceof AuthRateLimitError) {
      throw error;
    }

    console.error("[auth-rate-limit] Upstash check failed", error);
    if (process.env.NODE_ENV === "development") {
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