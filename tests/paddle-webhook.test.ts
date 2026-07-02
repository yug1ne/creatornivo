import assert from "node:assert/strict";
import test from "node:test";

import {
  processPaddleWebhookEvent,
  type PaddleWebhookEventInput,
} from "../src/lib/paddle/subscription-service";

const EARLY_ACCESS_PRICE_ID = "pri_early";
const PRO_PRICE_ID = "pri_pro";

type StoredSubscription = {
  id: string;
  userId: string;
  provider: string;
  paddleCustomerId: string | null;
  paddleSubscriptionId: string | null;
  paddlePriceId: string | null;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  lastPaddleEventAt: Date | null;
  earlyAccessClaimedAt: Date | null;
};

type TestState = {
  events: Map<string, Record<string, unknown>>;
  subscriptions: Map<string, StoredSubscription>;
  users: Map<string, { plan: string }>;
  userUpdates: number;
};

function project<T extends Record<string, unknown>>(
  value: T,
  select?: Record<string, boolean>,
) {
  if (!select) return value;

  return Object.fromEntries(
    Object.keys(select).map((key) => [key, value[key]]),
  );
}

class InMemoryPaddleDatabase {
  state: TestState = {
    events: new Map(),
    subscriptions: new Map(),
    users: new Map([["user-1", { plan: "free" }]]),
    userUpdates: 0,
  };

  failUserUpdate = false;

  async $transaction<T>(
    operation: (transaction: Record<string, unknown>) => Promise<T>,
  ): Promise<T> {
    const draft = structuredClone(this.state);
    const findSubscription = (where: Record<string, unknown>) =>
      Array.from(draft.subscriptions.values()).find((subscription) =>
        Object.entries(where).every(
          ([key, value]) =>
            subscription[key as keyof StoredSubscription] === value,
        ),
      ) ?? null;
    const saveSubscription = (
      subscription: StoredSubscription,
      data: Record<string, unknown>,
    ) => {
      Object.assign(subscription, data);
      draft.subscriptions.set(subscription.id, subscription);
      return subscription;
    };
    const transaction = {
      paddleWebhookEvent: {
        create: async ({
          data,
        }: {
          data: Record<string, unknown> & { eventId: string };
        }) => {
          if (draft.events.has(data.eventId)) {
            throw Object.assign(new Error("Unique event ID"), { code: "P2002" });
          }

          draft.events.set(data.eventId, data);
          return data;
        },
      },
      subscription: {
        findUnique: async ({
          where,
        }: {
          where: Record<string, unknown>;
        }) => findSubscription(where),
        update: async ({
          where,
          data,
          select,
        }: {
          where: Record<string, unknown>;
          data: Record<string, unknown>;
          select?: Record<string, boolean>;
        }) => {
          const subscription = findSubscription(where);
          if (!subscription) throw new Error("Subscription not found");
          return project(
            saveSubscription(subscription, data) as unknown as Record<
              string,
              unknown
            >,
            select,
          );
        },
        upsert: async ({
          where,
          create,
          update,
          select,
        }: {
          where: Record<string, unknown>;
          create: Record<string, unknown>;
          update: Record<string, unknown>;
          select?: Record<string, boolean>;
        }) => {
          const existing = findSubscription(where);
          const subscription = existing
            ? saveSubscription(existing, update)
            : saveSubscription(
                {
                  id: `sub-${draft.subscriptions.size + 1}`,
                  userId: create.userId as string,
                  provider: "paddle",
                  paddleCustomerId: null,
                  paddleSubscriptionId: null,
                  paddlePriceId: null,
                  status: "incomplete",
                  currentPeriodEnd: null,
                  cancelAtPeriodEnd: false,
                  lastPaddleEventAt: null,
                  earlyAccessClaimedAt: null,
                },
                create,
              );

          return project(
            subscription as unknown as Record<string, unknown>,
            select,
          );
        },
      },
      user: {
        update: async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { plan: string };
        }) => {
          if (this.failUserUpdate) {
            throw new Error("Injected user update failure");
          }

          draft.users.set(where.id, { plan: data.plan });
          draft.userUpdates += 1;
          return { id: where.id, ...data };
        },
      },
    };

    const result = await operation(transaction);
    this.state = draft;
    return result;
  }

  get subscription() {
    return Array.from(this.state.subscriptions.values())[0];
  }
}

function webhookEvent({
  eventId,
  occurredAt,
  eventType = "subscription.activated",
  status = "active",
  priceId = EARLY_ACCESS_PRICE_ID,
}: {
  eventId: string;
  occurredAt: string;
  eventType?: string;
  status?: string;
  priceId?: string | null;
}): PaddleWebhookEventInput {
  return {
    eventId,
    eventType,
    occurredAt: new Date(occurredAt),
    data: {
      id: "paddle-sub-1",
      status,
      customer_id: "paddle-customer-1",
      custom_data: { userId: "user-1" },
      ...(priceId
        ? { items: [{ price: { id: priceId } }] }
        : {}),
    },
  };
}

async function process(
  database: InMemoryPaddleDatabase,
  event: PaddleWebhookEventInput,
) {
  return processPaddleWebhookEvent(
    event,
    database as never,
    EARLY_ACCESS_PRICE_ID,
  );
}

test("the same event_id is applied once and the retry succeeds", async () => {
  const database = new InMemoryPaddleDatabase();
  const event = webhookEvent({
    eventId: "evt-1",
    occurredAt: "2026-07-03T10:00:00.000Z",
  });

  assert.equal(await process(database, event), "processed");
  assert.equal(await process(database, event), "duplicate");
  assert.equal(database.state.events.size, 1);
  assert.equal(database.state.userUpdates, 1);
});

test("a new event_id with an older occurred_at is recorded but not applied", async () => {
  const database = new InMemoryPaddleDatabase();

  await process(
    database,
    webhookEvent({
      eventId: "evt-new",
      occurredAt: "2026-07-03T11:00:00.000Z",
    }),
  );
  const claimedAt = database.subscription.earlyAccessClaimedAt;

  assert.equal(
    await process(
      database,
      webhookEvent({
        eventId: "evt-old",
        occurredAt: "2026-07-03T10:00:00.000Z",
        eventType: "subscription.canceled",
        status: "canceled",
        priceId: null,
      }),
    ),
    "stale",
  );
  assert.equal(database.state.events.size, 2);
  assert.equal(database.subscription.status, "active");
  assert.deepEqual(database.subscription.earlyAccessClaimedAt, claimedAt);
});

test("a newer event is applied", async () => {
  const database = new InMemoryPaddleDatabase();

  await process(
    database,
    webhookEvent({
      eventId: "evt-1",
      occurredAt: "2026-07-03T10:00:00.000Z",
      eventType: "subscription.trialing",
      status: "trialing",
    }),
  );

  assert.equal(
    await process(
      database,
      webhookEvent({
        eventId: "evt-2",
        occurredAt: "2026-07-03T11:00:00.000Z",
      }),
    ),
    "processed",
  );
  assert.equal(database.subscription.status, "active");
  assert.equal(
    database.subscription.lastPaddleEventAt?.toISOString(),
    "2026-07-03T11:00:00.000Z",
  );
});

test("a processing failure rolls back the event ID and subscription update", async () => {
  const database = new InMemoryPaddleDatabase();
  database.failUserUpdate = true;

  await assert.rejects(
    process(
      database,
      webhookEvent({
        eventId: "evt-fails",
        occurredAt: "2026-07-03T10:00:00.000Z",
      }),
    ),
    /Injected user update failure/,
  );
  assert.equal(database.state.events.has("evt-fails"), false);
  assert.equal(database.state.subscriptions.size, 0);
});

test("subscription.activated with the Early Access price creates one claim", async () => {
  const database = new InMemoryPaddleDatabase();

  await process(
    database,
    webhookEvent({
      eventId: "evt-claim",
      occurredAt: "2026-07-03T10:00:00.000Z",
    }),
  );

  assert.equal(
    database.subscription.earlyAccessClaimedAt?.toISOString(),
    "2026-07-03T10:00:00.000Z",
  );
});

test("subscription.activated with the Pro price does not create a claim", async () => {
  const database = new InMemoryPaddleDatabase();

  await process(
    database,
    webhookEvent({
      eventId: "evt-pro",
      occurredAt: "2026-07-03T10:00:00.000Z",
      priceId: PRO_PRICE_ID,
    }),
  );

  assert.equal(database.subscription.earlyAccessClaimedAt, null);
});

test("created and trialing events do not create claims", async () => {
  for (const [eventType, status] of [
    ["subscription.created", "incomplete"],
    ["subscription.trialing", "trialing"],
  ]) {
    const database = new InMemoryPaddleDatabase();
    await process(
      database,
      webhookEvent({
        eventId: `evt-${status}`,
        occurredAt: "2026-07-03T10:00:00.000Z",
        eventType,
        status,
      }),
    );
    assert.equal(database.subscription.earlyAccessClaimedAt, null);
  }
});

test("past_due without a previous claim does not create one", async () => {
  const database = new InMemoryPaddleDatabase();

  await process(
    database,
    webhookEvent({
      eventId: "evt-past-due",
      occurredAt: "2026-07-03T10:00:00.000Z",
      eventType: "subscription.past_due",
      status: "past_due",
    }),
  );

  assert.equal(database.subscription.earlyAccessClaimedAt, null);
});

test("canceled and paused events never clear an existing claim", async () => {
  const database = new InMemoryPaddleDatabase();

  await process(
    database,
    webhookEvent({
      eventId: "evt-activated",
      occurredAt: "2026-07-03T10:00:00.000Z",
    }),
  );
  const claimedAt = database.subscription.earlyAccessClaimedAt;

  await process(
    database,
    webhookEvent({
      eventId: "evt-canceled",
      occurredAt: "2026-07-03T11:00:00.000Z",
      eventType: "subscription.canceled",
      status: "canceled",
      priceId: null,
    }),
  );
  assert.deepEqual(database.subscription.earlyAccessClaimedAt, claimedAt);

  await process(
    database,
    webhookEvent({
      eventId: "evt-paused",
      occurredAt: "2026-07-03T12:00:00.000Z",
      eventType: "subscription.paused",
      status: "paused",
      priceId: null,
    }),
  );
  assert.deepEqual(database.subscription.earlyAccessClaimedAt, claimedAt);
});

test("cancellation does not clear Paddle IDs", async () => {
  const database = new InMemoryPaddleDatabase();

  await process(
    database,
    webhookEvent({
      eventId: "evt-activated",
      occurredAt: "2026-07-03T10:00:00.000Z",
    }),
  );
  await process(
    database,
    webhookEvent({
      eventId: "evt-canceled",
      occurredAt: "2026-07-03T11:00:00.000Z",
      eventType: "subscription.canceled",
      status: "canceled",
      priceId: null,
    }),
  );

  assert.equal(database.subscription.paddleSubscriptionId, "paddle-sub-1");
  assert.equal(database.subscription.paddlePriceId, EARLY_ACCESS_PRICE_ID);
});
