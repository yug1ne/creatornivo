import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { paddleApiFetch, PaddleApiError } from "@/lib/paddle/client";

export const PADDLE_CHECKOUT_INTENT_TTL_MS = 30 * 60 * 1000;
const EXPIRING_INTENT_STATUS = "pending";
const TRANSACTION_INTENT_STATUS = "transaction_created";
const BOUND_INTENT_STATUSES = ["transaction_completed", "subscription_bound"];

interface PaddleTransactionResponse {
  data: {
    id: string;
  };
}

interface PaddleTransactionStatusResponse {
  data: {
    id: string;
    status: string;
  };
}

export class PaddleCheckoutError extends Error {
  constructor(
    public readonly code:
      | "checkout_in_progress"
      | "checkout_payment_processing"
      | "checkout_status_unavailable",
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "PaddleCheckoutError";
  }
}

export interface PaddleCheckoutIntentRecord {
  id: string;
  userId: string;
  priceId: string;
  paddleTransactionId: string | null;
  status: string;
  expiresAt: Date;
}

export interface PaddleCheckoutIntentStore {
  reserve(input: {
    userId: string;
    priceId: string;
    now: Date;
    expiresAt: Date;
  }): Promise<{ intent: PaddleCheckoutIntentRecord; created: boolean }>;
  attachTransaction(intentId: string, transactionId: string): Promise<void>;
  markFailed(intentId: string): Promise<void>;
  markAbandoned(
    intentId: string,
    transactionId: string,
    now: Date,
  ): Promise<boolean>;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function findLiveIntent(userId: string, now: Date) {
  return prisma.paddleCheckoutIntent.findFirst({
    where: {
      userId,
      OR: [
        {
          status: EXPIRING_INTENT_STATUS,
          expiresAt: { gt: now },
        },
        {
          status: EXPIRING_INTENT_STATUS,
          paddleTransactionId: { not: null },
        },
        { status: TRANSACTION_INTENT_STATUS },
        { status: { in: BOUND_INTENT_STATUSES } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
}

export const prismaPaddleCheckoutIntentStore: PaddleCheckoutIntentStore = {
  async reserve(input) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await prisma.$transaction(
          async (transaction) => {
            await transaction.paddleCheckoutIntent.updateMany({
              where: {
                userId: input.userId,
                status: EXPIRING_INTENT_STATUS,
                paddleTransactionId: null,
                expiresAt: { lte: input.now },
              },
              data: { status: "expired" },
            });

            const existing = await transaction.paddleCheckoutIntent.findFirst({
              where: {
                userId: input.userId,
                OR: [
                  {
                    status: EXPIRING_INTENT_STATUS,
                    expiresAt: { gt: input.now },
                  },
                  {
                    status: EXPIRING_INTENT_STATUS,
                    paddleTransactionId: { not: null },
                  },
                  { status: TRANSACTION_INTENT_STATUS },
                  { status: { in: BOUND_INTENT_STATUSES } },
                ],
              },
              orderBy: { createdAt: "desc" },
            });
            if (existing) return { intent: existing, created: false };

            const intent = await transaction.paddleCheckoutIntent.create({
              data: {
                userId: input.userId,
                priceId: input.priceId,
                expiresAt: input.expiresAt,
              },
            });
            return { intent, created: true };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (isUniqueConstraintError(error) || code === "P2034") {
          const existing = await findLiveIntent(input.userId, input.now);
          if (existing) return { intent: existing, created: false };
          if (code === "P2034" && attempt < 3) continue;
        }
        throw error;
      }
    }
    throw new Error("Paddle checkout reservation retry exhausted");
  },
  async attachTransaction(intentId, transactionId) {
    const updated = await prisma.paddleCheckoutIntent.updateMany({
      where: { id: intentId, status: "pending" },
      data: {
        paddleTransactionId: transactionId,
        status: "transaction_created",
      },
    });
    if (updated.count !== 1) {
      throw new Error("Paddle checkout intent could not attach transaction");
    }
  },
  async markFailed(intentId) {
    await prisma.paddleCheckoutIntent.updateMany({
      where: { id: intentId, status: "pending" },
      data: { status: "failed" },
    });
  },
  async markAbandoned(intentId, transactionId, now) {
    const result = await prisma.paddleCheckoutIntent.updateMany({
      where: {
        id: intentId,
        status: TRANSACTION_INTENT_STATUS,
        paddleTransactionId: transactionId,
        expiresAt: { lte: now },
      },
      data: { status: "abandoned" },
    });
    return result.count === 1;
  },
};

export function isPaddleTransactionId(value: unknown): value is string {
  return typeof value === "string" && /^txn_[a-z0-9]+$/i.test(value);
}

async function handleExistingIntent(
  input: {
    userId: string;
    priceId: string;
    now: Date;
  },
  intent: PaddleCheckoutIntentRecord,
  store: PaddleCheckoutIntentStore,
  apiFetch: typeof paddleApiFetch,
): Promise<{ transactionId: string; intentId: string; reused: boolean }> {
  if (
    intent.status === TRANSACTION_INTENT_STATUS &&
    isPaddleTransactionId(intent.paddleTransactionId) &&
    intent.priceId === input.priceId
  ) {
    if (intent.expiresAt > input.now) {
      return {
        transactionId: intent.paddleTransactionId,
        intentId: intent.id,
        reused: true,
      };
    }

    let response: PaddleTransactionStatusResponse;
    try {
      response = await apiFetch<PaddleTransactionStatusResponse>(
        `/transactions/${intent.paddleTransactionId}`,
      );
    } catch (error) {
      if (error instanceof PaddleApiError) throw error;
      throw new PaddleCheckoutError(
        "checkout_status_unavailable",
        409,
        "Your existing checkout could not be verified. Please try again later.",
      );
    }

    if (
      response.data?.id !== intent.paddleTransactionId ||
      typeof response.data.status !== "string"
    ) {
      throw new PaddleCheckoutError(
        "checkout_status_unavailable",
        409,
        "Your existing checkout could not be verified. Please try again later.",
      );
    }

    if (["draft", "ready"].includes(response.data.status)) {
      return {
        transactionId: intent.paddleTransactionId,
        intentId: intent.id,
        reused: true,
      };
    }

    if (response.data.status === "canceled") {
      const released = await store.markAbandoned(
        intent.id,
        intent.paddleTransactionId,
        input.now,
      );
      if (!released) {
        throw new PaddleCheckoutError(
          "checkout_in_progress",
          409,
          "Checkout state changed. Please try again.",
        );
      }
      return createServerPaddleCheckout(input, store, apiFetch);
    }

    throw new PaddleCheckoutError(
      "checkout_payment_processing",
      409,
      "Your previous payment is already being processed. Manage your subscription or contact support.",
    );
  }

  if (BOUND_INTENT_STATUSES.includes(intent.status)) {
    throw new PaddleCheckoutError(
      "checkout_payment_processing",
      409,
      "Your previous payment is already being processed. Manage your subscription or contact support.",
    );
  }

  throw new PaddleCheckoutError(
    "checkout_in_progress",
    409,
    "A checkout is already being created. Please try again.",
  );
}

export async function createServerPaddleCheckout(
  input: {
    userId: string;
    priceId: string;
    now?: Date;
  },
  store: PaddleCheckoutIntentStore = prismaPaddleCheckoutIntentStore,
  apiFetch: typeof paddleApiFetch = paddleApiFetch,
): Promise<{ transactionId: string; intentId: string; reused: boolean }> {
  const now = input.now ?? new Date();
  const { intent, created } = await store.reserve({
    userId: input.userId,
    priceId: input.priceId,
    now,
    expiresAt: new Date(now.getTime() + PADDLE_CHECKOUT_INTENT_TTL_MS),
  });

  if (!created) {
    return handleExistingIntent(
      { userId: input.userId, priceId: input.priceId, now },
      intent,
      store,
      apiFetch,
    );
  }

  try {
    const response = await apiFetch<PaddleTransactionResponse>(
      "/transactions",
      {
        method: "POST",
        body: JSON.stringify({
          items: [{ price_id: input.priceId, quantity: 1 }],
          collection_mode: "automatic",
          custom_data: { checkoutIntentId: intent.id },
        }),
      },
    );
    const transactionId = response.data?.id;

    if (!isPaddleTransactionId(transactionId)) {
      throw new Error("Paddle returned an invalid transaction ID");
    }

    await store.attachTransaction(intent.id, transactionId);
    return { transactionId, intentId: intent.id, reused: false };
  } catch (error) {
    try {
      await store.markFailed(intent.id);
    } catch {
      console.error("Failed to mark Paddle checkout intent as failed");
    }
    throw error;
  }
}
