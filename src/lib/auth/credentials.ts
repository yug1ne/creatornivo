import { createHash, randomUUID } from "node:crypto";

import type { Plan } from "@/config/plans";
import type { UserRole } from "@/types/user";
import {
  AuthRateLimitError,
  enforceAuthRateLimit,
} from "@/lib/auth/rate-limit";

export type CredentialsAuthorizeFailureReason =
  | "user_not_found"
  | "password_hash_missing"
  | "bcrypt_mismatch"
  | "database_error"
  | "unexpected_authorize_error"
  | "rate_limited";

export interface CredentialsUserRecord {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  password: string | null;
  plan: Plan;
  role: UserRole;
}

export interface AuthDiagnosticEntry {
  event: "credentials_authorize" | "session_refresh";
  outcome: "success" | "denied" | "error";
  reason?: CredentialsAuthorizeFailureReason | "database_error";
  requestId: string;
  emailHash: string;
  userId: string | null;
  userFound: boolean;
  passwordHashPresent: boolean;
  timestamp: string;
  environment: string;
  instance: string;
  databaseFingerprint: string;
  databaseErrorCode?: string;
}

export type AuthDiagnosticLogger = (entry: AuthDiagnosticEntry) => void;

interface AuthorizeDependencies {
  findUserByEmail(email: string): Promise<CredentialsUserRecord | null>;
  comparePassword(password: string, hash: string): Promise<boolean>;
  enforceRateLimit?: (request: Request, email: string) => Promise<void>;
  log?: AuthDiagnosticLogger;
  now?: () => Date;
}

interface RegistrationDependencies<TUser> {
  findUserByEmail(email: string): Promise<{ id: string } | null>;
  hashPassword(password: string): Promise<string>;
  createUser(data: {
    name: string | null;
    email: string;
    password: string;
  }): Promise<TUser>;
}

export class CredentialsRegistrationError extends Error {
  constructor(
    public readonly code:
      | "missing_credentials"
      | "password_too_short"
      | "user_exists",
  ) {
    super(code);
    this.name = "CredentialsRegistrationError";
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function stableHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export function getDatabaseFingerprint(
  databaseUrl = process.env.DATABASE_URL,
): string {
  return databaseUrl ? `sha256:${stableHash(databaseUrl)}` : "missing";
}

export function getSafeEmailHash(email: string): string {
  const normalizedEmail = normalizeEmail(email);
  return normalizedEmail
    ? `sha256:${stableHash(normalizedEmail)}`
    : "missing";
}

function safeRequestId(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return /^[a-zA-Z0-9._:/-]{1,128}$/.test(trimmed) ? trimmed : null;
}

export function getAuthRequestId(request: Request): string {
  return (
    safeRequestId(request.headers.get("x-request-id")) ??
    safeRequestId(request.headers.get("x-vercel-id")) ??
    randomUUID()
  );
}

function safeDatabaseErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    /^P\d{4}$/.test(error.code)
  ) {
    return error.code;
  }

  return undefined;
}

function defaultDiagnosticLogger(entry: AuthDiagnosticEntry): void {
  const serialized = JSON.stringify(entry);
  if (entry.outcome === "error") {
    console.error("[auth-diagnostic]", serialized);
  } else if (entry.outcome === "denied") {
    console.warn("[auth-diagnostic]", serialized);
  } else {
    console.info("[auth-diagnostic]", serialized);
  }
}

export function logSessionRefreshDatabaseError(input: {
  userId: string;
  email?: string | null;
  error: unknown;
  log?: AuthDiagnosticLogger;
  now?: () => Date;
}): void {
  const log = input.log ?? defaultDiagnosticLogger;
  log({
    event: "session_refresh",
    outcome: "error",
    reason: "database_error",
    requestId: randomUUID(),
    emailHash: getSafeEmailHash(input.email ?? ""),
    userId: input.userId,
    userFound: true,
    passwordHashPresent: false,
    timestamp: (input.now ?? (() => new Date()))().toISOString(),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    instance:
      process.env.VERCEL_DEPLOYMENT_ID ??
      process.env.VERCEL_REGION ??
      "local",
    databaseFingerprint: getDatabaseFingerprint(),
    databaseErrorCode: safeDatabaseErrorCode(input.error),
  });
}

export async function authorizeCredentials(
  credentials: Partial<Record<"email" | "password", unknown>>,
  request: Request,
  dependencies: AuthorizeDependencies,
) {
  const rawEmail = typeof credentials.email === "string" ? credentials.email : "";
  const password =
    typeof credentials.password === "string" ? credentials.password : null;
  const email = normalizeEmail(rawEmail);
  const requestId = getAuthRequestId(request);
  const log = dependencies.log ?? defaultDiagnosticLogger;
  const now = dependencies.now ?? (() => new Date());

  const emit = (
    outcome: AuthDiagnosticEntry["outcome"],
    reason: CredentialsAuthorizeFailureReason | undefined,
    user: CredentialsUserRecord | null,
    error?: unknown,
  ) => {
    log({
      event: "credentials_authorize",
      outcome,
      reason,
      requestId,
      emailHash: getSafeEmailHash(email),
      userId: user?.id ?? null,
      userFound: Boolean(user),
      passwordHashPresent: Boolean(user?.password),
      timestamp: now().toISOString(),
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      instance:
        process.env.VERCEL_DEPLOYMENT_ID ??
        process.env.VERCEL_REGION ??
        "local",
      databaseFingerprint: getDatabaseFingerprint(),
      databaseErrorCode: safeDatabaseErrorCode(error),
    });
  };

  if (!email || password === null || password.length === 0) {
    emit("denied", "user_not_found", null);
    return null;
  }

  const enforceRateLimit =
    dependencies.enforceRateLimit ??
    ((request, candidateEmail) =>
      enforceAuthRateLimit({
        action: "login",
        request,
        email: candidateEmail,
      }));

  try {
    await enforceRateLimit(request, email);
  } catch (error) {
    if (error instanceof AuthRateLimitError) {
      emit("denied", "rate_limited", null);
      throw error;
    }
    throw error;
  }

  let user: CredentialsUserRecord | null;
  try {
    user = await dependencies.findUserByEmail(email);
  } catch (error) {
    emit("error", "database_error", null, error);
    return null;
  }

  if (!user) {
    emit("denied", "user_not_found", null);
    return null;
  }

  if (!user.password) {
    emit("denied", "password_hash_missing", user);
    return null;
  }

  let isValid: boolean;
  try {
    isValid = await dependencies.comparePassword(password, user.password);
  } catch (error) {
    emit("error", "unexpected_authorize_error", user, error);
    return null;
  }

  if (!isValid) {
    emit("denied", "bcrypt_mismatch", user);
    return null;
  }

  emit("success", undefined, user);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    plan: user.plan,
    role: user.role,
  };
}

export async function registerCredentialsUser<TUser>(
  input: {
    name?: string;
    email?: string;
    password?: string;
  },
  dependencies: RegistrationDependencies<TUser>,
): Promise<TUser> {
  if (!input.email || !input.password) {
    throw new CredentialsRegistrationError("missing_credentials");
  }

  if (input.password.length < 8) {
    throw new CredentialsRegistrationError("password_too_short");
  }

  const email = normalizeEmail(input.email);
  if (!email) {
    throw new CredentialsRegistrationError("missing_credentials");
  }

  const existingUser = await dependencies.findUserByEmail(email);
  if (existingUser) {
    throw new CredentialsRegistrationError("user_exists");
  }

  const passwordHash = await dependencies.hashPassword(input.password);
  const user = await dependencies.createUser({
    name: input.name?.trim() || null,
    email,
    password: passwordHash,
  });
  return user;
}
