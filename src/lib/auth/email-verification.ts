import { createHash, randomBytes } from "node:crypto";

import { getSafeEmailHash, normalizeEmail } from "@/lib/auth/credentials";
import { getAppBaseUrl } from "@/lib/email/app-url";

export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export const EMAIL_VERIFICATION_REQUIRED_CODE = "email_verification_required";

export const EMAIL_VERIFICATION_REQUIRED_MESSAGE =
  "Confirm your email to generate content.";

export const EMAIL_VERIFICATION_SUCCESS_MESSAGE =
  "Your email is confirmed. You can generate content now.";

export const EMAIL_VERIFICATION_INVALID_MESSAGE =
  "This confirmation link is invalid or has expired. Request a new verification email.";

export const EMAIL_VERIFICATION_RESEND_SUCCESS_MESSAGE =
  "If your email still needs confirmation, we sent a new verification link.";

export const EMAIL_VERIFICATION_ALREADY_VERIFIED_MESSAGE =
  "Your email is already confirmed.";

export class EmailVerificationError extends Error {
  constructor(
    public readonly code:
      | "missing_token"
      | "invalid_or_expired_token"
      | "user_not_found"
      | "already_verified",
  ) {
    super(code);
    this.name = "EmailVerificationError";
  }
}

export interface EmailVerificationUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: Date | null;
}

export interface EmailVerificationTokenRecord {
  identifier: string;
  token: string;
  expires: Date;
}

export interface EmailVerificationStore {
  findUserById(userId: string): Promise<EmailVerificationUser | null>;
  findUserByEmail(email: string): Promise<EmailVerificationUser | null>;
  deleteTokensForIdentifier(identifier: string): Promise<void>;
  createToken(data: {
    identifier: string;
    token: string;
    expires: Date;
  }): Promise<EmailVerificationTokenRecord>;
  findValidToken(
    tokenHash: string,
    now: Date,
  ): Promise<EmailVerificationTokenRecord | null>;
  deleteToken(identifier: string, token: string): Promise<void>;
  markEmailVerified(userId: string, verifiedAt: Date): Promise<void>;
}

export function hashEmailVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateEmailVerificationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function getEmailVerificationUrl(token: string, baseUrl?: string): string {
  const root = (baseUrl ?? getAppBaseUrl()).replace(/\/$/, "");
  const url = new URL("/verify-email", root);
  url.searchParams.set("token", token);
  return url.toString();
}

export function isEmailVerified(
  emailVerified: Date | null | undefined,
): boolean {
  return emailVerified instanceof Date && !Number.isNaN(emailVerified.getTime());
}

/** Issue a single-use verification token for the given email (invalidates prior tokens). */
export async function issueEmailVerificationToken(
  emailInput: string,
  store: EmailVerificationStore,
  now: () => Date = () => new Date(),
): Promise<{
  email: string;
  plainToken: string;
  emailHash: string;
  expiresAt: Date;
}> {
  const email = normalizeEmail(emailInput);
  if (!email) {
    throw new EmailVerificationError("user_not_found");
  }

  const currentTime = now();
  const identifier = email;
  await store.deleteTokensForIdentifier(identifier);

  const plainToken = generateEmailVerificationToken();
  const tokenHash = hashEmailVerificationToken(plainToken);
  const expiresAt = new Date(currentTime.getTime() + EMAIL_VERIFICATION_TTL_MS);

  await store.createToken({
    identifier,
    token: tokenHash,
    expires: expiresAt,
  });

  return {
    email,
    plainToken,
    emailHash: getSafeEmailHash(email),
    expiresAt,
  };
}

/** Consume a verification token and set User.emailVerified. */
export async function verifyEmailWithToken(
  tokenInput: string | undefined,
  store: EmailVerificationStore,
  now: () => Date = () => new Date(),
): Promise<{
  userId: string;
  email: string;
  alreadyVerified: boolean;
}> {
  const plainToken = tokenInput?.trim() ?? "";
  if (!plainToken) {
    throw new EmailVerificationError("missing_token");
  }

  const currentTime = now();
  const tokenHash = hashEmailVerificationToken(plainToken);
  const record = await store.findValidToken(tokenHash, currentTime);

  if (!record) {
    throw new EmailVerificationError("invalid_or_expired_token");
  }

  const user = await store.findUserByEmail(record.identifier);
  if (!user) {
    await store.deleteTokensForIdentifier(record.identifier);
    throw new EmailVerificationError("invalid_or_expired_token");
  }

  const alreadyVerified = isEmailVerified(user.emailVerified);
  if (!alreadyVerified) {
    await store.markEmailVerified(user.id, currentTime);
  }

  // Single-use: remove this token and any other active tokens for the email.
  await store.deleteTokensForIdentifier(record.identifier);

  return {
    userId: user.id,
    email: user.email,
    alreadyVerified,
  };
}

/**
 * Resend verification for a logged-in user.
 * Returns already_verified without issuing a token when email is confirmed.
 */
export async function resendEmailVerificationForUser(
  userId: string,
  store: EmailVerificationStore,
  now: () => Date = () => new Date(),
): Promise<
  | { status: "already_verified"; email: string }
  | {
      status: "issued";
      email: string;
      name: string | null;
      plainToken: string;
      emailHash: string;
    }
> {
  const user = await store.findUserById(userId);
  if (!user) {
    throw new EmailVerificationError("user_not_found");
  }

  if (isEmailVerified(user.emailVerified)) {
    return { status: "already_verified", email: user.email };
  }

  const issued = await issueEmailVerificationToken(user.email, store, now);
  return {
    status: "issued",
    email: user.email,
    name: user.name,
    plainToken: issued.plainToken,
    emailHash: issued.emailHash,
  };
}

export type { EmailVerificationStore as EmailVerificationStoreType };
