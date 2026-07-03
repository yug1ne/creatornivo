import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  isPaddleServerCheckoutConfigured,
  type PaddleServerCheckoutConfig,
} from "../src/config/paddle";
import {
  getPaddleCheckoutBlock,
  POST as checkoutPost,
} from "../src/app/api/paddle/checkout/route";
import { getPaddleManagementUrls } from "../src/app/api/paddle/portal/route";
import {
  createServerPaddleCheckout,
  type PaddleCheckoutIntentStore,
} from "../src/lib/paddle/checkout-service";
import {
  paddleApiFetch,
  PaddleApiError,
} from "../src/lib/paddle/client";

const configured: PaddleServerCheckoutConfig = {
  clientToken: "test_client",
  environment: "sandbox",
  environmentConfigured: true,
  apiKey: "test_api",
  webhookSecret: "test_secret",
  proPriceId: "pri_pro",
  earlyAccessPriceId: "pri_early",
};

class MemoryIntentStore implements PaddleCheckoutIntentStore {
  created: Record<string, unknown> | null = null;
  transactionId: string | null = null;
  failed = false;
  createdCount = 0;
  expiredIntents: Array<{ id: string; status: string }> = [];
  intent: {
    id: string;
    userId: string;
    priceId: string;
    paddleTransactionId: string | null;
    status: string;
    expiresAt: Date;
  } | null = null;

  async reserve(input: {
    userId: string;
    priceId: string;
    now: Date;
    expiresAt: Date;
  }) {
    if (this.intent) {
      if (
        this.intent.status === "pending" &&
        this.intent.paddleTransactionId === null &&
        this.intent.expiresAt <= input.now
      ) {
        this.intent.status = "expired";
        this.expiredIntents.push({
          id: this.intent.id,
          status: this.intent.status,
        });
      } else if (
        (this.intent.status === "pending" &&
          this.intent.expiresAt > input.now) ||
        this.intent.status === "transaction_created" ||
        this.intent.status === "transaction_completed" ||
        this.intent.status === "subscription_bound"
      ) {
        return { intent: this.intent, created: false };
      }
    }
    this.created = input;
    this.createdCount += 1;
    this.intent = {
      id: `intent-${this.createdCount}`,
      userId: input.userId,
      priceId: input.priceId,
      paddleTransactionId: null,
      status: "pending",
      expiresAt: input.expiresAt,
    };
    return { intent: this.intent, created: true };
  }
  async attachTransaction(_intentId: string, transactionId: string) {
    this.transactionId = transactionId;
    if (this.intent) {
      this.intent.paddleTransactionId = transactionId;
      this.intent.status = "transaction_created";
    }
  }
  async markFailed() {
    this.failed = true;
    if (this.intent?.status === "pending") this.intent.status = "failed";
  }
  async markAbandoned(intentId: string, transactionId: string, now: Date) {
    if (
      this.intent?.id === intentId &&
      this.intent.status === "transaction_created" &&
      this.intent.paddleTransactionId === transactionId &&
      this.intent.expiresAt <= now
    ) {
      this.intent.status = "abandoned";
      return true;
    }
    return false;
  }
}

test("unauthenticated checkout is rejected", async () => {
  const response = await checkoutPost();
  assert.equal(response.status, 401);
});

test("checkout creates one server-side automatic Paddle Transaction", async () => {
  const store = new MemoryIntentStore();
  let requestBody: Record<string, unknown> | null = null;
  const result = await createServerPaddleCheckout(
    { userId: "user-1", priceId: "pri_early" },
    store,
    (async (_path: string, options?: RequestInit) => {
      requestBody = JSON.parse(String(options?.body));
      return { data: { id: "txn_01" } };
    }) as never,
  );

  assert.equal(result.transactionId, "txn_01");
  assert.equal(store.transactionId, "txn_01");
  assert.deepEqual(requestBody, {
    items: [{ price_id: "pri_early", quantity: 1 }],
    collection_mode: "automatic",
    custom_data: { checkoutIntentId: "intent-1" },
  });
});

test("a fresh transaction_created intent is reused", async () => {
  const store = new MemoryIntentStore();
  store.intent = {
    id: "intent-existing",
    userId: "user-1",
    priceId: "pri_early",
    paddleTransactionId: "txn_existing",
    status: "transaction_created",
    expiresAt: new Date(Date.now() + 60_000),
  };
  let apiCalls = 0;
  const result = await createServerPaddleCheckout(
    { userId: "user-1", priceId: "pri_early" },
    store,
    (async () => {
      apiCalls += 1;
      return { data: { id: "txn_new" } };
    }) as never,
  );
  assert.equal(result.transactionId, "txn_existing");
  assert.equal(result.reused, true);
  assert.equal(apiCalls, 0);
});

test("expired pending without transaction becomes terminal and allows one new intent", async () => {
  const store = new MemoryIntentStore();
  const now = new Date("2026-07-03T12:00:00.000Z");
  store.intent = {
    id: "intent-expired",
    userId: "user-1",
    priceId: "pri_early",
    paddleTransactionId: null,
    status: "pending",
    expiresAt: new Date("2026-07-03T11:00:00.000Z"),
  };
  const result = await createServerPaddleCheckout(
    { userId: "user-1", priceId: "pri_early", now },
    store,
    (async () => ({ data: { id: "txn_new" } })) as never,
  );
  assert.equal(store.expiredIntents[0]?.status, "expired");
  assert.equal(store.createdCount, 1);
  assert.equal(result.transactionId, "txn_new");
});

test("parallel requests after expired pending create one live intent and transaction", async () => {
  const store = new MemoryIntentStore();
  const now = new Date("2026-07-03T12:00:00.000Z");
  store.intent = {
    id: "intent-expired",
    userId: "user-1",
    priceId: "pri_early",
    paddleTransactionId: null,
    status: "pending",
    expiresAt: new Date("2026-07-03T11:00:00.000Z"),
  };
  let apiCalls = 0;
  let releaseApi!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseApi = resolve;
  });
  const api = (async () => {
    apiCalls += 1;
    await gate;
    return { data: { id: "txn_afterexpiry" } };
  }) as never;
  const first = createServerPaddleCheckout(
    { userId: "user-1", priceId: "pri_early", now },
    store,
    api,
  );
  await Promise.resolve();
  const second = createServerPaddleCheckout(
    { userId: "user-1", priceId: "pri_early", now },
    store,
    api,
  );
  await assert.rejects(second, /already being created/);
  releaseApi();
  await first;
  assert.equal(store.createdCount, 1);
  assert.equal(apiCalls, 1);
});

test("expired reusable transaction_created is verified and reused", async () => {
  const store = new MemoryIntentStore();
  const now = new Date("2026-07-03T12:00:00.000Z");
  store.intent = {
    id: "intent-existing",
    userId: "user-1",
    priceId: "pri_early",
    paddleTransactionId: "txn_existing",
    status: "transaction_created",
    expiresAt: new Date("2026-07-03T11:00:00.000Z"),
  };
  let postCalls = 0;
  const result = await createServerPaddleCheckout(
    { userId: "user-1", priceId: "pri_early", now },
    store,
    (async (path: string, options?: RequestInit) => {
      if (options?.method === "POST") postCalls += 1;
      assert.equal(path, "/transactions/txn_existing");
      return { data: { id: "txn_existing", status: "ready" } };
    }) as never,
  );
  assert.equal(result.transactionId, "txn_existing");
  assert.equal(result.reused, true);
  assert.equal(postCalls, 0);
  assert.equal(store.createdCount, 0);
});

test("expired paid transaction_created never creates another transaction", async () => {
  const store = new MemoryIntentStore();
  const now = new Date("2026-07-03T12:00:00.000Z");
  store.intent = {
    id: "intent-paid",
    userId: "user-1",
    priceId: "pri_early",
    paddleTransactionId: "txn_paid",
    status: "transaction_created",
    expiresAt: new Date("2026-07-03T11:00:00.000Z"),
  };
  let postCalls = 0;
  await assert.rejects(
    createServerPaddleCheckout(
      { userId: "user-1", priceId: "pri_early", now },
      store,
      (async (_path: string, options?: RequestInit) => {
        if (options?.method === "POST") postCalls += 1;
        return { data: { id: "txn_paid", status: "completed" } };
      }) as never,
    ),
    /already being processed/,
  );
  assert.equal(postCalls, 0);
  assert.equal(store.createdCount, 0);
  assert.equal(store.intent.status, "transaction_created");
});

test("canceled expired transaction is abandoned before one replacement is created", async () => {
  const store = new MemoryIntentStore();
  const now = new Date("2026-07-03T12:00:00.000Z");
  store.intent = {
    id: "intent-canceled",
    userId: "user-1",
    priceId: "pri_early",
    paddleTransactionId: "txn_canceled",
    status: "transaction_created",
    expiresAt: new Date("2026-07-03T11:00:00.000Z"),
  };
  let postCalls = 0;
  const result = await createServerPaddleCheckout(
    { userId: "user-1", priceId: "pri_early", now },
    store,
    (async (_path: string, options?: RequestInit) => {
      if (options?.method === "POST") {
        postCalls += 1;
        return { data: { id: "txn_replacement" } };
      }
      return { data: { id: "txn_canceled", status: "canceled" } };
    }) as never,
  );
  assert.equal(result.transactionId, "txn_replacement");
  assert.equal(postCalls, 1);
  assert.equal(store.createdCount, 1);
});

test("paid intent states do not expire or create another transaction", async () => {
  for (const status of ["transaction_completed", "subscription_bound"]) {
    const store = new MemoryIntentStore();
    store.intent = {
      id: `intent-${status}`,
      userId: "user-1",
      priceId: "pri_early",
      paddleTransactionId: "txn_paid",
      status,
      expiresAt: new Date("2026-07-03T11:00:00.000Z"),
    };
    await assert.rejects(
      createServerPaddleCheckout(
        {
          userId: "user-1",
          priceId: "pri_early",
          now: new Date("2026-07-03T12:00:00.000Z"),
        },
        store,
        (async () => {
          throw new Error("API must not be called");
        }) as never,
      ),
      /already being processed/,
    );
    assert.equal(store.intent.status, status);
    assert.equal(store.createdCount, 0);
  }
});

test("two parallel checkout attempts create only one Paddle Transaction", async () => {
  const store = new MemoryIntentStore();
  let apiCalls = 0;
  let releaseApi!: () => void;
  const apiGate = new Promise<void>((resolve) => {
    releaseApi = resolve;
  });
  const api = (async () => {
    apiCalls += 1;
    await apiGate;
    return { data: { id: "txn_parallel" } };
  }) as never;

  const first = createServerPaddleCheckout(
    { userId: "user-1", priceId: "pri_early" },
    store,
    api,
  );
  await Promise.resolve();
  const second = createServerPaddleCheckout(
    { userId: "user-1", priceId: "pri_early" },
    store,
    api,
  );
  await assert.rejects(second, /already being created/);
  releaseApi();
  await first;
  assert.equal(apiCalls, 1);
});

test("a transaction is never returned when intent persistence fails", async () => {
  const store = new MemoryIntentStore();
  store.attachTransaction = async () => {
    throw new Error("database unavailable");
  };
  await assert.rejects(
    createServerPaddleCheckout(
      { userId: "user-1", priceId: "pri_early" },
      store,
      (async () => ({ data: { id: "txn_01" } })) as never,
    ),
    /database unavailable/,
  );
  assert.equal(store.failed, true);
});

test("checkout requires API key and webhook secret", () => {
  assert.equal(
    isPaddleServerCheckoutConfigured("pri_early", {
      ...configured,
      apiKey: "",
    }),
    false,
  );
  assert.equal(
    isPaddleServerCheckoutConfigured("pri_early", {
      ...configured,
      webhookSecret: "",
    }),
    false,
  );
});

test("active, scheduled, and recovery subscriptions block a second checkout", () => {
  const now = new Date("2026-07-03T00:00:00.000Z");
  const base = {
    plan: "free",
    subscription: {
      provider: "paddle",
      status: "active",
      paddleStatus: "active",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date("2026-08-01T00:00:00.000Z"),
    },
  };
  assert.equal(
    getPaddleCheckoutBlock(base, now)?.code,
    "subscription_already_active",
  );
  assert.equal(
    getPaddleCheckoutBlock(
      {
        ...base,
        subscription: {
          ...base.subscription,
          status: "canceled",
          cancelAtPeriodEnd: true,
        },
      },
      now,
    )?.code,
    "subscription_already_active",
  );
  for (const state of [
    { status: "past_due", paddleStatus: "past_due" },
    { status: "canceled", paddleStatus: "paused" },
  ]) {
    assert.equal(
      getPaddleCheckoutBlock({
        ...base,
        subscription: { ...base.subscription, ...state },
      })?.code,
      "subscription_requires_action",
    );
  }
});

test("client cannot supply userId, Price ID, items, or customData", () => {
  const route = readFileSync("src/app/api/paddle/checkout/route.ts", "utf8");
  const hook = readFileSync("src/hooks/use-paddle-checkout.ts", "utf8");
  assert.match(route, /export async function POST\(\)/);
  assert.doesNotMatch(route, /request\.json|requestId|customData/);
  assert.match(hook, /transactionId: data\.transactionId/);
  assert.doesNotMatch(hook, /items:|customData:|data\.userId|data\.priceId/);
  assert.match(route, /code: "billing_not_configured"/);
});

test("portal returns update and cancellation URLs separately", () => {
  assert.deepEqual(
    getPaddleManagementUrls({
      data: {
        management_urls: {
          update_payment_method: "https://paddle.test/update",
          cancel: "https://paddle.test/cancel",
        },
      },
    }),
    {
      updatePaymentMethodUrl: "https://paddle.test/update",
      cancelSubscriptionUrl: "https://paddle.test/cancel",
    },
  );
});

test("portal subscription lookup is scoped to the server session user", () => {
  const route = readFileSync("src/app/api/paddle/portal/route.ts", "utf8");
  assert.match(route, /where: \{ userId: session\.id \}/);
  assert.doesNotMatch(route, /request\.json|paddleSubscriptionId.*request/);
});

test("partial unique index excludes terminal intent statuses", () => {
  const migration = readFileSync(
    "prisma/migrations/20260709100000_paddle_checkout_intents/migration.sql",
    "utf8",
  );
  const index = migration.match(
    /CREATE UNIQUE INDEX "PaddleCheckoutIntent_one_live_per_user_key"[\s\S]*?;/,
  )?.[0];
  assert.ok(index);
  assert.match(index, /'pending'/);
  assert.match(index, /'transaction_created'/);
  assert.match(index, /'transaction_completed'/);
  assert.match(index, /'subscription_bound'/);
  assert.doesNotMatch(index, /'expired'|'abandoned'|'failed'|'completed'/);
});

test("Paddle 403 preserves safe status and error code", async () => {
  const originalKey = process.env.PADDLE_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.PADDLE_API_KEY = "test-api-key";
  globalThis.fetch = (async () =>
    Response.json(
      { error: { code: "forbidden", detail: "Missing permission" } },
      { status: 403 },
    )) as typeof fetch;
  try {
    await assert.rejects(
      paddleApiFetch("/transactions", { method: "POST" }),
      (error) =>
        error instanceof PaddleApiError &&
        error.status === 403 &&
        error.code === "forbidden",
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) {
      delete process.env.PADDLE_API_KEY;
    } else {
      process.env.PADDLE_API_KEY = originalKey;
    }
  }
});
