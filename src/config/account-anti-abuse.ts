/**
 * Free-account anti-abuse policy (Phase 5.2).
 * Secrets never returned — only booleans and day counts.
 */

export function getDeletedAccountReRegisterCooldownDays(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = Number.parseInt(
    env.DELETED_ACCOUNT_RE_REGISTER_COOLDOWN_DAYS ?? "90",
    10,
  );
  if (!Number.isFinite(raw) || raw < 0) return 90;
  return Math.min(raw, 3650);
}

export function getDeletedAccountFreeTrialLockDays(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = Number.parseInt(
    env.DELETED_ACCOUNT_FREE_TRIAL_LOCK_DAYS ?? "365",
    10,
  );
  if (!Number.isFinite(raw) || raw < 0) return 365;
  return Math.min(raw, 3650);
}

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export const RE_REGISTER_COOLDOWN_MESSAGE =
  "This email was recently used for a deleted account. Contact support if you need help restoring access.";
