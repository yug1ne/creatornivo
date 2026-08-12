import assert from "node:assert/strict";
import test from "node:test";

import { Prisma } from "@prisma/client";

import { TRIAL_DURATION_MS } from "../src/config/trial";
import {
  activateClaimedTrialAfterVerification,
  claimOrActivateTrial,
  generateTrialInviteToken,
  hashTrialInviteToken,
  normalizeTrialInviteToken,
  revokeUnusedTrialInviteById,
  validateTrialInviteToken,
  type TrialDatabase,
} from "../src/lib/trial/invites";

type MemoryUser = {
  id: string;
  plan: "free" | "pro";
  emailVerified: Date | null;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
};

type MemoryInvite = {
  id: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  claimedAt: Date | null;
  claimedByUserId: string | null;
};

class MemoryTrialDatabase implements TrialDatabase {
  users = new Map<string, MemoryUser>();
  invites: MemoryInvite[] = [];
  isolationLevels: Prisma.TransactionIsolationLevel[] = [];
  private transactionTail: Promise<void> = Promise.resolve();

  readonly user = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.users.get(where.id) ?? null,
    updateMany: async ({
      where,
      data,
    }: {
      where: { id: string; plan?: string; trialStartedAt?: null };
      data: { trialStartedAt: Date; trialEndsAt: Date };
    }) => {
      const user = this.users.get(where.id);
      if (
        !user ||
        (where.plan && user.plan !== where.plan) ||
        (where.trialStartedAt === null && user.trialStartedAt !== null) ||
        !user.emailVerified
      ) {
        return { count: 0 };
      }
      user.trialStartedAt = data.trialStartedAt;
      user.trialEndsAt = data.trialEndsAt;
      return { count: 1 };
    },
  };

  readonly trialInvite = {
    findUnique: async ({
      where,
    }: {
      where: { tokenHash?: string; claimedByUserId?: string };
    }) =>
      this.invites.find((invite) =>
        where.tokenHash
          ? invite.tokenHash === where.tokenHash
          : invite.claimedByUserId === where.claimedByUserId,
      ) ?? null,
    updateMany: async ({
      where,
      data,
    }: {
      where: { id: string; expiresAt?: { gt: Date } };
      data: { claimedAt?: Date; claimedByUserId?: string; revokedAt?: Date };
    }) => {
      const invite = this.invites.find((candidate) => candidate.id === where.id);
      if (
        !invite ||
        invite.claimedAt ||
        invite.claimedByUserId ||
        invite.revokedAt ||
        (where.expiresAt && invite.expiresAt <= where.expiresAt.gt)
      ) {
        return { count: 0 };
      }
      if (data.claimedAt) invite.claimedAt = data.claimedAt;
      if (data.claimedByUserId) invite.claimedByUserId = data.claimedByUserId;
      if (data.revokedAt) invite.revokedAt = data.revokedAt;
      return { count: 1 };
    },
  };

  async $transaction<T>(
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
  ): Promise<T> {
    const previous = this.transactionTail;
    let release!: () => void;
    this.transactionTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;

    if (options?.isolationLevel) {
      this.isolationLevels.push(options.isolationLevel);
    }

    try {
      return await operation(
        {
          user: this.user,
          trialInvite: this.trialInvite,
        } as unknown as Prisma.TransactionClient,
      );
    } finally {
      release();
    }
  }

  addUser(user: Partial<MemoryUser> & Pick<MemoryUser, "id">): MemoryUser {
    const row: MemoryUser = {
      id: user.id,
      plan: user.plan ?? "free",
      emailVerified: user.emailVerified ?? null,
      trialStartedAt: user.trialStartedAt ?? null,
      trialEndsAt: user.trialEndsAt ?? null,
    };
    this.users.set(row.id, row);
    return row;
  }

  addInvite(token: string, expiresAt: Date, id = `invite-${this.invites.length + 1}`) {
    const row: MemoryInvite = {
      id,
      tokenHash: hashTrialInviteToken(token),
      expiresAt,
      revokedAt: null,
      claimedAt: null,
      claimedByUserId: null,
    };
    this.invites.push(row);
    return row;
  }
}

test("invite tokens are normalized and only their SHA-256 hash is stored", () => {
  const token = generateTrialInviteToken();
  assert.equal(token.length, 43);
  assert.equal(normalizeTrialInviteToken(` ${token} `), token);
  assert.equal(hashTrialInviteToken(token).length, 64);
  assert.notEqual(hashTrialInviteToken(token), token);
  assert.equal(normalizeTrialInviteToken("too-short"), null);
});

test("credentials invite is claimed once and starts exactly after verification", async () => {
  const database = new MemoryTrialDatabase();
  const token = generateTrialInviteToken();
  const claimAt = new Date("2026-08-12T10:00:00.000Z");
  const verifyAt = new Date("2026-08-12T12:30:00.000Z");
  const user = database.addUser({ id: "user-1" });
  const invite = database.addInvite(
    token,
    new Date("2026-08-20T00:00:00.000Z"),
  );

  const claimed = await claimOrActivateTrial(
    { userId: user.id, token },
    { database, now: claimAt },
  );
  assert.equal(claimed.status, "pending_verification");
  assert.equal(user.trialStartedAt, null);
  assert.equal(invite.claimedByUserId, user.id);
  assert.equal(invite.claimedAt?.toISOString(), claimAt.toISOString());
  assert.equal(database.invites.some((row) => row.tokenHash === token), false);

  user.emailVerified = verifyAt;
  const activated = await activateClaimedTrialAfterVerification(user.id, {
    database,
    now: verifyAt,
  });
  assert.equal(activated.status, "activated");
  assert.equal(user.plan, "free");
  const actualStartedAt = user.trialStartedAt as Date | null;
  const actualEndsAt = user.trialEndsAt as Date | null;
  assert.ok(actualStartedAt);
  assert.ok(actualEndsAt);
  assert.equal(actualStartedAt.toISOString(), verifyAt.toISOString());
  assert.equal(
    actualEndsAt.getTime(),
    verifyAt.getTime() + TRIAL_DURATION_MS,
  );

  const originalDeadline = actualEndsAt.getTime();
  const repeated = await activateClaimedTrialAfterVerification(user.id, {
    database,
    now: new Date(verifyAt.getTime() + 60 * 60 * 1000),
  });
  assert.equal(repeated.status, "already_active");
  assert.equal(user.trialEndsAt?.getTime(), originalDeadline);
  assert.ok(
    database.isolationLevels.every(
      (level) => level === Prisma.TransactionIsolationLevel.Serializable,
    ),
  );
});

test("one invite cannot be claimed by two accounts concurrently", async () => {
  const database = new MemoryTrialDatabase();
  const token = generateTrialInviteToken();
  const now = new Date("2026-08-12T10:00:00.000Z");
  database.addUser({ id: "user-a" });
  database.addUser({ id: "user-b" });
  database.addInvite(token, new Date("2026-08-20T00:00:00.000Z"));

  const results = await Promise.all([
    claimOrActivateTrial({ userId: "user-a", token }, { database, now }),
    claimOrActivateTrial({ userId: "user-b", token }, { database, now }),
  ]);

  assert.deepEqual(
    results.map((result) => result.status).sort(),
    ["invite_unavailable", "pending_verification"],
  );
  assert.equal(
    database.invites.filter((invite) => invite.claimedByUserId).length,
    1,
  );
});

test("an account can claim only one invite and paid Pro consumes none", async () => {
  const database = new MemoryTrialDatabase();
  const first = generateTrialInviteToken();
  const second = generateTrialInviteToken();
  const proToken = generateTrialInviteToken();
  const now = new Date("2026-08-12T10:00:00.000Z");
  database.addUser({ id: "free-user" });
  database.addUser({ id: "pro-user", plan: "pro", emailVerified: now });
  const firstInvite = database.addInvite(first, new Date("2026-08-20T00:00:00.000Z"));
  const secondInvite = database.addInvite(second, new Date("2026-08-20T00:00:00.000Z"));
  const proInvite = database.addInvite(proToken, new Date("2026-08-20T00:00:00.000Z"));

  const freeResults = await Promise.all([
    claimOrActivateTrial({ userId: "free-user", token: first }, { database, now }),
    claimOrActivateTrial({ userId: "free-user", token: second }, { database, now }),
  ]);
  assert.ok(freeResults.every((result) => result.status === "pending_verification"));
  assert.equal(firstInvite.claimedByUserId, "free-user");
  assert.equal(secondInvite.claimedByUserId, null);

  const pro = await claimOrActivateTrial(
    { userId: "pro-user", token: proToken },
    { database, now },
  );
  assert.equal(pro.status, "paid_pro");
  assert.equal(proInvite.claimedByUserId, null);
});

test("expiry, revocation, and claim state are validated server-side", async () => {
  const database = new MemoryTrialDatabase();
  const now = new Date("2026-08-12T10:00:00.000Z");
  const expiredToken = generateTrialInviteToken();
  const revokedToken = generateTrialInviteToken();
  const claimedToken = generateTrialInviteToken();
  database.addInvite(expiredToken, new Date(now.getTime() - 1));
  const revoked = database.addInvite(revokedToken, new Date(now.getTime() + 60_000));
  revoked.revokedAt = now;
  const claimed = database.addInvite(claimedToken, new Date(now.getTime() + 60_000));
  claimed.claimedAt = now;
  claimed.claimedByUserId = "user-1";

  const lookupDatabase = database as unknown as Parameters<
    typeof validateTrialInviteToken
  >[1] extends { database?: infer T }
    ? T
    : never;
  assert.equal(
    await validateTrialInviteToken(expiredToken, {
      database: lookupDatabase,
      now,
    }),
    "expired",
  );
  assert.equal(
    await validateTrialInviteToken(revokedToken, {
      database: lookupDatabase,
      now,
    }),
    "revoked",
  );
  assert.equal(
    await validateTrialInviteToken(claimedToken, {
      database: lookupDatabase,
      now,
    }),
    "claimed",
  );
});

test("only an unused invite can be revoked", async () => {
  const database = new MemoryTrialDatabase();
  const now = new Date("2026-08-12T10:00:00.000Z");
  const unused = database.addInvite(
    generateTrialInviteToken(),
    new Date("2026-08-20T00:00:00.000Z"),
    "unused",
  );
  const claimed = database.addInvite(
    generateTrialInviteToken(),
    new Date("2026-08-20T00:00:00.000Z"),
    "claimed",
  );
  claimed.claimedAt = now;
  claimed.claimedByUserId = "user-1";

  assert.equal(
    await revokeUnusedTrialInviteById(unused.id, {
      database: database as never,
      now,
    }),
    true,
  );
  assert.equal(unused.revokedAt?.toISOString(), now.toISOString());
  assert.equal(
    await revokeUnusedTrialInviteById(unused.id, {
      database: database as never,
      now,
    }),
    false,
  );
  assert.equal(
    await revokeUnusedTrialInviteById(claimed.id, {
      database: database as never,
      now,
    }),
    false,
  );
});
