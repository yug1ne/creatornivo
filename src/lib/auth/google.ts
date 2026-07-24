/**
 * Google OAuth policy helpers (pure / env-gated).
 * Keep Auth.js wiring in src/auth.ts; keep this module free of NextAuth imports
 * so unit tests stay lightweight.
 */

export type GoogleProfileLike = {
  email?: string | null;
  email_verified?: boolean | null;
};

export function isNonEmptyEnv(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** True when both Google OAuth credentials are configured (server env only). */
export function isGoogleAuthConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    isNonEmptyEnv(env.AUTH_GOOGLE_ID) && isNonEmptyEnv(env.AUTH_GOOGLE_SECRET)
  );
}

/**
 * Google sign-in is allowed only when the IdP reports a verified email.
 * Unverified emails are rejected to prevent account takeover.
 */
export function isGoogleSignInAllowed(profile: GoogleProfileLike | null | undefined): boolean {
  if (!profile) return false;
  const email =
    typeof profile.email === "string" ? profile.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) return false;
  return profile.email_verified === true;
}

/**
 * Whether we should stamp User.emailVerified from a successful Google sign-in.
 * Only when Google asserts email_verified.
 */
export function shouldSetEmailVerifiedFromGoogle(
  profile: GoogleProfileLike | null | undefined,
): boolean {
  return isGoogleSignInAllowed(profile);
}

/**
 * Calm client-facing messages for Auth.js error query params on /login.
 * Does not reveal whether an account exists or which providers are linked.
 */
export function getOAuthErrorMessage(
  error: string | null | undefined,
): string | null {
  if (!error) return null;

  switch (error) {
    case "OAuthAccountNotLinked":
      return "This email is already used with another sign-in method. Sign in with email and password first, then try Google again.";
    case "AccessDenied":
      return "Google sign-in was not completed. You can try again or use email and password.";
    case "OAuthCallback":
    case "OAuthCallbackError":
    case "OAuthSignin":
    case "OAuthCreateAccount":
    case "Callback":
      return "Google sign-in could not be completed. Please try again or use email and password.";
    case "Configuration":
      return "Google sign-in is temporarily unavailable. Please use email and password.";
    default:
      return "Sign-in failed. Please try again or use email and password.";
  }
}
