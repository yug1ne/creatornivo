export type AuthRateLimitAction =
  | "login"
  | "register"
  | "forgot_password"
  | "reset_password"
  | "change_password"
  | "export_data"
  | "delete_account";

export interface AuthRateLimitPolicy {
  /** Sliding window duration in seconds. */
  windowSeconds: number;
  /** Maximum attempts allowed in the window. */
  maxAttempts: number;
}

export const authRateLimitPolicies = {
  login: {
    ip: { windowSeconds: 15 * 60, maxAttempts: 20 },
    account: { windowSeconds: 15 * 60, maxAttempts: 10 },
  },
  register: {
    ip: { windowSeconds: 60 * 60, maxAttempts: 10 },
    account: { windowSeconds: 60 * 60, maxAttempts: 5 },
  },
  forgot_password: {
    ip: { windowSeconds: 60 * 60, maxAttempts: 5 },
    account: { windowSeconds: 60 * 60, maxAttempts: 3 },
  },
  reset_password: {
    ip: { windowSeconds: 60 * 60, maxAttempts: 10 },
  },
  change_password: {
    account: { windowSeconds: 60 * 60, maxAttempts: 10 },
  },
  export_data: {
    ip: { windowSeconds: 60 * 60, maxAttempts: 10 },
    account: { windowSeconds: 60 * 60, maxAttempts: 3 },
  },
  delete_account: {
    ip: { windowSeconds: 60 * 60, maxAttempts: 5 },
    account: { windowSeconds: 60 * 60, maxAttempts: 3 },
  },
} as const satisfies Record<
  AuthRateLimitAction,
  {
    ip?: AuthRateLimitPolicy;
    account?: AuthRateLimitPolicy;
  }
>;

export const AUTH_RATE_LIMIT_GENERIC_MESSAGE =
  "Too many attempts. Please try again later.";

export function isAuthRateLimitEnabled(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}