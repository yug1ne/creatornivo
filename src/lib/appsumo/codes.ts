import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import {
  APPSUMO_CODE_ALPHABET,
  APPSUMO_CODE_LENGTH,
  APPSUMO_CODE_SUFFIX_LENGTH,
} from "@/config/appsumo";

const SEPARATOR_PATTERN = /[\s\-]+/g;

export function isAppSumoHashSecretConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean((env.APPSUMO_CODE_HASH_SECRET ?? "").trim());
}

export function getAppSumoHashSecret(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const secret = (env.APPSUMO_CODE_HASH_SECRET ?? "").trim();
  if (!secret) {
    throw new Error("APPSUMO_CODE_HASH_SECRET is not configured");
  }
  return secret;
}

export function normalizeAppSumoCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase().replace(SEPARATOR_PATTERN, "");
  if (normalized.length !== APPSUMO_CODE_LENGTH) return null;
  for (const char of normalized) {
    if (!APPSUMO_CODE_ALPHABET.includes(char)) return null;
  }
  return normalized;
}

export function digestAppSumoCode(
  canonicalCode: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  return createHmac("sha256", getAppSumoHashSecret(env))
    .update(canonicalCode, "utf8")
    .digest("hex");
}

export function appSumoCodeSuffix(canonicalCode: string): string {
  return canonicalCode.slice(-APPSUMO_CODE_SUFFIX_LENGTH);
}

export function generateAppSumoCode(): string {
  const alphabetSize = APPSUMO_CODE_ALPHABET.length;
  const bytes = randomBytes(APPSUMO_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < APPSUMO_CODE_LENGTH; i += 1) {
    code += APPSUMO_CODE_ALPHABET[bytes[i] % alphabetSize];
  }
  return code;
}

export function generateUniqueAppSumoCodes(count: number): string[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("count must be a positive integer");
  }

  const codes = new Set<string>();
  let guard = 0;
  while (codes.size < count) {
    codes.add(generateAppSumoCode());
    guard += 1;
    if (guard > count * 20) {
      throw new Error("Failed to generate unique AppSumo codes");
    }
  }
  return [...codes];
}

export function safeEqualHex(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
