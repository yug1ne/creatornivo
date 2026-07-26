/**
 * Freemius Phase 2 webhook tests.
 * Run: npx tsx --test tests/freemius-webhook.test.ts
 */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { POST as freemiusWebhookPost } from "../src/app/api/freemius/webhook/route";
import {
  parseFreemiusWebhookEvent,
  processFreemiusWebhookEvent,
  type FreemiusWebhookDatabase,
  type FreemiusWebhookEventInput,
} from "../src/lib/freemius/subscription-service";
import {
  verifyFreemiusWebhookSignature,
  verifyFreemiusWebhookToken,
} from "../src/lib/freemius/webhook-verify";

const SECRET = "test_product_secret_key";
const TOKEN = "test_webhook_url_token";

const env: NodeJS.ProcessEnv = {
  FREEMIUS_PRODUCT_ID: "34975",
  FREEMIUS_PRO_PLAN_ID: "57499",
  FREEMIUS_PRO_PRICING_ID: "77471",
  FREEMIUS_SECRET_KEY: SECRET,
  FREEMIUS_WEBHOOK_SECRET_TOKEN: TOKEN,
  FREEMIUS_API_BEARER_TOKEN: "bearer",
  PUBLIC_CHECKOUT_ENABLED: "false",
};

function sign(body: string, secret = SECRET): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  plan: "free" | "pro";
  emailVerified: Date | null;
};

type SubscriptionRow = {
  id: string;
  userId: string;
  provider: string;
  freemiusUserId: string | null;
  freemiusLicenseId: string | null;
  freemiusSubscriptionId: string | null;
  freemiusPlanId: string | null;
  freemiusPricingId: string | null;
  freemiusProductId: string | null;
  billingInterval: string | null;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  lastFreemiusEventAt: Date | null;
  paddleCustomerId: string | null;
  paddleSubscriptionId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

type IntentRow = {
  id: string;
  userId: string;
  pricingId: string;
  status: string;
  freemiusCheckoutId: string | null;
  expiresAt: Date;
  completedAt: Date | null;
};

class MemoryDb implements FreemiusWebhookDatabase {
  events = new Map<string, { eventId: string; eventType: string; occurredAt: Date }>();
  users = new Map<string, UserRow>();
  subscriptions = new Map<string, SubscriptionRow>();
  intents = new Map<string, IntentRow>();

  constructor() {
    this.users.set("user-1", {
      id: "user-1",
      email: "buyer@example.com",
      name: "Buyer",
      plan: "free",
      emailVerified: new Date("2026-01-01T00:00:00.000Z"),
    });
    this.users.set("user-manual-pro", {
      id: "user-manual-pro",
      email: "manual@example.com",
      name: "Manual",
      plan: "pro",
      emailVerified: new Date("2026-01-01T00:00:00.000Z"),
    });
  }

  seedSubscription(overrides: Partial<SubscriptionRow> & { userId: string }) {
    const row: SubscriptionRow = {
      id: `sub_${overrides.userId}`,
      provider: "freemius",
      freemiusUserId: null,
      freemiusLicenseId: null,
      freemiusSubscriptionId: null,
      freemiusPlanId: null,
      freemiusPricingId: null,
      freemiusProductId: null,
      billingInterval: null,
      status: "incomplete",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      lastFreemiusEventAt: null,
      paddleCustomerId: null,
      paddleSubscriptionId: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      ...overrides,
    };
    this.subscriptions.set(row.userId, row);
    return row;
  }

  async $transaction<T>(
    fn: (tx: never) => Promise<T>,
  ): Promise<T> {
    const self = this;
    const tx = {
      freemiusWebhookEvent: {
        async create({ data }: { data: { eventId: string; eventType: string; occurredAt: Date } }) {
          if (self.events.has(data.eventId)) {
            throw Object.assign(new Error("unique"), { code: "P2002" });
          }
          self.events.set(data.eventId, data);
          return data;
        },
      },
      freemiusCheckoutIntent: {
        async findUnique({ where }: { where: { id: string } }) {
          const intent = self.intents.get(where.id);
          if (!intent) return null;
          const user = self.users.get(intent.userId);
          return user ? { userId: intent.userId, user } : null;
        },
        async updateMany({
          where,
          data,
        }: {
          where: { id: string; userId: string; status: { not: string } };
          data: { status: string; completedAt: Date };
        }) {
          const intent = self.intents.get(where.id);
          if (!intent || intent.userId !== where.userId) return { count: 0 };
          if (intent.status === where.status.not) return { count: 0 };
          intent.status = data.status;
          intent.completedAt = data.completedAt;
          return { count: 1 };
        },
      },
      user: {
        async findUnique({ where }: { where: { id: string } }) {
          return self.users.get(where.id) ?? null;
        },
        async findFirst({
          where,
        }: {
          where: { email: { equals: string; mode: string } };
        }) {
          const target = where.email.equals.toLowerCase();
          for (const user of self.users.values()) {
            if (user.email.toLowerCase() === target) return user;
          }
          return null;
        },
        async update({
          where,
          data,
        }: {
          where: { id: string };
          data: { plan: "free" | "pro" };
        }) {
          const user = self.users.get(where.id);
          if (!user) throw new Error("user missing");
          user.plan = data.plan;
          return user;
        },
      },
      subscription: {
        async findUnique({
          where,
        }: {
          where:
            | { userId: string }
            | { freemiusLicenseId: string }
            | { freemiusSubscriptionId: string }
            | { freemiusUserId: string };
        }) {
          if ("userId" in where) {
            return self.subscriptions.get(where.userId) ?? null;
          }
          for (const sub of self.subscriptions.values()) {
            if (
              "freemiusLicenseId" in where &&
              sub.freemiusLicenseId === where.freemiusLicenseId
            ) {
              const user = self.users.get(sub.userId);
              return user ? { ...sub, user } : null;
            }
            if (
              "freemiusSubscriptionId" in where &&
              sub.freemiusSubscriptionId === where.freemiusSubscriptionId
            ) {
              const user = self.users.get(sub.userId);
              return user ? { ...sub, user } : null;
            }
            if (
              "freemiusUserId" in where &&
              sub.freemiusUserId === where.freemiusUserId
            ) {
              const user = self.users.get(sub.userId);
              return user ? { ...sub, user } : null;
            }
          }
          return null;
        },
        async upsert({
          where,
          create,
          update,
        }: {
          where: { userId: string };
          create: SubscriptionRow & { userId: string };
          update: Partial<SubscriptionRow>;
        }) {
          const existing = self.subscriptions.get(where.userId);
          if (!existing) {
            const created: SubscriptionRow = {
              id: `sub_${where.userId}`,
              paddleCustomerId: null,
              paddleSubscriptionId: null,
              stripeCustomerId: null,
              stripeSubscriptionId: null,
              ...create,
            };
            self.subscriptions.set(where.userId, created);
            return created;
          }
          Object.assign(existing, update);
          return existing;
        },
      },
    };

    return fn(tx as never);
  }
}

/** Provider anniversary period: 5th → next cycle 5th (not calendar month 1st). */
const PERIOD_START = "2099-03-05T12:00:00.000Z";
const PERIOD_END = "2099-04-05T12:00:00.000Z";

function activationPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_activate_1",
    type: "license.activated",
    created: PERIOD_START,
    objects: {
      product: { id: "34975" },
      plan: { id: "57499" },
      pricing: { id: "77471", billing_cycle: "month" },
      license: {
        id: "lic_100",
        user_id: "fs_user_9",
        plan_id: "57499",
        pricing_id: "77471",
        plugin_id: "34975",
        issued_at: PERIOD_START,
        expiration: PERIOD_END,
      },
      subscription: {
        id: "sub_fs_1",
        user_id: "fs_user_9",
        next_payment: PERIOD_END,
        billing_cycle: "month",
      },
      user: {
        id: "fs_user_9",
        email: "buyer@example.com",
        is_verified: true,
      },
      payment: {
        id: "pay_1",
        created: PERIOD_START,
      },
    },
    ...overrides,
  };
}

test("verifyFreemiusWebhookSignature accepts valid HMAC and rejects bad signatures", () => {
  const body = JSON.stringify({ id: "1", type: "x" });
  const good = sign(body);
  assert.equal(verifyFreemiusWebhookSignature(body, good, SECRET), true);
  assert.equal(verifyFreemiusWebhookSignature(body, "00", SECRET), false);
  assert.equal(verifyFreemiusWebhookSignature(body, null, SECRET), false);
  assert.equal(verifyFreemiusWebhookSignature(body, good, ""), false);
});

test("verifyFreemiusWebhookToken is timing-safe and strict", () => {
  assert.equal(verifyFreemiusWebhookToken(TOKEN, TOKEN), true);
  assert.equal(verifyFreemiusWebhookToken("nope", TOKEN), false);
  assert.equal(verifyFreemiusWebhookToken(null, TOKEN), false);
  assert.equal(verifyFreemiusWebhookToken(TOKEN, ""), false);
});

test("parseFreemiusWebhookEvent extracts period dates from license/subscription", () => {
  const event = parseFreemiusWebhookEvent(activationPayload());
  assert.ok(event);
  assert.equal(event.eventId, "evt_activate_1");
  assert.equal(event.eventType, "license.activated");
  assert.equal(event.objects.productId, "34975");
  assert.equal(event.objects.planId, "57499");
  assert.equal(event.objects.pricingId, "77471");
  assert.equal(event.objects.freemiusLicenseId, "lic_100");
  assert.equal(event.objects.email, "buyer@example.com");
  assert.ok(event.objects.currentPeriodStart);
  assert.ok(event.objects.currentPeriodEnd);
  assert.equal(event.objects.currentPeriodStart?.toISOString(), PERIOD_START);
  assert.equal(event.objects.currentPeriodEnd?.toISOString(), PERIOD_END);
  // Not the 1st of next calendar month
  assert.notEqual(
    event.objects.currentPeriodEnd?.toISOString().slice(0, 10),
    "2099-04-01",
  );
  assert.equal(event.objects.currentPeriodEnd?.getUTCDate(), 5);
});

test("valid activation grants Pro and stores Freemius provider period fields", async () => {
  const db = new MemoryDb();
  const event = parseFreemiusWebhookEvent(activationPayload());
  assert.ok(event);

  const result = await processFreemiusWebhookEvent(event, { database: db, env });
  assert.equal(result, "processed");
  assert.equal(db.users.get("user-1")?.plan, "pro");

  const sub = db.subscriptions.get("user-1");
  assert.ok(sub);
  assert.equal(sub.provider, "freemius");
  assert.equal(sub.status, "active");
  assert.equal(sub.freemiusLicenseId, "lic_100");
  assert.equal(sub.freemiusSubscriptionId, "sub_fs_1");
  assert.equal(sub.freemiusUserId, "fs_user_9");
  assert.equal(sub.freemiusProductId, "34975");
  assert.equal(sub.freemiusPlanId, "57499");
  assert.equal(sub.freemiusPricingId, "77471");
  assert.equal(sub.billingInterval, "month");
  assert.equal(sub.currentPeriodStart?.toISOString(), PERIOD_START);
  assert.equal(sub.currentPeriodEnd?.toISOString(), PERIOD_END);
  assert.equal(sub.currentPeriodEnd?.getUTCDate(), 5);
  assert.notEqual(sub.currentPeriodEnd?.getUTCDate(), 1);
});

test("duplicate event id is idempotent and does not re-mutate", async () => {
  const db = new MemoryDb();
  const event = parseFreemiusWebhookEvent(activationPayload())!;
  assert.equal(await processFreemiusWebhookEvent(event, { database: db, env }), "processed");
  db.users.get("user-1")!.plan = "free";
  assert.equal(await processFreemiusWebhookEvent(event, { database: db, env }), "duplicate");
  assert.equal(db.users.get("user-1")?.plan, "free");
});

test("unknown event is recorded and ignored without granting Pro", async () => {
  const db = new MemoryDb();
  const event = parseFreemiusWebhookEvent({
    id: "evt_unknown",
    type: "cart.created",
    created: "2026-03-05T12:00:00.000Z",
    objects: {
      product: { id: "34975" },
      user: { id: "fs_user_9", email: "buyer@example.com", is_verified: true },
    },
  })!;
  const result = await processFreemiusWebhookEvent(event, { database: db, env });
  assert.equal(result, "ignored");
  assert.equal(db.users.get("user-1")?.plan, "free");
  assert.ok(db.events.has("evt_unknown"));
});

test("mismatched product or plan or pricing does not grant Pro", async () => {
  const db = new MemoryDb();
  for (const [label, payload] of [
    [
      "product",
      activationPayload({
        id: "evt_bad_product",
        objects: {
          ...activationPayload().objects,
          product: { id: "00000" },
          license: {
            ...(activationPayload().objects as { license: object }).license,
            plugin_id: "00000",
          },
        },
      }),
    ],
    [
      "plan",
      activationPayload({
        id: "evt_bad_plan",
        objects: {
          ...activationPayload().objects,
          plan: { id: "11111" },
          license: {
            ...(activationPayload().objects as { license: object }).license,
            plan_id: "11111",
          },
        },
      }),
    ],
    [
      "pricing",
      activationPayload({
        id: "evt_bad_pricing",
        objects: {
          ...activationPayload().objects,
          pricing: { id: "22222", billing_cycle: "month" },
          license: {
            ...(activationPayload().objects as { license: object }).license,
            pricing_id: "22222",
          },
        },
      }),
    ],
  ] as const) {
    const event = parseFreemiusWebhookEvent(payload)!;
    const result = await processFreemiusWebhookEvent(event, { database: db, env });
    assert.equal(result, "ignored", label);
    assert.equal(db.users.get("user-1")?.plan, "free", label);
  }
});

test("subscription.cancelled keeps Pro until provider period end", async () => {
  const db = new MemoryDb();
  await processFreemiusWebhookEvent(parseFreemiusWebhookEvent(activationPayload())!, {
    database: db,
    env,
  });

  const cancel = parseFreemiusWebhookEvent({
    id: "evt_cancel",
    type: "subscription.cancelled",
    created: "2099-03-10T12:00:00.000Z",
    objects: {
      product: { id: "34975" },
      plan: { id: "57499" },
      pricing: { id: "77471" },
      license: {
        id: "lic_100",
        expiration: PERIOD_END,
        issued_at: PERIOD_START,
      },
      subscription: {
        id: "sub_fs_1",
        cancel_at_period_end: true,
        next_payment: PERIOD_END,
      },
      user: { id: "fs_user_9", email: "buyer@example.com", is_verified: true },
    },
  })!;

  assert.equal(
    await processFreemiusWebhookEvent(cancel, { database: db, env }),
    "processed",
  );
  assert.equal(db.users.get("user-1")?.plan, "pro");
  assert.equal(db.subscriptions.get("user-1")?.cancelAtPeriodEnd, true);
  assert.equal(db.subscriptions.get("user-1")?.status, "active");
});

test("license.expired revokes Freemius Pro", async () => {
  const db = new MemoryDb();
  await processFreemiusWebhookEvent(parseFreemiusWebhookEvent(activationPayload())!, {
    database: db,
    env,
  });

  const expired = parseFreemiusWebhookEvent({
    id: "evt_expired",
    type: "license.expired",
    created: "2099-04-06T00:00:00.000Z",
    objects: {
      product: { id: "34975" },
      plan: { id: "57499" },
      pricing: { id: "77471" },
      license: { id: "lic_100", expiration: PERIOD_END },
      user: { id: "fs_user_9", email: "buyer@example.com", is_verified: true },
    },
  })!;

  assert.equal(
    await processFreemiusWebhookEvent(expired, { database: db, env }),
    "processed",
  );
  assert.equal(db.users.get("user-1")?.plan, "free");
  assert.equal(db.subscriptions.get("user-1")?.status, "canceled");
});

test("payment.refund revokes Freemius Pro immediately (conservative)", async () => {
  const db = new MemoryDb();
  await processFreemiusWebhookEvent(parseFreemiusWebhookEvent(activationPayload())!, {
    database: db,
    env,
  });

  const refund = parseFreemiusWebhookEvent({
    id: "evt_refund",
    type: "payment.refund",
    created: "2099-03-06T00:00:00.000Z",
    objects: {
      product: { id: "34975" },
      plan: { id: "57499" },
      pricing: { id: "77471" },
      license: { id: "lic_100" },
      payment: { id: "pay_1", is_refund: true },
      user: { id: "fs_user_9", email: "buyer@example.com", is_verified: true },
    },
  })!;

  assert.equal(
    await processFreemiusWebhookEvent(refund, { database: db, env }),
    "processed",
  );
  assert.equal(db.users.get("user-1")?.plan, "free");
});

test("Freemius revoke does not strip manual Pro without freemius subscription", async () => {
  const db = new MemoryDb();
  // Manual pro user has no freemius subscription row with freemius ids from a different email event
  const refund = parseFreemiusWebhookEvent({
    id: "evt_refund_manual",
    type: "payment.refund",
    created: "2026-03-06T00:00:00.000Z",
    objects: {
      product: { id: "34975" },
      plan: { id: "57499" },
      pricing: { id: "77471" },
      license: { id: "lic_other" },
      user: {
        id: "fs_other",
        email: "manual@example.com",
        is_verified: true,
      },
    },
  })!;

  // Seed a non-freemius subscription for manual pro
  db.seedSubscription({
    userId: "user-manual-pro",
    provider: "paddle",
    status: "active",
    paddleCustomerId: "ctm_1",
    paddleSubscriptionId: "sub_paddle",
  });

  const result = await processFreemiusWebhookEvent(refund, { database: db, env });
  assert.equal(result, "ignored");
  assert.equal(db.users.get("user-manual-pro")?.plan, "pro");
});

test("orphan event without user match does not create users", async () => {
  const db = new MemoryDb();
  const event = parseFreemiusWebhookEvent(
    activationPayload({
      id: "evt_orphan",
      objects: {
        ...activationPayload().objects,
        user: {
          id: "fs_unknown",
          email: "nobody@example.com",
          is_verified: true,
        },
      },
    }),
  )!;
  assert.equal(await processFreemiusWebhookEvent(event, { database: db, env }), "orphan");
  assert.equal(db.users.size, 2);
  assert.equal(db.users.get("user-1")?.plan, "free");
});

test("HTTP route rejects missing and invalid token", async () => {
  const previous = { ...process.env };
  Object.assign(process.env, env);
  try {
    const body = JSON.stringify(activationPayload());
    const sig = sign(body);

    const missing = await freemiusWebhookPost(
      new Request("http://localhost/api/freemius/webhook", {
        method: "POST",
        headers: { "x-signature": sig, "content-type": "application/json" },
        body,
      }),
    );
    assert.equal(missing.status, 401);

    const bad = await freemiusWebhookPost(
      new Request("http://localhost/api/freemius/webhook?token=wrong", {
        method: "POST",
        headers: { "x-signature": sig, "content-type": "application/json" },
        body,
      }),
    );
    assert.equal(bad.status, 401);
  } finally {
    process.env = previous;
  }
});

test("HTTP route rejects missing and invalid x-signature", async () => {
  const previous = { ...process.env };
  Object.assign(process.env, env);
  try {
    const body = JSON.stringify(activationPayload());

    const missing = await freemiusWebhookPost(
      new Request(`http://localhost/api/freemius/webhook?token=${TOKEN}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      }),
    );
    assert.equal(missing.status, 401);

    const bad = await freemiusWebhookPost(
      new Request(`http://localhost/api/freemius/webhook?token=${TOKEN}`, {
        method: "POST",
        headers: {
          "x-signature": "ab".repeat(32),
          "content-type": "application/json",
        },
        body,
      }),
    );
    assert.equal(bad.status, 401);
  } finally {
    process.env = previous;
  }
});

test("HTTP route accepts valid token and signature (process may orphan without DB)", async () => {
  const previous = { ...process.env };
  Object.assign(process.env, env);
  try {
    const body = JSON.stringify(activationPayload({ id: "evt_http_ok" }));
    const sig = sign(body);
    const response = await freemiusWebhookPost(
      new Request(`http://localhost/api/freemius/webhook?token=${TOKEN}`, {
        method: "POST",
        headers: {
          "x-signature": sig,
          "content-type": "application/json",
        },
        body,
      }),
    );
    // May be 200 (if DB available) or 500 (if no DB in test env). Must not be auth failure.
    assert.notEqual(response.status, 401);
    assert.ok(response.status === 200 || response.status === 500);
  } finally {
    process.env = previous;
  }
});

test("route source verifies token and signature before JSON parse order is documented", () => {
  const source = readFileSync("src/app/api/freemius/webhook/route.ts", "utf8");
  const handlerStart = source.indexOf("export async function POST");
  assert.ok(handlerStart >= 0);
  const handler = source.slice(handlerStart);
  // Ensure we do not match import identifiers; require call-site parentheses.
  const tokenIdx = handler.indexOf("verifyFreemiusWebhookToken(");
  const rawIdx = handler.indexOf("await request.text()");
  const sigIdx = handler.indexOf("verifyFreemiusWebhookSignature(");
  const parseIdx = handler.indexOf("JSON.parse(");
  assert.ok(tokenIdx >= 0, "token verify call");
  assert.ok(rawIdx > tokenIdx, "raw body after token");
  assert.ok(sigIdx > rawIdx, "signature after raw body");
  assert.ok(parseIdx > sigIdx, "json parse after signature");
});

test("Phase 2/3 pricing page remains free of Freemius checkout wiring", () => {
  const pricing = readFileSync("src/app/(public)/pricing/page.tsx", "utf8");
  assert.doesNotMatch(pricing, /freemius/i);
  assert.doesNotMatch(pricing, /\/api\/freemius\/checkout/);
});
