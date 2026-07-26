import {
  addDays,
  getDeletedAccountFreeTrialLockDays,
  getDeletedAccountReRegisterCooldownDays,
  RE_REGISTER_COOLDOWN_MESSAGE,
} from "@/config/account-anti-abuse";
import { prisma } from "@/lib/db";
import {
  isAccountIdentityHashConfigured,
  tryCreateEmailIdentityHash,
} from "@/lib/security/email-normalization";

export { RE_REGISTER_COOLDOWN_MESSAGE };

export type DeletedAccountIdentityRecord = {
  emailHash: string;
  reRegisterBlockedUntil: Date | null;
  freeTrialLockedUntil: Date | null;
  deletionCount: number;
};

export type DeletedAccountIdentityStore = {
  findByEmailHash(
    emailHash: string,
  ): Promise<DeletedAccountIdentityRecord | null>;
  upsertOnDeletion(input: {
    emailHash: string;
    normalizedDomain: string | null;
    deletedUserId: string;
    deletedAt: Date;
    reRegisterBlockedUntil: Date | null;
    freeTrialLockedUntil: Date | null;
  }): Promise<void>;
};

export const prismaDeletedAccountIdentityStore: DeletedAccountIdentityStore = {
  async findByEmailHash(emailHash) {
    return prisma.deletedAccountIdentity.findUnique({
      where: { emailHash },
      select: {
        emailHash: true,
        reRegisterBlockedUntil: true,
        freeTrialLockedUntil: true,
        deletionCount: true,
      },
    });
  },

  async upsertOnDeletion(input) {
    await prisma.deletedAccountIdentity.upsert({
      where: { emailHash: input.emailHash },
      create: {
        emailHash: input.emailHash,
        normalizedDomain: input.normalizedDomain,
        deletedUserId: input.deletedUserId,
        deletedAt: input.deletedAt,
        reRegisterBlockedUntil: input.reRegisterBlockedUntil,
        freeTrialLockedUntil: input.freeTrialLockedUntil,
        deletionCount: 1,
      },
      update: {
        normalizedDomain: input.normalizedDomain,
        deletedUserId: input.deletedUserId,
        deletedAt: input.deletedAt,
        reRegisterBlockedUntil: input.reRegisterBlockedUntil,
        freeTrialLockedUntil: input.freeTrialLockedUntil,
        deletionCount: { increment: 1 },
      },
    });
  },
};

/**
 * Record HMAC tombstone before permanent account delete.
 * No-op if ACCOUNT_IDENTITY_HASH_SECRET is unset (local/dev).
 * Never stores plaintext email.
 */
export async function recordDeletedAccountIdentity(
  input: {
    email: string;
    deletedUserId: string;
    now?: Date;
    env?: NodeJS.ProcessEnv;
  },
  store?: DeletedAccountIdentityStore,
): Promise<{ recorded: boolean; emailHash?: string }> {
  const identityStore = store ?? prismaDeletedAccountIdentityStore;
  const env = input.env ?? process.env;
  if (!isAccountIdentityHashConfigured(env)) {
    console.warn(
      "[anti-abuse] ACCOUNT_IDENTITY_HASH_SECRET unset; skip deleted-account tombstone",
    );
    return { recorded: false };
  }

  const identity = tryCreateEmailIdentityHash(input.email, env);
  if (!identity) {
    return { recorded: false };
  }

  const now = input.now ?? new Date();
  const cooldownDays = getDeletedAccountReRegisterCooldownDays(env);
  const lockDays = getDeletedAccountFreeTrialLockDays(env);

  await identityStore.upsertOnDeletion({
    emailHash: identity.emailHash,
    normalizedDomain: identity.domain,
    deletedUserId: input.deletedUserId,
    deletedAt: now,
    reRegisterBlockedUntil:
      cooldownDays > 0 ? addDays(now, cooldownDays) : null,
    freeTrialLockedUntil: lockDays > 0 ? addDays(now, lockDays) : null,
  });

  return { recorded: true, emailHash: identity.emailHash };
}

export type RegistrationIdentityCheck =
  | { allowed: true }
  | { allowed: false; code: "re_register_cooldown"; message: string };

/**
 * Block new registration when a tombstone is still within re-register cooldown.
 * No-op (allow) if secret unset or no tombstone.
 */
export async function checkRegistrationAgainstDeletedIdentity(
  email: string,
  options: {
    now?: Date;
    env?: NodeJS.ProcessEnv;
    store?: DeletedAccountIdentityStore;
  } = {},
): Promise<RegistrationIdentityCheck> {
  const env = options.env ?? process.env;
  if (!isAccountIdentityHashConfigured(env)) {
    return { allowed: true };
  }

  const identity = tryCreateEmailIdentityHash(email, env);
  if (!identity) {
    return { allowed: true };
  }

  const store = options.store ?? prismaDeletedAccountIdentityStore;
  const row = await store.findByEmailHash(identity.emailHash);
  if (!row?.reRegisterBlockedUntil) {
    return { allowed: true };
  }

  const now = options.now ?? new Date();
  if (row.reRegisterBlockedUntil.getTime() > now.getTime()) {
    return {
      allowed: false,
      code: "re_register_cooldown",
      message: RE_REGISTER_COOLDOWN_MESSAGE,
    };
  }

  return { allowed: true };
}
