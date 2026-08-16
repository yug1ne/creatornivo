import { getGenerationPolicy, PLANS, type Plan } from "@/config/plans";
import {
  getAppSumoGenerationLimit,
  getAppSumoGenerationPolicy,
  getAppSumoMonthWindow,
  getAppSumoTier,
  type AppSumoActiveCodeCount,
  type AppSumoReasoningEffort,
  type AppSumoTier,
} from "@/config/appsumo";
import { getTrialPeriodKey, TRIAL_GENERATION_LIMIT } from "@/config/trial";
import { isGenerationAutoRepairEnabled } from "@/lib/templates/output-repair";
import {
  getUtcDayStart,
  resolveQuotaPeriod,
  type QuotaBasis,
} from "@/lib/usage/quota-period";

export type AccessMode =
  | "paid_pro"
  | "appsumo_t2"
  | "appsumo_t1"
  | "trial"
  | "free";

export type AccessQuotaType =
  | "billing_period"
  | "calendar_month"
  | "trial"
  | "daily";

export type GenerationReasoningEffort = AppSumoReasoningEffort | null;

export type EffectiveGenerationPolicy = {
  model: string;
  maxInputChars: number;
  requestsPerMinute: number;
  maxConcurrentGenerations: number;
  reasoningEffort: GenerationReasoningEffort;
  autoRepair: boolean;
  /** Plan value stored on GenerationReservation (never an AppSumo enum). */
  reservationPlan: Plan;
};

export type EffectiveQuota = {
  type: AccessQuotaType;
  periodKey: string;
  limit: number;
  startsAt: Date;
  endsAt: Date;
  basis: QuotaBasis;
};

export type AppSumoAccessSummary = {
  activeCodeCount: AppSumoActiveCodeCount;
  tier: AppSumoTier;
  /** True when codes are owned but Freemius Pro is currently granting access. */
  dormant: boolean;
};

export type CapabilityUser = {
  plan: Plan;
  emailVerified: Date | null;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
};

export type UserCapabilities = {
  billingPlan: Plan;
  accessMode: AccessMode;
  /** Alias of accessMode for existing trial call sites. */
  mode: AccessMode;
  canUseProTemplates: boolean;
  canExport: boolean;
  maxSavedPrompts: number;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  generationPolicy: EffectiveGenerationPolicy;
  quota: EffectiveQuota;
  appSumo: AppSumoAccessSummary;
};

export function isActiveTrial(
  user: Pick<
    CapabilityUser,
    "emailVerified" | "trialStartedAt" | "trialEndsAt"
  >,
  now = new Date(),
): boolean {
  if (!user.emailVerified || !user.trialStartedAt || !user.trialEndsAt) {
    return false;
  }

  const start = user.trialStartedAt.getTime();
  const end = user.trialEndsAt.getTime();
  const current = now.getTime();

  return (
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start < end &&
    current >= start &&
    current < end
  );
}

export function isAppSumoAccessMode(
  mode: AccessMode,
): mode is "appsumo_t1" | "appsumo_t2" {
  return mode === "appsumo_t1" || mode === "appsumo_t2";
}

export function clampAppSumoActiveCount(
  value: number | null | undefined,
): AppSumoActiveCodeCount {
  if (!value || value < 1) return 0;
  if (value >= 2) return 2;
  return 1;
}

function buildFreeQuota(now: Date): EffectiveQuota {
  const start = getUtcDayStart(now);
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return {
    type: "daily",
    periodKey: start.toISOString().slice(0, 10),
    limit: getGenerationPolicy(PLANS.FREE).maxGenerationsPerPeriod,
    startsAt: start,
    endsAt: end,
    basis: "utc_day",
  };
}

function buildProQuota(
  now: Date,
  providerPeriod?: {
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
  } | null,
): EffectiveQuota {
  const resolved = resolveQuotaPeriod(PLANS.PRO, now, providerPeriod);
  return {
    type:
      resolved.basis === "provider_billing"
        ? "billing_period"
        : "calendar_month",
    periodKey: resolved.periodKey,
    limit: getGenerationPolicy(PLANS.PRO).maxGenerationsPerPeriod,
    startsAt: resolved.start,
    endsAt: resolved.end,
    basis: resolved.basis,
  };
}

function buildTrialQuota(startedAt: Date, endsAt: Date): EffectiveQuota {
  return {
    type: "trial",
    periodKey: getTrialPeriodKey(startedAt),
    limit: TRIAL_GENERATION_LIMIT,
    startsAt: startedAt,
    endsAt: endsAt,
    basis: "trial",
  };
}

function buildAppSumoQuota(tier: AppSumoTier, now: Date): EffectiveQuota {
  const window = getAppSumoMonthWindow(now);
  return {
    type: "calendar_month",
    periodKey: window.periodKey,
    limit: getAppSumoGenerationLimit(tier),
    startsAt: window.start,
    endsAt: window.end,
    basis: "appsumo_month",
  };
}

function policyFromPlan(
  plan: Plan,
  autoRepair: boolean,
): EffectiveGenerationPolicy {
  const base = getGenerationPolicy(plan);
  return {
    model: base.model,
    maxInputChars: base.maxInputChars,
    requestsPerMinute: base.requestsPerMinute,
    maxConcurrentGenerations: base.maxConcurrentGenerations,
    reasoningEffort: null,
    autoRepair,
    reservationPlan: plan,
  };
}

function policyFromAppSumo(
  env?: NodeJS.ProcessEnv,
): EffectiveGenerationPolicy {
  const policy = getAppSumoGenerationPolicy(env);
  return {
    model: policy.model,
    maxInputChars: policy.maxInputChars,
    requestsPerMinute: policy.requestsPerMinute,
    maxConcurrentGenerations: policy.maxConcurrentGenerations,
    reasoningEffort: policy.reasoningEffort,
    autoRepair: false,
    // Luna family / Free compute. Quota identity is periodKey, never this field.
    reservationPlan: PLANS.FREE,
  };
}

/**
 * Single server-side grant source for templates, compute, quota, save, export.
 * User.plan remains billing truth only.
 */
export function resolveUserCapabilities(
  user: CapabilityUser,
  options: {
    isAdmin?: boolean;
    now?: Date;
    activeAppSumoCodeCount?: number;
    providerPeriod?: {
      currentPeriodStart?: Date | null;
      currentPeriodEnd?: Date | null;
    } | null;
    env?: NodeJS.ProcessEnv;
  } = {},
): UserCapabilities {
  const now = options.now ?? new Date();
  const autoRepair = isGenerationAutoRepairEnabled(
    options.env?.ENABLE_GENERATION_AUTO_REPAIR,
  );
  const activeCodeCount = clampAppSumoActiveCount(
    options.activeAppSumoCodeCount,
  );
  const appSumoTier = getAppSumoTier(activeCodeCount);
  const trialActive = isActiveTrial(user, now);
  const isPaidPro = user.plan === PLANS.PRO;

  let accessMode: AccessMode;
  if (isPaidPro) {
    accessMode = "paid_pro";
  } else if (appSumoTier === 2) {
    accessMode = "appsumo_t2";
  } else if (appSumoTier === 1) {
    accessMode = "appsumo_t1";
  } else if (trialActive) {
    accessMode = "trial";
  } else {
    accessMode = "free";
  }

  const appSumo: AppSumoAccessSummary = {
    activeCodeCount,
    tier: appSumoTier,
    dormant: isPaidPro && appSumoTier > 0,
  };

  const canUseProTemplates =
    accessMode === "paid_pro" ||
    isAppSumoAccessMode(accessMode) ||
    accessMode === "trial" ||
    options.isAdmin === true;

  if (accessMode === "paid_pro") {
    return {
      billingPlan: user.plan,
      accessMode,
      mode: accessMode,
      canUseProTemplates,
      canExport: true,
      maxSavedPrompts: Number.POSITIVE_INFINITY,
      trialStartedAt: user.trialStartedAt,
      trialEndsAt: user.trialEndsAt,
      generationPolicy: policyFromPlan(PLANS.PRO, autoRepair),
      quota: buildProQuota(now, options.providerPeriod),
      appSumo,
    };
  }

  if (isAppSumoAccessMode(accessMode)) {
    return {
      billingPlan: user.plan,
      accessMode,
      mode: accessMode,
      canUseProTemplates,
      canExport: true,
      maxSavedPrompts: Number.POSITIVE_INFINITY,
      trialStartedAt: user.trialStartedAt,
      trialEndsAt: user.trialEndsAt,
      generationPolicy: policyFromAppSumo(options.env),
      quota: buildAppSumoQuota(appSumoTier, now),
      appSumo,
    };
  }

  if (accessMode === "trial" && user.trialStartedAt && user.trialEndsAt) {
    return {
      billingPlan: user.plan,
      accessMode,
      mode: accessMode,
      canUseProTemplates,
      canExport: false,
      maxSavedPrompts: 10,
      trialStartedAt: user.trialStartedAt,
      trialEndsAt: user.trialEndsAt,
      generationPolicy: policyFromPlan(PLANS.FREE, autoRepair),
      quota: buildTrialQuota(user.trialStartedAt, user.trialEndsAt),
      appSumo,
    };
  }

  return {
    billingPlan: user.plan,
    accessMode: "free",
    mode: "free",
    canUseProTemplates,
    canExport: false,
    maxSavedPrompts: 10,
    trialStartedAt: user.trialStartedAt,
    trialEndsAt: user.trialEndsAt,
    generationPolicy: policyFromPlan(PLANS.FREE, autoRepair),
    quota: buildFreeQuota(now),
    appSumo,
  };
}

export function shouldSkipUserUsageIncrement(mode: AccessMode): boolean {
  return mode === "trial" || isAppSumoAccessMode(mode);
}

export function canSaveFromCapabilities(
  capabilities: Pick<UserCapabilities, "maxSavedPrompts">,
  currentCount: number,
): boolean {
  return currentCount < capabilities.maxSavedPrompts;
}
