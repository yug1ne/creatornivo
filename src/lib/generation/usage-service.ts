import { Prisma } from "@prisma/client";

import {
  getGenerationPolicy,
  type GenerationPeriod,
  type Plan,
} from "@/config/plans";
import { getTemplateMaxOutputTokens } from "@/config/template-output-limits";
import {
  getTrialPeriodKey,
  TRIAL_GENERATION_LIMIT,
} from "@/config/trial";
import { prisma } from "@/lib/db";
import {
  resolveQuotaPeriod,
  type ProviderPeriodInput,
  type QuotaBasis,
} from "@/lib/usage/quota-period";

export const GENERATION_RESERVATION_TTL_MS = 10 * 60 * 1000;
export const GENERATION_TRANSACTION_MAX_ATTEMPTS = 3;
export const GENERATION_TRANSACTION_ISOLATION_LEVEL =
  Prisma.TransactionIsolationLevel.Serializable;

export const GENERATION_RESERVATION_STATUS = {
  RESERVED: "reserved",
  STARTED: "started",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type GenerationReservationStatus =
  (typeof GENERATION_RESERVATION_STATUS)[keyof typeof GENERATION_RESERVATION_STATUS];

export type GenerationPolicyErrorCode =
  | "generation_in_progress"
  | "generation_already_completed"
  | "generation_request_failed"
  | "invalid_request"
  | "quota"
  | "rate_limit"
  | "concurrent"
  | "trial_expired"
  | "input_too_long";

export class GenerationPolicyError extends Error {
  constructor(
    public readonly code: GenerationPolicyErrorCode,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "GenerationPolicyError";
  }
}

export interface GenerationPeriodWindow {
  start: Date;
  end: Date;
  key: string;
  period: GenerationPeriod;
  basis: QuotaBasis;
}

export interface GenerationUsage {
  used: number;
  limit: number;
  period: GenerationPeriod | "trial";
  periodKey: string;
  basis: QuotaBasis | "trial";
  resetAt: string;
}

export interface ReservationRecord {
  id: string;
  requestId: string;
  userId: string;
  plan: Plan;
  periodKey: string;
  status: string;
  model: string;
  estimatedMaxOutputTokens: number;
  actualInputTokens: number | null;
  actualOutputTokens: number | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  expiresAt: Date;
}

interface CreateReservationInput {
  requestId: string;
  userId: string;
  plan: Plan;
  periodKey: string;
  model: string;
  estimatedMaxOutputTokens: number;
  createdAt: Date;
  expiresAt: Date;
}

export interface GenerationReservationTransaction {
  findByRequestId(
    userId: string,
    requestId: string,
  ): Promise<ReservationRecord | null>;
  countUsed(
    userId: string,
    start: Date,
    end: Date,
    periodKey?: string,
  ): Promise<number>;
  countRecent(userId: string, since: Date): Promise<number>;
  countActive(userId: string, now: Date): Promise<number>;
  create(input: CreateReservationInput): Promise<ReservationRecord>;
}

export interface CompletedGenerationInput {
  userId: string;
  templateId: string;
  prompt: string;
  result: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface FailedGenerationUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface GenerationReservationStore {
  runSerializable<T>(
    operation: (transaction: GenerationReservationTransaction) => Promise<T>,
  ): Promise<T>;
  markStarted(userId: string, requestId: string, now: Date): Promise<void>;
  complete(
    userId: string,
    requestId: string,
    generation: CompletedGenerationInput,
    now: Date,
  ): Promise<void>;
  fail(
    userId: string,
    requestId: string,
    usage: FailedGenerationUsage,
    now: Date,
  ): Promise<void>;
  countUsed(
    userId: string,
    start: Date,
    end: Date,
    periodKey?: string,
  ): Promise<number>;
}

function isSerializationConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

export async function runWithSerializationRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = GENERATION_TRANSACTION_MAX_ATTEMPTS,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isSerializationConflict(error) || attempt === maxAttempts) {
        throw error;
      }
    }
  }

  throw new Error("Serializable transaction retry exhausted");
}

async function runSerializableWithRetry<T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return runWithSerializationRetry(() =>
    prisma.$transaction(operation, {
      isolationLevel: GENERATION_TRANSACTION_ISOLATION_LEVEL,
    }),
  );
}

function toReservationRecord(
  reservation: ReservationRecord,
): ReservationRecord {
  return reservation;
}

function createPrismaTransaction(
  transaction: Prisma.TransactionClient,
): GenerationReservationTransaction {
  return {
    async findByRequestId(userId, requestId) {
      const reservation = await transaction.generationReservation.findUnique({
        where: {
          userId_requestId: {
            userId,
            requestId,
          },
        },
      });
      return reservation ? toReservationRecord(reservation) : null;
    },
    /**
     * Permanent period usage for the reservation gate / metrics.
     * Counts only successfully completed reservations — NOT failed, not
     * expired, not historical startedAt rows. Active in-flight work is
     * counted separately via countActive so concurrency cannot overshoot.
     */
    countUsed(userId, start, end, periodKey) {
      return transaction.generationReservation.count({
        where: {
          userId,
          createdAt: { gte: start, lt: end },
          ...(periodKey ? { periodKey } : {}),
          status: GENERATION_RESERVATION_STATUS.COMPLETED,
        },
      });
    },
    countRecent(userId, since) {
      return transaction.generationReservation.count({
        where: {
          userId,
          createdAt: { gte: since },
        },
      });
    },
    countActive(userId, now) {
      return transaction.generationReservation.count({
        where: {
          userId,
          status: {
            in: [
              GENERATION_RESERVATION_STATUS.RESERVED,
              GENERATION_RESERVATION_STATUS.STARTED,
            ],
          },
          expiresAt: { gt: now },
        },
      });
    },
    async create(input) {
      const reservation = await transaction.generationReservation.create({
        data: {
          ...input,
          status: GENERATION_RESERVATION_STATUS.RESERVED,
        },
      });
      return toReservationRecord(reservation);
    },
  };
}

export const prismaGenerationReservationStore: GenerationReservationStore = {
  runSerializable(operation) {
    return runSerializableWithRetry((transaction) =>
      operation(createPrismaTransaction(transaction)),
    );
  },
  async markStarted(userId, requestId, now) {
    const result = await prisma.generationReservation.updateMany({
      where: {
        userId,
        requestId,
        status: GENERATION_RESERVATION_STATUS.RESERVED,
      },
      data: {
        status: GENERATION_RESERVATION_STATUS.STARTED,
        startedAt: now,
      },
    });

    if (result.count !== 1) {
      throw new Error("Generation reservation could not be started");
    }
  },
  complete(userId, requestId, generation, now) {
    return runSerializableWithRetry(async (transaction) => {
      const reservation = await transaction.generationReservation.findUnique({
        where: {
          userId_requestId: {
            userId,
            requestId,
          },
        },
      });

      if (!reservation) {
        throw new Error("Generation reservation not found");
      }

      if (reservation.status === GENERATION_RESERVATION_STATUS.COMPLETED) {
        return;
      }

      await transaction.generation.create({
        data: {
          userId: generation.userId,
          templateId: generation.templateId,
          prompt: generation.prompt,
          result: generation.result,
          model: generation.model,
          tokensUsed: generation.inputTokens + generation.outputTokens,
        },
      });

      await transaction.generationReservation.update({
        where: {
          userId_requestId: {
            userId,
            requestId,
          },
        },
        data: {
          status: GENERATION_RESERVATION_STATUS.COMPLETED,
          actualInputTokens: generation.inputTokens,
          actualOutputTokens: generation.outputTokens,
          completedAt: now,
        },
      });
    });
  },
  async fail(userId, requestId, usage, now) {
    await prisma.generationReservation.updateMany({
      where: {
        userId,
        requestId,
        status: {
          not: GENERATION_RESERVATION_STATUS.COMPLETED,
        },
      },
      data: {
        status: GENERATION_RESERVATION_STATUS.FAILED,
        actualInputTokens: usage.inputTokens,
        actualOutputTokens: usage.outputTokens,
        completedAt: now,
      },
    });
  },
  countUsed(userId, start, end, periodKey) {
    return prisma.generationReservation.count({
      where: {
        userId,
        createdAt: { gte: start, lt: end },
        ...(periodKey ? { periodKey } : {}),
        status: GENERATION_RESERVATION_STATUS.COMPLETED,
      },
    });
  },
};

/**
 * Whether a reservation row permanently consumes monthly/daily quota.
 * Failed / cancelled / expired-without-complete must not.
 */
export function reservationCountsTowardPeriodQuota(reservation: {
  status: string;
}): boolean {
  return reservation.status === GENERATION_RESERVATION_STATUS.COMPLETED;
}

/**
 * Quota counting window for Free (UTC day) or Pro
 * (provider billing period when provided, else UTC calendar month).
 */
export function getGenerationPeriodWindow(
  plan: Plan,
  now = new Date(),
  providerPeriod?: ProviderPeriodInput | null,
): GenerationPeriodWindow {
  const resolved = resolveQuotaPeriod(plan, now, providerPeriod);

  return {
    start: resolved.start,
    end: resolved.end,
    key: resolved.periodKey,
    period: resolved.generationPeriod,
    basis: resolved.basis,
  };
}

export function countUserInputCharacters(
  values: Record<string, unknown>,
): number {
  return Object.values(values).reduce<number>((total, value) => {
    return total + (typeof value === "string" ? value.length : 0);
  }, 0);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === "string")
  );
}

export function validateUserInput(
  plan: Plan,
  values: unknown,
  maxInputChars?: number,
): asserts values is Record<string, string> {
  if (!isStringRecord(values)) {
    throw new GenerationPolicyError(
      "input_too_long",
      400,
      "Invalid generation input.",
    );
  }

  const inputLimit =
    maxInputChars ?? getGenerationPolicy(plan).maxInputChars;
  if (countUserInputCharacters(values) > inputLimit) {
    throw new GenerationPolicyError(
      "input_too_long",
      400,
      "Your input is too long.",
    );
  }
}

export async function reserveGeneration(
  input: {
    requestId: string;
    userId: string;
    plan: Plan;
    now?: Date;
    /**
     * Server-resolved template slug. Used only to set estimatedMaxOutputTokens
     * to the same ceiling the provider will use. Unknown/missing → plan fallback.
     */
    templateSlug?: string | null;
    /** Active application-trial window. Keeps billing plan/model policy unchanged. */
    trialPeriod?: {
      startedAt: Date;
      endsAt: Date;
    } | null;
    /**
     * AppSumo UTC-month window. periodKey must be appsumo:YYYY-MM.
     * Reservation.plan stays the billing/policy snapshot (free for AppSumo).
     */
    appsumoPeriod?: {
      start: Date;
      end: Date;
      periodKey: string;
      limit: number;
    } | null;
    /** Optional compute override (AppSumo Luna policy). */
    policyOverride?: {
      model: string;
      requestsPerMinute: number;
      maxConcurrentGenerations: number;
    } | null;
    /** When omitted for Pro, calendar-month fallback is used (no DB lookup). */
    providerPeriod?: ProviderPeriodInput | null;
  },
  store: GenerationReservationStore = prismaGenerationReservationStore,
): Promise<ReservationRecord> {
  const now = input.now ?? new Date();
  const policy = getGenerationPolicy(input.plan);
  const trialPeriod = input.trialPeriod ?? null;
  const appsumoPeriod = input.appsumoPeriod ?? null;
  const policyOverride = input.policyOverride ?? null;
  if (
    trialPeriod &&
    !(
      trialPeriod.startedAt.getTime() <= now.getTime() &&
      now.getTime() < trialPeriod.endsAt.getTime()
    )
  ) {
    throw new GenerationPolicyError(
      "trial_expired",
      403,
      "Your trial has ended. Free plan limits now apply.",
    );
  }

  const period = trialPeriod
    ? {
        start: trialPeriod.startedAt,
        end: trialPeriod.endsAt,
        key: getTrialPeriodKey(trialPeriod.startedAt),
        period: "trial" as const,
        basis: "trial" as const,
      }
    : appsumoPeriod
      ? {
          start: appsumoPeriod.start,
          end: appsumoPeriod.end,
          key: appsumoPeriod.periodKey,
          period: "month" as const,
          basis: "appsumo_month" as const,
        }
    : getGenerationPeriodWindow(input.plan, now, input.providerPeriod);
  const generationLimit = trialPeriod
    ? TRIAL_GENERATION_LIMIT
    : appsumoPeriod
      ? appsumoPeriod.limit
      : policy.maxGenerationsPerPeriod;
  const requestsPerMinute =
    policyOverride?.requestsPerMinute ?? policy.requestsPerMinute;
  const maxConcurrentGenerations =
    policyOverride?.maxConcurrentGenerations ??
    policy.maxConcurrentGenerations;
  const reservationModel = policyOverride?.model ?? policy.model;
  const estimatedMaxOutputTokens = getTemplateMaxOutputTokens(
    input.templateSlug,
    input.plan,
  );

  return store.runSerializable(async (transaction) => {
    const duplicate = await transaction.findByRequestId(
      input.userId,
      input.requestId,
    );

    if (duplicate) {
      if (duplicate.status === GENERATION_RESERVATION_STATUS.COMPLETED) {
        throw new GenerationPolicyError(
          "generation_already_completed",
          409,
          "This generation request has already completed.",
        );
      }

      if (
        duplicate.status === GENERATION_RESERVATION_STATUS.RESERVED ||
        duplicate.status === GENERATION_RESERVATION_STATUS.STARTED
      ) {
        throw new GenerationPolicyError(
          "generation_in_progress",
          409,
          "This generation request is already in progress.",
        );
      }

      throw new GenerationPolicyError(
        "generation_request_failed",
        409,
        "This generation request previously failed. Start a new attempt.",
      );
    }

    // Permanent quota = completed only (aligns with UserUsage / UI).
    // Active non-expired reserved|started slots also hold capacity so concurrent
    // requests cannot overshoot the period limit.
    const completed = await transaction.countUsed(
      input.userId,
      period.start,
      period.end,
      period.key,
    );
    const active = await transaction.countActive(input.userId, now);

    if (completed + active >= generationLimit) {
      throw new GenerationPolicyError(
        "quota",
        429,
        trialPeriod
          ? "You’ve reached the 30-generation trial limit."
          : appsumoPeriod
          ? "You’ve reached your AppSumo monthly generation limit."
          : input.plan === "free"
          ? "You’ve reached today’s free generation limit."
          : period.basis === "provider_billing"
            ? "You’ve reached your billing-period generation limit."
            : "You’ve reached your monthly generation limit.",
      );
    }

    if (active >= maxConcurrentGenerations) {
      throw new GenerationPolicyError(
        "concurrent",
        409,
        "A generation is already in progress.",
      );
    }

    const recent = await transaction.countRecent(
      input.userId,
      new Date(now.getTime() - 60_000),
    );

    if (recent >= requestsPerMinute) {
      throw new GenerationPolicyError(
        "rate_limit",
        429,
        "Too many requests. Please wait and try again.",
      );
    }

    return transaction.create({
      requestId: input.requestId,
      userId: input.userId,
      plan: input.plan,
      periodKey: period.key,
      model: reservationModel,
      estimatedMaxOutputTokens,
      createdAt: now,
      expiresAt: new Date(now.getTime() + GENERATION_RESERVATION_TTL_MS),
    });
  });
}

export async function getGenerationUsage(
  userId: string,
  plan: Plan,
  now = new Date(),
  store: GenerationReservationStore = prismaGenerationReservationStore,
  providerPeriod?: ProviderPeriodInput | null,
): Promise<GenerationUsage> {
  const policy = getGenerationPolicy(plan);
  const period = getGenerationPeriodWindow(plan, now, providerPeriod);
  const used = await store.countUsed(
    userId,
    period.start,
    period.end,
    period.key,
  );

  return {
    used,
    limit: policy.maxGenerationsPerPeriod,
    period: period.period,
    periodKey: period.key,
    basis: period.basis,
    resetAt: period.end.toISOString(),
  };
}

export async function getTrialGenerationUsage(
  userId: string,
  trialStartedAt: Date,
  trialEndsAt: Date,
  store: GenerationReservationStore = prismaGenerationReservationStore,
): Promise<GenerationUsage> {
  const periodKey = getTrialPeriodKey(trialStartedAt);
  const used = await store.countUsed(
    userId,
    trialStartedAt,
    trialEndsAt,
    periodKey,
  );

  return {
    used,
    limit: TRIAL_GENERATION_LIMIT,
    period: "trial",
    periodKey,
    basis: "trial",
    resetAt: trialEndsAt.toISOString(),
  };
}
