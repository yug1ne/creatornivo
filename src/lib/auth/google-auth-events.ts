import type { GoogleProfileLike } from "@/lib/auth/google";
import { shouldSetEmailVerifiedFromGoogle } from "@/lib/auth/google";

/**
 * Pure decision: whether a successful Google sign-in should update emailVerified.
 * Kept separate from Prisma for unit tests.
 */
export function shouldMarkEmailVerifiedOnGoogleSignIn(input: {
  provider: string | null | undefined;
  profile: GoogleProfileLike | null | undefined;
}): boolean {
  if (input.provider !== "google") return false;
  return shouldSetEmailVerifiedFromGoogle(input.profile);
}

/**
 * Pure decision: welcome email should run only for newly created users
 * (OAuth path via Auth.js createUser event). Credentials register already
 * sends welcome via /api/auth/register.
 */
export function shouldSendWelcomeOnCreateUser(input: {
  userId: string | null | undefined;
  email: string | null | undefined;
}): boolean {
  return Boolean(input.userId && input.email);
}
