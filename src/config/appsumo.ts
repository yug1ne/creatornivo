/**
 * AppSumo lifetime codes — server-owned policy.
 *
 * Billing truth stays on User.plan (free | pro) and Freemius.
 * AppSumo is a separate entitlement derived from active redemptions.
 *
 * Entropy note: AppSumo CSV codes must be 8–20 characters. 160 bits of
 * Crockford Base32 is 32 characters, which exceeds that limit. Codes are
 * therefore 20 Crockford characters = 100 bits (20 × 5). HMAC-SHA256 with
 * APPSUMO_CODE_HASH_SECRET is required so a leaked digest is not enough
 * to recover a code.
 */

export const APPSUMO_MAX_ACTIVE_CODES = 2;
export const APPSUMO_TIER1_GENERATION_LIMIT = 50;
export const APPSUMO_TIER2_GENERATION_LIMIT = 100;
export const APPSUMO_CODE_LENGTH = 20;
export const APPSUMO_CODE_SUFFIX_LENGTH = 4;
export const APPSUMO_PERIOD_PREFIX = "appsumo:";

/** Crockford Base32 without I, L, O, U. */
export const APPSUMO_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export const DEFAULT_APPSUMO_MODEL = "gpt-5.6-luna";

export type AppSumoReasoningEffort = "none" | "low";
export type AppSumoTier = 0 | 1 | 2;
export type AppSumoActiveCodeCount = 0 | 1 | 2;

export const appsumoGenerationPolicy = {
  model: DEFAULT_APPSUMO_MODEL,
  maxGenerationsPerPeriod: APPSUMO_TIER1_GENERATION_LIMIT,
  period: "month" as const,
  maxOutputTokens: 2000,
  maxInputChars: 12000,
  requestsPerMinute: 3,
  maxConcurrentGenerations: 1,
  reasoningEffort: "none" as AppSumoReasoningEffort,
  autoRepair: false,
} as const;

export function getAppSumoPeriodKey(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${APPSUMO_PERIOD_PREFIX}${year}-${month}`;
}

export function getAppSumoMonthWindow(now = new Date()): {
  start: Date;
  end: Date;
  periodKey: string;
} {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  return {
    start,
    end,
    periodKey: getAppSumoPeriodKey(now),
  };
}

export function getAppSumoTier(activeCodeCount: number): AppSumoTier {
  if (activeCodeCount >= 2) return 2;
  if (activeCodeCount === 1) return 1;
  return 0;
}

export function getAppSumoGenerationLimit(tier: AppSumoTier): number {
  if (tier === 2) return APPSUMO_TIER2_GENERATION_LIMIT;
  if (tier === 1) return APPSUMO_TIER1_GENERATION_LIMIT;
  return 0;
}

function resolveEnvModel(envValue: string | undefined, fallback: string): string {
  const trimmed = envValue?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

/**
 * Server-owned AppSumo compute policy.
 * Never reads OPENAI_MODEL_PRO. Optional OPENAI_MODEL_APPSUMO only.
 * APPSUMO_REASONING_EFFORT may be "none" (default) or "low".
 */
export function getAppSumoGenerationPolicy(
  env: NodeJS.ProcessEnv = process.env,
) {
  const reasoningRaw = (env.APPSUMO_REASONING_EFFORT ?? "none")
    .trim()
    .toLowerCase();
  const reasoningEffort: AppSumoReasoningEffort =
    reasoningRaw === "low" ? "low" : "none";

  return {
    ...appsumoGenerationPolicy,
    model: resolveEnvModel(env.OPENAI_MODEL_APPSUMO, DEFAULT_APPSUMO_MODEL),
    reasoningEffort,
    autoRepair: false as const,
  };
}

export const APPSUMO_MESSAGES = {
  alreadyOwned: "This code is already connected to your account.",
  unavailable: "This code is unavailable or has already been redeemed.",
  tier1Active: "AppSumo Tier 1 is active.",
  tier2Active: "AppSumo Tier 2 is active.",
  maxCodes: "This account has already reached the two-code limit.",
  unverified: "Verify your email before redeeming this code.",
  unauthenticated: "Sign in to redeem an AppSumo code.",
} as const;
