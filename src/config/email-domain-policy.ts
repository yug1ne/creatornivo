import { isDisposableEmailDomain } from "@/config/disposable-email-domains";
import { getEmailDomain } from "@/lib/security/email-normalization";

export type EmailDomainPolicyMode =
  | "open"
  | "block_disposable"
  | "trusted_only";

/** Default trusted domains for trusted_only mode (not used when mode is block_disposable). */
export const DEFAULT_TRUSTED_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "mail.com",
] as const;

export const EMAIL_DOMAIN_BLOCKED_DISPOSABLE_MESSAGE =
  "Please use a real email address. Temporary email domains are not supported.";

export const EMAIL_DOMAIN_BLOCKED_TRUSTED_ONLY_MESSAGE =
  "Please use a supported email provider (for example Gmail, Outlook, or Proton).";

export const EMAIL_DOMAIN_INVALID_MESSAGE =
  "Please enter a valid email address.";

export type EmailDomainPolicyResult =
  | { allowed: true }
  | { allowed: false; code: "invalid_email" | "disposable" | "not_trusted"; message: string };

function parseDomainList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const d = part.trim().toLowerCase();
    if (!d || seen.has(d)) continue;
    seen.add(d);
    out.push(d);
  }
  return out;
}

export function getEmailDomainPolicyMode(
  env: NodeJS.ProcessEnv = process.env,
): EmailDomainPolicyMode {
  const raw = (env.EMAIL_DOMAIN_POLICY ?? "block_disposable").trim().toLowerCase();
  if (raw === "open" || raw === "trusted_only" || raw === "block_disposable") {
    return raw;
  }
  return "block_disposable";
}

export function getTrustedEmailDomains(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const fromEnv = parseDomainList(env.TRUSTED_EMAIL_DOMAINS);
  if (fromEnv.length > 0) return fromEnv;
  return [...DEFAULT_TRUSTED_EMAIL_DOMAINS];
}

export function getBlockedEmailDomains(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  return parseDomainList(env.BLOCKED_EMAIL_DOMAINS);
}

function isBlockedExtraDomain(domain: string, blocked: string[]): boolean {
  for (const b of blocked) {
    if (domain === b || domain.endsWith(`.${b}`)) return true;
  }
  return false;
}

function isTrustedDomain(domain: string, trusted: string[]): boolean {
  for (const t of trusted) {
    if (domain === t || domain.endsWith(`.${t}`)) return true;
  }
  // googlemail aliases as gmail
  if (domain === "googlemail.com" && trusted.includes("gmail.com")) return true;
  return false;
}

/**
 * Evaluate whether an email may be used for new account registration.
 * Existing active users are not evaluated here.
 */
export function evaluateEmailDomainPolicy(
  email: string,
  env: NodeJS.ProcessEnv = process.env,
): EmailDomainPolicyResult {
  const domain = getEmailDomain(email);
  if (!domain) {
    return {
      allowed: false,
      code: "invalid_email",
      message: EMAIL_DOMAIN_INVALID_MESSAGE,
    };
  }

  const mode = getEmailDomainPolicyMode(env);
  const extraBlocked = getBlockedEmailDomains(env);

  if (isBlockedExtraDomain(domain, extraBlocked)) {
    return {
      allowed: false,
      code: "disposable",
      message: EMAIL_DOMAIN_BLOCKED_DISPOSABLE_MESSAGE,
    };
  }

  if (mode === "open") {
    return { allowed: true };
  }

  if (mode === "block_disposable") {
    if (isDisposableEmailDomain(email)) {
      return {
        allowed: false,
        code: "disposable",
        message: EMAIL_DOMAIN_BLOCKED_DISPOSABLE_MESSAGE,
      };
    }
    return { allowed: true };
  }

  // trusted_only
  const trusted = getTrustedEmailDomains(env);
  if (!isTrustedDomain(domain, trusted)) {
    return {
      allowed: false,
      code: "not_trusted",
      message: EMAIL_DOMAIN_BLOCKED_TRUSTED_ONLY_MESSAGE,
    };
  }
  if (isDisposableEmailDomain(email)) {
    return {
      allowed: false,
      code: "disposable",
      message: EMAIL_DOMAIN_BLOCKED_DISPOSABLE_MESSAGE,
    };
  }
  return { allowed: true };
}

export function isEmailDomainAllowedForRegistration(
  email: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return evaluateEmailDomainPolicy(email, env).allowed;
}
