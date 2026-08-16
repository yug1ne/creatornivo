import assert from "node:assert/strict";
import test from "node:test";

import { redeemAppSumoCode } from "../src/lib/appsumo/redeem";
import {
  digestAppSumoCode,
  generateAppSumoCode,
} from "../src/lib/appsumo/codes";

const ENV = { APPSUMO_CODE_HASH_SECRET: "test-appsumo-secret" };

type CodeRow = {
  id: string;
  codeDigest: string;
  disabledAt: Date | null;
};

type RedemptionRow = {
  id: string;
  codeId: string;
  userId: string | null;
  status: "active" | "revoked" | "refunded";
};

function createMemoryDb(seed: {
  users?: string[];
  codes?: CodeRow[];
  redemptions?: RedemptionRow[];
}) {
  const users = new Set(seed.users ?? ["user-1"]);
  const codes = [...(seed.codes ?? [])];
  const redemptions = [...(seed.redemptions ?? [])];
  let nextId = 1;

  const tx = {
    user: {
      async findUnique({ where: { id } }: { where: { id: string } }) {
        return users.has(id) ? { id } : null;
      },
    },
    appSumoCode: {
      async findUnique({
        where: { codeDigest },
      }: {
        where: { codeDigest: string };
      }) {
        const code = codes.find((row) => row.codeDigest === codeDigest);
        if (!code) return null;
        return {
          ...code,
          redemption: redemptions.find((row) => row.codeId === code.id) ?? null,
        };
      },
    },
    appSumoRedemption: {
      async count({
        where,
      }: {
        where: { userId: string; status: "active" };
      }) {
        return redemptions.filter(
          (row) => row.userId === where.userId && row.status === where.status,
        ).length;
      },
      async create({
        data,
      }: {
        data: { codeId: string; userId: string; status: "active"; redeemedAt: Date };
      }) {
        if (redemptions.some((row) => row.codeId === data.codeId)) {
          const error = new Error("Unique constraint");
          (error as { code?: string }).code = "P2002";
          throw error;
        }
        const row = {
          id: `red-${nextId++}`,
          codeId: data.codeId,
          userId: data.userId,
          status: data.status,
        };
        redemptions.push(row);
        return { id: row.id };
      },
    },
    appSumoAuditEvent: {
      async create() {
        return { id: `audit-${nextId++}` };
      },
    },
  };

  return {
    async $transaction<T>(
      operation: (transaction: typeof tx) => Promise<T>,
    ): Promise<T> {
      return operation(tx);
    },
  };
}

test("redeeming one unused code activates Tier 1", async () => {
  const raw = generateAppSumoCode();
  const db = createMemoryDb({
    codes: [
      {
        id: "code-1",
        codeDigest: digestAppSumoCode(raw, ENV),
        disabledAt: null,
      },
    ],
  });

  const result = await redeemAppSumoCode(
    { userId: "user-1", emailVerified: true, rawCode: raw },
    { database: db as never, env: ENV },
  );

  assert.equal(result.status, "tier1_active");
  assert.equal(result.activeCodeCount, 1);
});

test("second code stacks to Tier 2 and a third is rejected", async () => {
  const first = generateAppSumoCode();
  const second = generateAppSumoCode();
  const third = generateAppSumoCode();
  const db = createMemoryDb({
    codes: [
      { id: "c1", codeDigest: digestAppSumoCode(first, ENV), disabledAt: null },
      { id: "c2", codeDigest: digestAppSumoCode(second, ENV), disabledAt: null },
      { id: "c3", codeDigest: digestAppSumoCode(third, ENV), disabledAt: null },
    ],
  });

  assert.equal(
    (
      await redeemAppSumoCode(
        { userId: "user-1", emailVerified: true, rawCode: first },
        { database: db as never, env: ENV },
      )
    ).status,
    "tier1_active",
  );
  assert.equal(
    (
      await redeemAppSumoCode(
        { userId: "user-1", emailVerified: true, rawCode: second },
        { database: db as never, env: ENV },
      )
    ).status,
    "tier2_active",
  );
  const thirdResult = await redeemAppSumoCode(
    { userId: "user-1", emailVerified: true, rawCode: third },
    { database: db as never, env: ENV },
  );
  assert.equal(thirdResult.status, "max_codes");
});

test("same user resubmitting an owned code is idempotent", async () => {
  const raw = generateAppSumoCode();
  const db = createMemoryDb({
    codes: [
      { id: "code-1", codeDigest: digestAppSumoCode(raw, ENV), disabledAt: null },
    ],
  });
  await redeemAppSumoCode(
    { userId: "user-1", emailVerified: true, rawCode: raw },
    { database: db as never, env: ENV },
  );
  const again = await redeemAppSumoCode(
    { userId: "user-1", emailVerified: true, rawCode: raw },
    { database: db as never, env: ENV },
  );
  assert.equal(again.status, "already_owned");
});

test("another user cannot redeem an already used or disabled code", async () => {
  const used = generateAppSumoCode();
  const disabled = generateAppSumoCode();
  const db = createMemoryDb({
    users: ["user-1", "user-2"],
    codes: [
      { id: "used", codeDigest: digestAppSumoCode(used, ENV), disabledAt: null },
      {
        id: "disabled",
        codeDigest: digestAppSumoCode(disabled, ENV),
        disabledAt: new Date(),
      },
    ],
    redemptions: [
      { id: "r1", codeId: "used", userId: "user-1", status: "active" },
    ],
  });

  const taken = await redeemAppSumoCode(
    { userId: "user-2", emailVerified: true, rawCode: used },
    { database: db as never, env: ENV },
  );
  const blocked = await redeemAppSumoCode(
    { userId: "user-2", emailVerified: true, rawCode: disabled },
    { database: db as never, env: ENV },
  );
  assert.equal(taken.status, "unavailable");
  assert.equal(blocked.status, "unavailable");
});

test("unverified users cannot redeem", async () => {
  const result = await redeemAppSumoCode(
    { userId: "user-1", emailVerified: false, rawCode: generateAppSumoCode() },
    { env: ENV },
  );
  assert.equal(result.status, "unverified");
});
