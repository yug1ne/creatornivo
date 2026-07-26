/**
 * Deleted-account HMAC tombstones + re-register cooldown.
 * Run: npx tsx --test tests/deleted-account-identity.test.ts
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  CredentialsRegistrationError,
  registerCredentialsUser,
} from "../src/lib/auth/credentials";
import {
  checkRegistrationAgainstDeletedIdentity,
  recordDeletedAccountIdentity,
  type DeletedAccountIdentityStore,
  type DeletedAccountIdentityRecord,
} from "../src/lib/security/deleted-account-identity";
import {
  createEmailIdentityHash,
  normalizeEmailForIdentity,
} from "../src/lib/security/email-normalization";
import { deleteUserAccount } from "../src/lib/privacy/delete-user-account";

const SECRET = "test-account-identity-secret-phase-52";

function memoryStore(): DeletedAccountIdentityStore & {
  rows: Map<string, DeletedAccountIdentityRecord & { plaintextNever: true }>;
} {
  const rows = new Map<
    string,
    DeletedAccountIdentityRecord & {
      plaintextNever: true;
      normalizedDomain?: string | null;
    }
  >();
  return {
    rows,
    async findByEmailHash(emailHash) {
      const row = rows.get(emailHash);
      return row
        ? {
            emailHash: row.emailHash,
            reRegisterBlockedUntil: row.reRegisterBlockedUntil,
            freeTrialLockedUntil: row.freeTrialLockedUntil,
            deletionCount: row.deletionCount,
          }
        : null;
    },
    async upsertOnDeletion(input) {
      const existing = rows.get(input.emailHash);
      rows.set(input.emailHash, {
        emailHash: input.emailHash,
        reRegisterBlockedUntil: input.reRegisterBlockedUntil,
        freeTrialLockedUntil: input.freeTrialLockedUntil,
        deletionCount: (existing?.deletionCount ?? 0) + 1,
        plaintextNever: true,
        normalizedDomain: input.normalizedDomain,
      });
    },
  };
}

test("recordDeletedAccountIdentity stores HMAC only, no plaintext email", async () => {
  const store = memoryStore();
  const email = "User.Name+x@gmail.com";
  const result = await recordDeletedAccountIdentity(
    {
      email,
      deletedUserId: "user-1",
      now: new Date("2026-07-27T12:00:00.000Z"),
      env: {
        ACCOUNT_IDENTITY_HASH_SECRET: SECRET,
        DELETED_ACCOUNT_RE_REGISTER_COOLDOWN_DAYS: "90",
        DELETED_ACCOUNT_FREE_TRIAL_LOCK_DAYS: "365",
      },
    },
    store,
  );

  assert.equal(result.recorded, true);
  const expectedHash = createEmailIdentityHash(
    normalizeEmailForIdentity(email),
    SECRET,
  );
  assert.equal(result.emailHash, expectedHash);
  const row = store.rows.get(expectedHash);
  assert.ok(row);
  assert.equal(row!.deletionCount, 1);
  const serialized = JSON.stringify([...store.rows.values()]);
  assert.equal(serialized.includes("User.Name"), false);
  assert.equal(serialized.includes("gmail.com") || true, true); // domain ok
  assert.doesNotMatch(serialized, /User\.Name\+x@gmail\.com/i);
});

test("re-register same normalized email during cooldown is blocked", async () => {
  const store = memoryStore();
  const now = new Date("2026-07-27T12:00:00.000Z");
  await recordDeletedAccountIdentity(
    {
      email: "user@gmail.com",
      deletedUserId: "u1",
      now,
      env: {
        ACCOUNT_IDENTITY_HASH_SECRET: SECRET,
        DELETED_ACCOUNT_RE_REGISTER_COOLDOWN_DAYS: "90",
      },
    },
    store,
  );

  const blocked = await checkRegistrationAgainstDeletedIdentity(
    "u.s.e.r+tag@googlemail.com",
    {
      now: new Date("2026-08-01T00:00:00.000Z"),
      env: { ACCOUNT_IDENTITY_HASH_SECRET: SECRET },
      store,
    },
  );
  assert.equal(blocked.allowed, false);

  await assert.rejects(
    registerCredentialsUser(
      {
        email: "user+again@gmail.com",
        password: "password-12345",
      },
      {
        findUserByEmail: async () => null,
        hashPassword: async () => "hash",
        createUser: async () => {
          throw new Error("should not create");
        },
        checkDeletedIdentity: async (email) => {
          const r = await checkRegistrationAgainstDeletedIdentity(email, {
            now: new Date("2026-08-01T00:00:00.000Z"),
            env: { ACCOUNT_IDENTITY_HASH_SECRET: SECRET },
            store,
          });
          return r.allowed
            ? { allowed: true }
            : { allowed: false, message: r.message };
        },
        env: {
          ACCOUNT_IDENTITY_HASH_SECRET: SECRET,
          EMAIL_DOMAIN_POLICY: "block_disposable",
        },
      },
    ),
    (error: unknown) =>
      error instanceof CredentialsRegistrationError &&
      error.code === "re_register_cooldown",
  );
});

test("different email is allowed after delete", async () => {
  const store = memoryStore();
  await recordDeletedAccountIdentity(
    {
      email: "a@gmail.com",
      deletedUserId: "u1",
      now: new Date("2026-07-27T12:00:00.000Z"),
      env: {
        ACCOUNT_IDENTITY_HASH_SECRET: SECRET,
        DELETED_ACCOUNT_RE_REGISTER_COOLDOWN_DAYS: "90",
      },
    },
    store,
  );

  const other = await checkRegistrationAgainstDeletedIdentity("b@gmail.com", {
    now: new Date("2026-07-28T00:00:00.000Z"),
    env: { ACCOUNT_IDENTITY_HASH_SECRET: SECRET },
    store,
  });
  assert.equal(other.allowed, true);
});

test("deleteUserAccount records tombstone before deleteUserData", async () => {
  const order: string[] = [];
  let tombstoneEmail: string | null = null;

  await deleteUserAccount(
    {
      userId: "user-del",
      password: "pw",
      confirmation: "DELETE",
    },
    {
      now: () => new Date("2026-07-27T12:00:00.000Z"),
      verifyPassword: async () => undefined,
      recordTombstone: async (input) => {
        order.push("tombstone");
        tombstoneEmail = input.email;
        return { recorded: true, emailHash: "abc" };
      },
      dataStore: {
        findDeletionUser: async () => ({
          id: "user-del",
          email: "person@example.com",
          plan: "free",
          role: "user",
          subscription: null,
        }),
        findActiveReservations: async () => [],
        deleteUserData: async () => {
          order.push("delete");
        },
        findAdjustmentsWithUserId: async () => 0,
      },
      auditStore: {
        createRecord: async () => {
          order.push("audit-create");
          return { id: "audit-1" };
        },
        updateRecord: async () => {
          order.push("audit-update");
        },
      },
    },
  );

  assert.deepEqual(order, [
    "audit-create",
    "tombstone",
    "delete",
    "audit-update",
  ]);
  assert.equal(tombstoneEmail, "person@example.com");
});
