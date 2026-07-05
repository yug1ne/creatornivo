import { createHash, randomBytes } from "node:crypto";

import { getSafeEmailHash, normalizeEmail } from "@/lib/auth/credentials";

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export const FORGOT_PASSWORD_SUCCESS_MESSAGE =
  "If an account exists, we sent reset instructions";

export class PasswordResetError extends Error {
  constructor(
    public readonly code:
      | "missing_token"
      | "missing_password"
      | "password_too_short"
      | "invalid_or_expired_token",
  ) {
    super(code);
    this.name = "PasswordResetError";
  }
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generatePasswordResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function getPasswordResetUrl(token: string): string {
  const baseUrl =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  const url = new URL("/reset-password", baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

interface PasswordResetUser {
  id: string;
  email: string;
  password: string | null;
}

interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
}

interface PasswordResetStore {
  findUserByEmail(email: string): Promise<PasswordResetUser | null>;
  invalidateActiveTokens(userId: string, usedAt: Date): Promise<void>;
  createToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetTokenRecord>;
  findValidToken(tokenHash: string, now: Date): Promise<PasswordResetTokenRecord | null>;
  markTokenUsed(tokenId: string, usedAt: Date): Promise<void>;
  updateUserPassword(
    userId: string,
    passwordHash: string,
    passwordChangedAt: Date,
  ): Promise<void>;
}

export async function requestPasswordResetForEmail(
  emailInput: string,
  store: PasswordResetStore,
  now = () => new Date(),
) {
  const email = normalizeEmail(emailInput);
  if (!email) {
    return null;
  }

  const user = await store.findUserByEmail(email);
  if (!user?.password) {
    return null;
  }

  const currentTime = now();
  await store.invalidateActiveTokens(user.id, currentTime);

  const plainToken = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(plainToken);

  await store.createToken({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(currentTime.getTime() + PASSWORD_RESET_TTL_MS),
  });

  return {
    email: user.email,
    plainToken,
    emailHash: getSafeEmailHash(email),
  };
}

export async function resetPasswordWithToken(
  input: { token?: string; password?: string },
  store: PasswordResetStore,
  dependencies: {
    hashPassword: (password: string) => Promise<string>;
    now?: () => Date;
  },
) {
  if (!input.token?.trim()) {
    throw new PasswordResetError("missing_token");
  }
  if (!input.password) {
    throw new PasswordResetError("missing_password");
  }
  if (input.password.length < 8) {
    throw new PasswordResetError("password_too_short");
  }

  const now = dependencies.now ?? (() => new Date());
  const currentTime = now();
  const tokenHash = hashPasswordResetToken(input.token.trim());
  const tokenRecord = await store.findValidToken(tokenHash, currentTime);

  if (!tokenRecord) {
    throw new PasswordResetError("invalid_or_expired_token");
  }

  const passwordHash = await dependencies.hashPassword(input.password);
  await store.updateUserPassword(tokenRecord.userId, passwordHash, currentTime);
  await store.markTokenUsed(tokenRecord.id, currentTime);

  return { userId: tokenRecord.userId };
}

export type { PasswordResetStore };