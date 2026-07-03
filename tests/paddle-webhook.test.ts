import assert from "node:assert/strict";
import test from "node:test";

import type { PaddleServerCheckoutConfig } from "../src/config/paddle";
import { parsePaddleWebhookEvent } from "../src/app/api/paddle/webhook/route";
import {
  processPaddleWebhookEvent,
  type PaddleWebhookEventInput,
} from "../src/lib/paddle/subscription-service";

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

class MemoryDatabase {
  events = new Map<string, unknown>();
  subscriptions = new Map<string, Subscription>();
  intents = new Map<string, Intent>();
  users = new Map([
    ["user-1", { id: "user-1", plan: "free" }],
    ["user-2", { id: "user-2", plan: "free" }],
  ]);
  userUpdates = 0;
  failUserUpdate = false;

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
    const draft = structuredClone({
      events: this.events,
      subscriptions: this.subscriptions,
      intents: this.intents,
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
    this.users = draft.users;
    this.userUpdates = draft.userUpdates;
    return result;
  }

  get subscription() {
    return Array.from(this.subscriptions.values())[0];
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

function process(database: MemoryDatabase, event: PaddleWebhookEventInput) {
  return processPaddleWebhookEvent(event, database as never, config);
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
