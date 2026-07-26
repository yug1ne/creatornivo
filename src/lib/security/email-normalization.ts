import { createHmac } from "node:crypto";

/**
 * Email identity helpers for free-account anti-abuse.
 * Gmail-style normalization for identity hashing only — login lookup may still use plain lowercase.
 */

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

/** Providers where +tag aliases are commonly used for free-trial abuse. */
const PLUS_TAG_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
]);

/**
 * Extract domain from email (lowercase). Returns null if invalid.
 */
export function getEmailDomain(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0 || at === normalized.length - 1) {
    return null;
  }

  const domain = normalized.slice(at + 1).trim();
  if (!domain || domain.includes("@") || domain.includes(" ")) {
    return null;
  }

  return domain;
}

/**
 * Normalize email for abuse-identity matching (not necessarily login uniqueness).
 * - lowercase + trim
 * - gmail.com / googlemail.com → gmail.com, strip dots in local, strip +tag
 * - known plus-tag providers → strip +tag only (no dot-stripping)
 * - custom domains → lowercase only (no over-normalization)
 */
export function normalizeEmailForIdentity(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) {
    return trimmed;
  }

  let local = trimmed.slice(0, at);
  let domain = trimmed.slice(at + 1);

  if (GMAIL_DOMAINS.has(domain)) {
    domain = "gmail.com";
    const plus = local.indexOf("+");
    if (plus >= 0) {
      local = local.slice(0, plus);
    }
    local = local.replace(/\./g, "");
    return `${local}@${domain}`;
  }

  if (PLUS_TAG_DOMAINS.has(domain)) {
    const plus = local.indexOf("+");
    if (plus >= 0) {
      local = local.slice(0, plus);
    }
    return `${local}@${domain}`;
  }

  return `${local}@${domain}`;
}

/**
 * HMAC-SHA256 hex digest of a normalized email for tombstone storage.
 * Requires ACCOUNT_IDENTITY_HASH_SECRET (never plain SHA256 without secret).
 */
export function createEmailIdentityHash(
  normalizedEmail: string,
  secret: string = process.env.ACCOUNT_IDENTITY_HASH_SECRET ?? "",
): string {
  const key = secret.trim();
  if (!key) {
    throw new Error("ACCOUNT_IDENTITY_HASH_SECRET is not configured");
  }
  if (!normalizedEmail) {
    throw new Error("normalizedEmail is required for identity hash");
  }
  return createHmac("sha256", key).update(normalizedEmail, "utf8").digest("hex");
}

export function isAccountIdentityHashConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean((env.ACCOUNT_IDENTITY_HASH_SECRET ?? "").trim());
}

/**
 * Safe helper: returns null if secret missing (dev) instead of throwing.
 */
export function tryCreateEmailIdentityHash(
  email: string,
  env: NodeJS.ProcessEnv = process.env,
): { normalizedEmail: string; emailHash: string; domain: string | null } | null {
  const secret = (env.ACCOUNT_IDENTITY_HASH_SECRET ?? "").trim();
  if (!secret) return null;

  const normalizedEmail = normalizeEmailForIdentity(email);
  if (!normalizedEmail || !normalizedEmail.includes("@")) return null;

  return {
    normalizedEmail,
    emailHash: createEmailIdentityHash(normalizedEmail, secret),
    domain: getEmailDomain(normalizedEmail),
  };
}
