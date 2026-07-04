import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { PaddleServerCheckoutConfig } from "../src/config/paddle";
import { parsePaddleWebhookEvent } from "../src/app/api/paddle/webhook/route";
import {
  processPaddleWebhookEvent,
  type CancelPaddleSubscription,
  type PaddleWebhookEventInput,
} from "../src/lib/paddle/subscription-service";
import { cancelPaddleSubscriptionImmediately } from "../src/lib/paddle/subscription-cancel";
import { verifyPaddleWebhookSignature } from "../src/lib/paddle/webhook-verify";

const EARLY_PRICE = "pri_early";
const PRO_PRICE = "pri_pro";
const config: PaddleServerCheckoutConfig = {
  clientToken: "test_client",
  environment: "sandbox",
  environmentConfigured: true,
  apiKey: "test_api",
  webhookSecret: "test_secret",
  proPriceId: PRO_PRICE,
  earlyAccessPriceId: EARLY_PRICE,
};

type Subscription = {
  id: string;
  userId: string;
  provider: string;
  paddleCustomerId: string | null;
  paddleSubscriptionId: string | null;
  paddlePriceId: string | null;
  paddleStatus: string | null;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  lastPaddleEventAt: Date | null;
  earlyAccessClaimedAt: Date | null;
};

type Intent = {
  id: string;
  userId: string;
  priceId: string;
  paddleTransactionId: string | null;
  paddleSubscriptionId: string | null;
  status: string;
  expiresAt: Date;
  completedAt: Date | null;
};

type Adjustment = {
  id: string;
  paddleAdjustmentId: string;
  paddleTransactionId: string;
  paddleSubscriptionId: string | null;
  userId: string | null;
  action: string;
  type: string | null;
  status: string;
  currencyCode: string | null;
  total: string | null;
  occurredAt: Date;
  processedAt: Date | null;
  accessAction: string;
  accessRevokedAt: Date | null;
  accessRevokedReason: string | null;
  cancellationRequired: boolean;
  cancellationAttemptedAt: Date | null;
  cancellationCompletedAt: Date | null;
  lastEventId: string;
  createdAt: Date;
  updatedAt: Date;
};

class MemoryDatabase {
  events = new Map<string, unknown>();
  subscriptions = new Map<string, Subscription>();
  intents = new Map<string, Intent>();
  adjustments = new Map<string, Adjustment>();
  users = new Map([
    ["user-1", { id: "user-1", plan: "free" }],
    ["user-2", { id: "user-2", plan: "free" }],
  ]);
  userUpdates = 0;
  failUserUpdate = false;
  serializationFailures = 0;
  private transactionTail = Promise.resolve();

  seedIntent(overrides: Partial<Intent> = {}) {
    const intent: Intent = {
      id: "intent-1",
      userId: "user-1",
      priceId: EARLY_PRICE,
      paddleTransactionId: "txn_01",
      paddleSubscriptionId: null,
      status: "transaction_created",
      expiresAt: new Date("2026-07-04T00:00:00.000Z"),
      completedAt: null,
      ...overrides,
    };
    this.intents.set(intent.id, intent);
    return intent;
  }

  async $transaction<T>(
    operation: (transaction: Record<string, unknown>) => Promise<T>,
  ): Promise<T> {
    const previous = this.transactionTail;
    let release!: () => void;
    this.transactionTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;

    try {
      if (this.serializationFailures > 0) {
        this.serializationFailures -= 1;
        throw Object.assign(new Error("serialization conflict"), {
          code: "P2034",
        });
      }

    const draft = structuredClone({
      events: this.events,
      subscriptions: this.subscriptions,
      intents: this.intents,
      adjustments: this.adjustments,
      users: this.users,
      userUpdates: this.userUpdates,
    });
    const findSubscription = (where: Record<string, unknown>) =>
      Array.from(draft.subscriptions.values()).find((row) =>
        Object.entries(where).every(
          ([key, value]) => row[key as keyof Subscription] === value,
        ),
      ) ?? null;
    const transaction = {
      paddleWebhookEvent: {
        create: async ({ data }: { data: { eventId: string } }) => {
          if (draft.events.has(data.eventId)) {
            throw Object.assign(new Error("duplicate"), { code: "P2002" });
          }
          draft.events.set(data.eventId, data);
          return data;
        },
      },
      paddleCheckoutIntent: {
        findUnique: async ({
          where,
        }: {
          where: { paddleTransactionId?: string; id?: string };
        }) =>
          Array.from(draft.intents.values()).find(
            (intent) =>
              (where.paddleTransactionId !== undefined &&
                intent.paddleTransactionId === where.paddleTransactionId) ||
              (where.id !== undefined && intent.id === where.id),
          ) ?? null,
        update: async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<Intent>;
        }) => {
          const intent = draft.intents.get(where.id);
          if (!intent) throw new Error("intent missing");
          Object.assign(intent, data);
          return intent;
        },
      },
      paddleAdjustment: {
        findUnique: async ({
          where,
        }: {
          where: { id?: string; paddleAdjustmentId?: string };
        }) =>
          Array.from(draft.adjustments.values()).find(
            (adjustment) =>
              (where.id !== undefined && adjustment.id === where.id) ||
              (where.paddleAdjustmentId !== undefined &&
                adjustment.paddleAdjustmentId === where.paddleAdjustmentId),
          ) ?? null,
        findFirst: async ({
          where,
        }: {
          where: {
            paddleSubscriptionId?: string;
            accessRevokedAt?: { not: null };
          };
        }) =>
          Array.from(draft.adjustments.values()).find(
            (adjustment) =>
              (where.paddleSubscriptionId === undefined ||
                adjustment.paddleSubscriptionId ===
                  where.paddleSubscriptionId) &&
              (where.accessRevokedAt === undefined ||
                adjustment.accessRevokedAt !== null),
          ) ?? null,
        upsert: async ({
          where,
          create,
          update,
        }: {
          where: { paddleAdjustmentId: string };
          create: Omit<Adjustment, "id" | "createdAt" | "updatedAt">;
          update: Partial<Adjustment>;
        }) => {
          const existing = Array.from(draft.adjustments.values()).find(
            (adjustment) =>
              adjustment.paddleAdjustmentId === where.paddleAdjustmentId,
          );
          if (existing) {
            Object.assign(existing, update, { updatedAt: new Date() });
            return existing;
          }
          const saved: Adjustment = {
            id: `db-adj-${draft.adjustments.size + 1}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...create,
            cancellationAttemptedAt: create.cancellationAttemptedAt ?? null,
            cancellationCompletedAt: create.cancellationCompletedAt ?? null,
          };
          draft.adjustments.set(saved.id, saved);
          return saved;
        },
        updateMany: async ({
          where,
          data,
        }: {
          where: Record<string, unknown>;
          data: Partial<Adjustment>;
        }) => {
          const matches = (
            adjustment: Adjustment,
            filter: Record<string, unknown>,
          ): boolean =>
            Object.entries(filter).every(([key, value]) => {
              if (key === "OR" && Array.isArray(value)) {
                return value.some((part) =>
                  matches(adjustment, part as Record<string, unknown>),
                );
              }

              const current = adjustment[key as keyof Adjustment];
              if (
                key === "cancellationAttemptedAt" &&
                typeof value === "object" &&
                value !== null &&
                "lt" in value &&
                value.lt instanceof Date
              ) {
                return current instanceof Date && current < value.lt;
              }
              if (current instanceof Date && value instanceof Date) {
                return current.getTime() === value.getTime();
              }
              return current === value;
            });

          let count = 0;
          for (const adjustment of draft.adjustments.values()) {
            if (!matches(adjustment, where)) continue;
            Object.assign(adjustment, data, { updatedAt: new Date() });
            count += 1;
          }
          return { count };
        },
        update: async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<Adjustment>;
        }) => {
          const adjustment = draft.adjustments.get(where.id);
          if (!adjustment) throw new Error("adjustment missing");
          Object.assign(adjustment, data, { updatedAt: new Date() });
          return adjustment;
        },
      },
      subscription: {
        findUnique: async ({
          where,
        }: {
          where: Record<string, unknown>;
        }) => findSubscription(where),
        upsert: async ({
          where,
          create,
          update,
        }: {
          where: { userId: string };
          create: Omit<Subscription, "id">;
          update: Partial<Subscription>;
        }) => {
          const existing = findSubscription(where);
          if (existing) {
            Object.assign(existing, update);
            return existing;
          }
          const saved = {
            id: `db-sub-${draft.subscriptions.size + 1}`,
            ...create,
          };
          draft.subscriptions.set(saved.id, saved);
          return saved;
        },
      },
      user: {
        findUnique: async ({
          where,
        }: {
          where: { id: string };
          select: Record<string, boolean>;
        }) => draft.users.get(where.id) ?? null,
        update: async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { plan: string };
        }) => {
          if (this.failUserUpdate) throw new Error("injected failure");
          const user = draft.users.get(where.id);
          if (!user) throw new Error("user missing");
          user.plan = data.plan;
          draft.userUpdates += 1;
          return user;
        },
      },
    };

    const result = await operation(transaction);
    this.events = draft.events;
    this.subscriptions = draft.subscriptions;
    this.intents = draft.intents;
    this.adjustments = draft.adjustments;
    this.users = draft.users;
    this.userUpdates = draft.userUpdates;
    return result;
    } finally {
      release();
    }
  }

  get subscription() {
    return Array.from(this.subscriptions.values())[0];
  }

  get adjustment() {
    return Array.from(this.adjustments.values())[0];
  }
}

function subscriptionEvent(
  overrides: {
    eventId?: string;
    eventType?: string;
    occurredAt?: string;
    status?: string;
    priceId?: string;
    transactionId?: string | null;
    checkoutIntentId?: string;
    userId?: string;
    subscriptionId?: string;
    scheduledCancel?: boolean;
  } = {},
): PaddleWebhookEventInput {
  return {
    eventId: overrides.eventId ?? "evt_01",
    eventType: overrides.eventType ?? "subscription.activated",
    occurredAt: new Date(
      overrides.occurredAt ?? "2026-07-03T10:00:00.000Z",
    ),
    data: {
      id: overrides.subscriptionId ?? "sub_01",
      status: overrides.status ?? "active",
      customer_id: "ctm_01",
      transaction_id:
        overrides.transactionId === undefined
          ? "txn_01"
          : overrides.transactionId,
      custom_data: {
        checkoutIntentId: overrides.checkoutIntentId ?? "intent-1",
        ...(overrides.userId ? { userId: overrides.userId } : {}),
      },
      items: [
        {
          quantity: 1,
          price: { id: overrides.priceId ?? EARLY_PRICE },
        },
      ],
      ...(overrides.scheduledCancel
        ? { scheduled_change: { action: "cancel" } }
        : {}),
    },
  };
}

function transactionEvent(): PaddleWebhookEventInput {
  return {
    eventId: "evt_txn",
    eventType: "transaction.completed",
    occurredAt: new Date("2026-07-03T09:59:00.000Z"),
    data: {
      id: "txn_01",
      subscription_id: "sub_01",
      custom_data: { checkoutIntentId: "intent-1" },
      items: [{ quantity: 1, price_id: EARLY_PRICE }],
    },
  };
}

function adjustmentEvent(
  overrides: {
    eventId?: string;
    eventType?: string;
    occurredAt?: string;
    adjustmentId?: string;
    action?: string;
    type?: string | null;
    status?: string;
    transactionId?: string;
    subscriptionId?: string | null;
  } = {},
): PaddleWebhookEventInput {
  return {
    eventId: overrides.eventId ?? "evt_adj_01",
    eventType: overrides.eventType ?? "adjustment.created",
    occurredAt: new Date(
      overrides.occurredAt ?? "2026-07-03T12:00:00.000Z",
    ),
    data: {
      id: overrides.adjustmentId ?? "adj_01",
      action: overrides.action ?? "refund",
      type: overrides.type === undefined ? "full" : overrides.type,
      status: overrides.status ?? "approved",
      transaction_id: overrides.transactionId ?? "txn_01",
      subscription_id:
        overrides.subscriptionId === undefined
          ? "sub_01"
          : overrides.subscriptionId,
      customer_id: "ctm_01",
      currency_code: "USD",
      totals: { total: "490", currency_code: "USD" },
      created_at: "2026-07-03T11:59:00.000Z",
      updated_at: overrides.occurredAt ?? "2026-07-03T12:00:00.000Z",
    },
  };
}

function process(
  database: MemoryDatabase,
  event: PaddleWebhookEventInput,
  cancelSubscription?: CancelPaddleSubscription,
) {
  return processPaddleWebhookEvent(
    event,
    database as never,
    config,
    cancelSubscription ?? (async () => "canceled"),
  );
}

test("transaction.completed is recognized without granting client authority", () => {
  const parsed = parsePaddleWebhookEvent({
    event_id: "evt_txn",
    event_type: "transaction.completed",
    occurred_at: "2026-07-03T09:59:00.000Z",
    data: transactionEvent().data,
  });
  assert.equal(parsed?.eventType, "transaction.completed");
});

test("subscription.created binds a valid intent but does not grant Pro", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(
    db,
    subscriptionEvent({
      eventType: "subscription.created",
      status: "active",
    }),
  );
  assert.equal(db.subscription.userId, "user-1");
  assert.equal(db.users.get("user-1")?.plan, "free");
  assert.equal(db.intents.get("intent-1")?.status, "subscription_bound");
});

test("subscription.activated with a valid intent grants Pro and completes it", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  assert.equal(await process(db, subscriptionEvent()), "processed");
  assert.equal(db.users.get("user-1")?.plan, "pro");
  assert.equal(db.subscription.paddleCustomerId, "ctm_01");
  assert.equal(db.subscription.paddleSubscriptionId, "sub_01");
  assert.equal(db.subscription.paddlePriceId, EARLY_PRICE);
  assert.equal(db.intents.get("intent-1")?.status, "completed");
  assert.ok(db.intents.get("intent-1")?.completedAt);
  assert.ok(db.subscription.earlyAccessClaimedAt);
});

test("subscription.created followed by activated completes the original intent", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(
    db,
    subscriptionEvent({
      eventType: "subscription.created",
      status: "active",
    }),
  );
  await process(
    db,
    subscriptionEvent({
      eventId: "evt_activate",
      occurredAt: "2026-07-03T10:01:00.000Z",
    }),
  );
  assert.equal(db.users.get("user-1")?.plan, "pro");
  assert.equal(db.intents.get("intent-1")?.status, "completed");
});

test("activated before created binds by checkoutIntentId without transaction_id", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(
    db,
    subscriptionEvent({
      transactionId: null,
      occurredAt: "2026-07-03T11:00:00.000Z",
    }),
  );
  assert.equal(db.users.get("user-1")?.plan, "pro");
  assert.equal(db.intents.get("intent-1")?.status, "completed");
  assert.equal(
    db.intents.get("intent-1")?.paddleSubscriptionId,
    "sub_01",
  );

  assert.equal(
    await process(
      db,
      subscriptionEvent({
        eventId: "evt_created_old",
        eventType: "subscription.created",
        status: "active",
        occurredAt: "2026-07-03T10:00:00.000Z",
      }),
    ),
    "stale",
  );
  assert.equal(db.users.get("user-1")?.plan, "pro");
  assert.equal(db.subscriptions.size, 1);
});

test("a spoofed checkoutIntentId never grants Pro", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await assert.rejects(
    process(
      db,
      subscriptionEvent({
        transactionId: null,
        checkoutIntentId: "intent-spoofed",
      }),
    ),
    /not available yet/,
  );
  assert.equal(db.users.get("user-1")?.plan, "free");
  assert.equal(db.events.size, 0);
});

test("an intent completed by another subscription cannot be reused", async () => {
  const db = new MemoryDatabase();
  db.seedIntent({
    status: "completed",
    paddleSubscriptionId: "sub_other",
    completedAt: new Date("2026-07-03T09:00:00.000Z"),
  });
  assert.equal(await process(db, subscriptionEvent()), "ignored");
  assert.equal(db.users.get("user-1")?.plan, "free");
});

test("a matching signed active webhook succeeds after intent expiry", async () => {
  const db = new MemoryDatabase();
  db.seedIntent({
    status: "expired",
    expiresAt: new Date("2026-07-03T09:00:00.000Z"),
  });
  assert.equal(
    await process(db, subscriptionEvent({ transactionId: null })),
    "processed",
  );
  assert.equal(db.users.get("user-1")?.plan, "pro");
  assert.equal(db.intents.get("intent-1")?.status, "completed");
});

test("an expired intent without a server transaction grants nothing", async () => {
  const db = new MemoryDatabase();
  db.seedIntent({
    status: "expired",
    paddleTransactionId: null,
    expiresAt: new Date("2026-07-03T09:00:00.000Z"),
  });
  await assert.rejects(
    process(db, subscriptionEvent({ transactionId: null })),
    /not attached/,
  );
  assert.equal(db.users.get("user-1")?.plan, "free");
  assert.equal(db.events.size, 0);
});

test("subscription events without a valid intent do not grant Pro", async () => {
  const createdDb = new MemoryDatabase();
  assert.equal(
    await process(
      createdDb,
      subscriptionEvent({ eventType: "subscription.created" }),
    ),
    "ignored",
  );

  const activatedDb = new MemoryDatabase();
  await assert.rejects(
    process(
      activatedDb,
      subscriptionEvent({ eventType: "subscription.activated" }),
    ),
    /not available yet/,
  );
  assert.equal(activatedDb.events.size, 0);
  assert.equal(activatedDb.users.get("user-1")?.plan, "free");
  assert.equal(activatedDb.subscriptions.size, 0);
});

test("spoofed customData.userId is ignored", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(db, subscriptionEvent({ userId: "user-2" }));
  assert.equal(db.users.get("user-1")?.plan, "pro");
  assert.equal(db.users.get("user-2")?.plan, "free");
});

test("unknown or mismatched Price IDs do not grant Pro", async () => {
  for (const priceId of ["pri_unknown", PRO_PRICE]) {
    const db = new MemoryDatabase();
    db.seedIntent();
    assert.equal(
      await process(db, subscriptionEvent({ priceId })),
      "ignored",
    );
    assert.equal(db.users.get("user-1")?.plan, "free");
  }
});

test("transaction.completed records intent state but does not grant Pro", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  assert.equal(await process(db, transactionEvent()), "processed");
  assert.equal(db.intents.get("intent-1")?.status, "transaction_completed");
  assert.equal(db.users.get("user-1")?.plan, "free");
  assert.equal(db.subscriptions.size, 0);
});

test("transaction.completed after activated cannot downgrade completed intent", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(db, subscriptionEvent());
  await process(db, {
    ...transactionEvent(),
    eventId: "evt_txn_late",
    occurredAt: new Date("2026-07-03T12:00:00.000Z"),
  });
  assert.equal(db.intents.get("intent-1")?.status, "completed");
  assert.ok(db.intents.get("intent-1")?.completedAt);
});

test("the same event_id is applied once", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  const event = subscriptionEvent();
  assert.equal(await process(db, event), "processed");
  assert.equal(await process(db, event), "duplicate");
  assert.equal(db.userUpdates, 1);
});

test("an older occurred_at cannot overwrite newer subscription state", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(db, subscriptionEvent());
  assert.equal(
    await process(
      db,
      subscriptionEvent({
        eventId: "evt_old",
        eventType: "subscription.canceled",
        status: "canceled",
        occurredAt: "2026-07-03T09:00:00.000Z",
        transactionId: null,
        userId: "user-2",
      }),
    ),
    "stale",
  );
  assert.equal(db.users.get("user-1")?.plan, "pro");
});

test("subsequent events use paddleSubscriptionId and cancellation frees the owner", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(db, subscriptionEvent());
  await process(
    db,
    subscriptionEvent({
      eventId: "evt_cancel",
      eventType: "subscription.canceled",
      status: "canceled",
      occurredAt: "2026-07-03T11:00:00.000Z",
      transactionId: null,
      checkoutIntentId: "wrong-intent",
      userId: "user-2",
    }),
  );
  assert.equal(db.users.get("user-1")?.plan, "free");
  assert.equal(db.users.get("user-2")?.plan, "free");
  assert.equal(db.subscription.paddleSubscriptionId, "sub_01");
});

test("scheduled cancellation keeps Pro until subscription.canceled", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(db, subscriptionEvent());
  await process(
    db,
    subscriptionEvent({
      eventId: "evt_scheduled",
      eventType: "subscription.updated",
      occurredAt: "2026-07-03T11:00:00.000Z",
      transactionId: null,
      scheduledCancel: true,
    }),
  );
  assert.equal(db.users.get("user-1")?.plan, "pro");
  assert.equal(db.subscription.cancelAtPeriodEnd, true);
});

test("trialing never grants Pro and resumed active restores Pro", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(
    db,
    subscriptionEvent({
      eventType: "subscription.trialing",
      status: "trialing",
    }),
  );
  assert.equal(db.users.get("user-1")?.plan, "free");
  await process(
    db,
    subscriptionEvent({
      eventId: "evt_resume",
      eventType: "subscription.resumed",
      occurredAt: "2026-07-03T11:00:00.000Z",
      transactionId: null,
    }),
  );
  assert.equal(db.users.get("user-1")?.plan, "pro");
});

test("event ID and all state roll back together on failure", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  db.failUserUpdate = true;
  await assert.rejects(process(db, subscriptionEvent()), /injected failure/);
  assert.equal(db.events.size, 0);
  assert.equal(db.subscriptions.size, 0);
});

test("adjustment.created and adjustment.updated payloads are accepted", () => {
  for (const eventType of ["adjustment.created", "adjustment.updated"]) {
    const event = adjustmentEvent({ eventType });
    const parsed = parsePaddleWebhookEvent({
      event_id: event.eventId,
      event_type: event.eventType,
      occurred_at: event.occurredAt.toISOString(),
      data: event.data,
    });
    assert.equal(parsed?.eventType, eventType);
  }
});

test("invalid webhook signatures are rejected", () => {
  assert.equal(
    verifyPaddleWebhookSignature(
      JSON.stringify({ event_id: "evt_invalid" }),
      "ts=1720000000;h1=invalid",
      "test_secret",
    ),
    false,
  );
});

test("unknown valid events are recorded and ignored without changing access", async () => {
  const db = new MemoryDatabase();
  db.users.get("user-1")!.plan = "pro";

  assert.equal(
    await process(db, {
      eventId: "evt_unknown",
      eventType: "product.updated",
      occurredAt: new Date("2026-07-03T12:00:00.000Z"),
      data: { id: "pro_01" },
    }),
    "ignored",
  );
  assert.equal(db.events.size, 1);
  assert.equal(db.users.get("user-1")?.plan, "pro");
});

test("pending and rejected refunds preserve Pro", async () => {
  for (const status of ["pending_approval", "rejected"]) {
    const db = new MemoryDatabase();
    db.seedIntent();
    await process(db, subscriptionEvent());
    let cancellationCalls = 0;

    await process(
      db,
      adjustmentEvent({ status }),
      async () => {
        cancellationCalls += 1;
        return "canceled";
      },
    );

    assert.equal(db.users.get("user-1")?.plan, "pro");
    assert.equal(db.adjustment.status, status);
    assert.equal(db.adjustment.accessRevokedAt, null);
    assert.equal(cancellationCalls, 0);
  }
});

test("an approved partial refund preserves Pro and never cancels", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(db, subscriptionEvent());
  let cancellationCalls = 0;

  await process(
    db,
    adjustmentEvent({ type: "partial" }),
    async () => {
      cancellationCalls += 1;
      return "canceled";
    },
  );

  assert.equal(db.users.get("user-1")?.plan, "pro");
  assert.equal(db.adjustment.accessAction, "partial_refund_kept");
  assert.equal(cancellationCalls, 0);
});

test("an approved full refund revokes Pro and cancels the verified subscription", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(db, subscriptionEvent());
  const canceled: string[] = [];

  await process(
    db,
    adjustmentEvent(),
    async (subscriptionId) => {
      canceled.push(subscriptionId);
      return "canceled";
    },
  );

  assert.equal(db.users.get("user-1")?.plan, "free");
  assert.equal(db.adjustment.userId, "user-1");
  assert.equal(db.adjustment.accessAction, "revoked_full_refund");
  assert.equal(db.adjustment.accessRevokedReason, "full_refund");
  assert.ok(db.adjustment.accessRevokedAt);
  assert.equal(db.adjustment.cancellationRequired, false);
  assert.ok(db.adjustment.cancellationCompletedAt);
  assert.deepEqual(canceled, ["sub_01"]);
});

test("a renewal transaction full refund resolves through subscription_id", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(db, subscriptionEvent());

  await process(
    db,
    adjustmentEvent({ transactionId: "txn_renewal" }),
  );

  assert.equal(db.adjustment.paddleTransactionId, "txn_renewal");
  assert.equal(db.adjustment.userId, "user-1");
  assert.equal(db.users.get("user-1")?.plan, "free");
});

test("transaction-only adjustment binding uses PaddleCheckoutIntent", async () => {
  const db = new MemoryDatabase();
  db.seedIntent({ paddleSubscriptionId: null });
  db.users.get("user-1")!.plan = "pro";
  let cancellationCalls = 0;

  await process(
    db,
    adjustmentEvent({ subscriptionId: null }),
    async () => {
      cancellationCalls += 1;
      return "canceled";
    },
  );

  assert.equal(db.adjustment.userId, "user-1");
  assert.equal(db.users.get("user-1")?.plan, "free");
  assert.equal(db.adjustment.cancellationRequired, true);
  assert.equal(cancellationCalls, 0);
});

test("unknown adjustment identifiers change no user", async () => {
  const db = new MemoryDatabase();
  db.users.get("user-1")!.plan = "pro";

  assert.equal(
    await process(
      db,
      adjustmentEvent({
        subscriptionId: "sub_unknown",
        transactionId: "txn_unknown",
      }),
    ),
    "ignored",
  );

  assert.equal(db.users.get("user-1")?.plan, "pro");
  assert.equal(db.users.get("user-2")?.plan, "free");
  assert.equal(db.adjustment.userId, null);
  assert.equal(db.adjustment.accessAction, "ignored_unresolved_owner");
});

test("conflicting subscription and transaction owners affect neither user", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(db, subscriptionEvent());
  db.seedIntent({
    id: "intent-2",
    userId: "user-2",
    paddleTransactionId: "txn_user2",
    paddleSubscriptionId: "sub_user2",
  });

  assert.equal(
    await process(
      db,
      adjustmentEvent({ transactionId: "txn_user2" }),
    ),
    "ignored",
  );

  assert.equal(db.users.get("user-1")?.plan, "pro");
  assert.equal(db.users.get("user-2")?.plan, "free");
  assert.equal(db.adjustment.userId, null);
  assert.equal(db.adjustment.accessAction, "ignored_owner_conflict");
});

test("chargeback revokes Pro while warning and reversal never grant it", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(db, subscriptionEvent());

  await process(
    db,
    adjustmentEvent({
      adjustmentId: "adj_warning",
      eventId: "evt_warning",
      action: "chargeback_warning",
    }),
  );
  assert.equal(db.users.get("user-1")?.plan, "pro");

  await process(
    db,
    adjustmentEvent({
      adjustmentId: "adj_chargeback",
      eventId: "evt_chargeback",
      action: "chargeback",
      occurredAt: "2026-07-03T13:00:00.000Z",
    }),
  );
  assert.equal(db.users.get("user-1")?.plan, "free");

  await process(
    db,
    adjustmentEvent({
      adjustmentId: "adj_reverse",
      eventId: "evt_reverse",
      action: "chargeback_reverse",
      status: "approved",
      occurredAt: "2026-07-03T14:00:00.000Z",
    }),
  );
  assert.equal(db.users.get("user-1")?.plan, "free");
  assert.equal(db.adjustments.size, 3);
});

test("credit and reverse actions are stored without granting or revoking Pro", async () => {
  for (const action of [
    "credit",
    "chargeback_warning_reverse",
    "credit_reverse",
  ]) {
    const db = new MemoryDatabase();
    db.seedIntent();
    await process(db, subscriptionEvent());

    await process(
      db,
      adjustmentEvent({
        adjustmentId: `adj_${action.replaceAll("_", "")}`,
        eventId: `evt_${action.replaceAll("_", "")}`,
        action,
      }),
    );

    assert.equal(db.users.get("user-1")?.plan, "pro");
    assert.equal(db.adjustment.action, action);
    assert.equal(db.adjustment.accessRevokedAt, null);
  }
});

test("chargeback after subscription cancellation remains safely revoked", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(db, subscriptionEvent());
  await process(
    db,
    subscriptionEvent({
      eventId: "evt_cancel_before_chargeback",
      eventType: "subscription.canceled",
      status: "canceled",
      occurredAt: "2026-07-03T11:00:00.000Z",
      transactionId: null,
    }),
  );

  await process(
    db,
    adjustmentEvent({ action: "chargeback" }),
    async () => "already_canceled",
  );

  assert.equal(db.users.get("user-1")?.plan, "free");
  assert.equal(db.adjustment.accessRevokedReason, "chargeback");
  assert.ok(db.adjustment.cancellationCompletedAt);
});

test("a stale created event cannot roll approved back to pending", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(db, subscriptionEvent());
  const updated = adjustmentEvent({
    eventType: "adjustment.updated",
    eventId: "evt_updated",
    occurredAt: "2026-07-03T13:00:00.000Z",
  });
  await process(db, updated);

  assert.equal(
    await process(
      db,
      adjustmentEvent({
        eventId: "evt_created_old",
        status: "pending_approval",
        occurredAt: "2026-07-03T12:00:00.000Z",
      }),
    ),
    "stale",
  );
  assert.equal(db.adjustment.status, "approved");
  assert.equal(db.users.get("user-1")?.plan, "free");
  assert.equal(db.adjustments.size, 1);
});

test("adjustment.updated before created is processed safely", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(db, subscriptionEvent());

  await process(
    db,
    adjustmentEvent({
      eventType: "adjustment.updated",
      eventId: "evt_updated_first",
    }),
  );

  assert.equal(db.adjustments.size, 1);
  assert.equal(db.adjustment.status, "approved");
  assert.equal(db.users.get("user-1")?.plan, "free");
});

test("duplicate adjustment ID updates one record and duplicate event does no work", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(db, subscriptionEvent());
  let cancellationCalls = 0;
  const cancel: CancelPaddleSubscription = async () => {
    cancellationCalls += 1;
    return "canceled";
  };
  const event = adjustmentEvent();

  assert.equal(await process(db, event, cancel), "processed");
  assert.equal(await process(db, event, cancel), "duplicate");
  assert.equal(db.adjustments.size, 1);
  assert.equal(cancellationCalls, 1);
});

test("parallel adjustment events serialize into one revocation", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(db, subscriptionEvent());
  let cancellationCalls = 0;
  const cancel: CancelPaddleSubscription = async () => {
    cancellationCalls += 1;
    return "canceled";
  };

  await Promise.all([
    process(
      db,
      adjustmentEvent({
        eventId: "evt_pending",
        status: "pending_approval",
      }),
      cancel,
    ),
    process(
      db,
      adjustmentEvent({
        eventId: "evt_approved",
        eventType: "adjustment.updated",
        occurredAt: "2026-07-03T13:00:00.000Z",
      }),
      cancel,
    ),
  ]);

  assert.equal(db.adjustments.size, 1);
  assert.equal(db.users.get("user-1")?.plan, "free");
  assert.equal(cancellationCalls, 1);
});

test("parallel approved events cannot call Paddle cancellation twice", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(db, subscriptionEvent());
  let cancellationCalls = 0;
  let releaseCancellation!: () => void;
  let signalStarted!: () => void;
  const cancellationGate = new Promise<void>((resolve) => {
    releaseCancellation = resolve;
  });
  const cancellationStarted = new Promise<void>((resolve) => {
    signalStarted = resolve;
  });
  const cancel: CancelPaddleSubscription = async () => {
    cancellationCalls += 1;
    signalStarted();
    await cancellationGate;
    return "canceled";
  };

  const first = process(db, adjustmentEvent(), cancel);
  await cancellationStarted;
  const secondEvent = adjustmentEvent({
    eventId: "evt_adj_parallel_newer",
    eventType: "adjustment.updated",
    occurredAt: "2026-07-03T13:00:00.000Z",
  });
  await assert.rejects(
    process(db, secondEvent, cancel),
    /cancellation is already in progress/,
  );
  releaseCancellation();
  await first;
  assert.equal(await process(db, secondEvent, cancel), "duplicate");
  assert.equal(cancellationCalls, 1);
});

test("P2034 retries the webhook transaction without repeating cancellation", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(db, subscriptionEvent());
  db.serializationFailures = 1;
  let cancellationCalls = 0;

  await process(db, adjustmentEvent(), async () => {
    cancellationCalls += 1;
    return "canceled";
  });

  assert.equal(db.users.get("user-1")?.plan, "free");
  assert.equal(cancellationCalls, 1);
});

test("temporary Paddle cancellation failure remains retryable", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(db, subscriptionEvent());
  const event = adjustmentEvent();

  await assert.rejects(
    process(db, event, async () => {
      throw new Error("temporary Paddle outage");
    }),
    /temporary Paddle outage/,
  );
  assert.equal(db.users.get("user-1")?.plan, "free");
  assert.equal(db.adjustment.cancellationRequired, true);
  assert.equal(db.adjustment.cancellationCompletedAt, null);

  let retryCalls = 0;
  assert.equal(
    await process(db, event, async () => {
      retryCalls += 1;
      return "canceled";
    }),
    "duplicate",
  );
  assert.equal(retryCalls, 1);
  assert.equal(db.adjustment.cancellationRequired, false);
  assert.ok(db.adjustment.cancellationCompletedAt);
});

test("adjustment event and access changes roll back on database failure", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(db, subscriptionEvent());
  const eventCount = db.events.size;
  db.failUserUpdate = true;
  let cancellationCalls = 0;

  await assert.rejects(
    process(db, adjustmentEvent(), async () => {
      cancellationCalls += 1;
      return "canceled";
    }),
    /injected failure/,
  );

  assert.equal(db.events.size, eventCount);
  assert.equal(db.adjustments.size, 0);
  assert.equal(db.users.get("user-1")?.plan, "pro");
  assert.equal(cancellationCalls, 0);
});

test("already canceled is an idempotent cancellation success", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(db, subscriptionEvent());

  await process(db, adjustmentEvent(), async () => "already_canceled");

  assert.equal(db.users.get("user-1")?.plan, "free");
  assert.equal(db.adjustment.cancellationRequired, false);
  assert.ok(db.adjustment.cancellationCompletedAt);
});

test("old active events cannot restore Pro after refund, but a new subscription can", async () => {
  const db = new MemoryDatabase();
  db.seedIntent();
  await process(db, subscriptionEvent());
  await process(db, adjustmentEvent());

  await process(
    db,
    subscriptionEvent({
      eventId: "evt_old_subscription_replayed",
      occurredAt: "2026-07-03T14:00:00.000Z",
      transactionId: null,
    }),
  );
  assert.equal(db.users.get("user-1")?.plan, "free");

  db.seedIntent({
    id: "intent-new",
    paddleTransactionId: "txn_new",
    paddleSubscriptionId: null,
  });
  await process(
    db,
    subscriptionEvent({
      eventId: "evt_new_subscription",
      occurredAt: "2026-07-03T15:00:00.000Z",
      transactionId: "txn_new",
      checkoutIntentId: "intent-new",
      subscriptionId: "sub_new",
    }),
  );
  assert.equal(db.users.get("user-1")?.plan, "pro");
  assert.equal(db.subscription.paddleSubscriptionId, "sub_new");

  assert.equal(
    await process(
      db,
      subscriptionEvent({
        eventId: "evt_old_after_new",
        occurredAt: "2026-07-03T16:00:00.000Z",
        transactionId: "txn_01",
        checkoutIntentId: "intent-1",
        subscriptionId: "sub_01",
      }),
    ),
    "ignored",
  );
  assert.equal(db.users.get("user-1")?.plan, "pro");
  assert.equal(db.subscription.paddleSubscriptionId, "sub_new");

  await process(
    db,
    adjustmentEvent({
      adjustmentId: "adj_old_after_new",
      eventId: "evt_adj_old_after_new",
      occurredAt: "2026-07-03T17:00:00.000Z",
    }),
  );
  assert.equal(db.users.get("user-1")?.plan, "pro");
  assert.equal(db.subscription.paddleSubscriptionId, "sub_new");
});

test("refund lifecycle never deletes prompts or changes generation usage", () => {
  const source = readFileSync(
    "src/lib/paddle/subscription-service.ts",
    "utf8",
  );
  assert.doesNotMatch(source, /savedPrompt\.(delete|deleteMany)/);
  assert.doesNotMatch(source, /generationReservation\.(delete|update)/);
  assert.doesNotMatch(source, /generation\.(delete|deleteMany)/);
});

test("the adjustment migration is additive and preserves existing data", () => {
  const migration = readFileSync(
    "prisma/migrations/20260710100000_paddle_adjustments/migration.sql",
    "utf8",
  );
  assert.match(migration, /CREATE TABLE "PaddleAdjustment"/);
  assert.match(
    migration,
    /CREATE UNIQUE INDEX "PaddleAdjustment_paddleAdjustmentId_key"/,
  );
  assert.doesNotMatch(
    migration,
    /^\s*(?:DROP|DELETE|TRUNCATE|UPDATE)\b|ALTER TABLE[^;]*DROP/gim,
  );
});

test("Paddle cancellation uses the verified subscription and immediate mode", async () => {
  const originalKey = globalThis.process.env.PADDLE_API_KEY;
  const originalFetch = globalThis.fetch;
  globalThis.process.env.PADDLE_API_KEY = "test-api-key";
  let requestUrl = "";
  let requestBody = "";
  globalThis.fetch = (async (input, init) => {
    requestUrl = String(input);
    requestBody = String(init?.body);
    return Response.json({
      data: { id: "sub_01", status: "canceled" },
    });
  }) as typeof fetch;

  try {
    assert.equal(
      await cancelPaddleSubscriptionImmediately("sub_01"),
      "canceled",
    );
    assert.match(requestUrl, /\/subscriptions\/sub_01\/cancel$/);
    assert.deepEqual(JSON.parse(requestBody), {
      effective_from: "immediately",
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) {
      delete globalThis.process.env.PADDLE_API_KEY;
    } else {
      globalThis.process.env.PADDLE_API_KEY = originalKey;
    }
  }
});

test("Paddle already-canceled response is treated as idempotent success", async () => {
  const originalKey = globalThis.process.env.PADDLE_API_KEY;
  const originalFetch = globalThis.fetch;
  globalThis.process.env.PADDLE_API_KEY = "test-api-key";
  globalThis.fetch = (async () =>
    Response.json(
      {
        error: {
          code: "subscription_is_canceled_action_invalid",
          detail: "action cannot be performed on canceled subscription",
        },
      },
      { status: 400 },
    )) as typeof fetch;

  try {
    assert.equal(
      await cancelPaddleSubscriptionImmediately("sub_01"),
      "already_canceled",
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) {
      delete globalThis.process.env.PADDLE_API_KEY;
    } else {
      globalThis.process.env.PADDLE_API_KEY = originalKey;
    }
  }
});
