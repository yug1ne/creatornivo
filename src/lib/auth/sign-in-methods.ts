/**
 * Pure helpers for user-facing sign-in method labels (Settings profile).
 * Does not change auth behavior — display only.
 */

export type SignInMethodSource = {
  /** True when the user has a local password hash. */
  hasPassword: boolean;
  /** OAuth provider ids from Account.provider (e.g. "google"). */
  oauthProviders: string[];
};

/** Friendly labels for known providers; unknown ids are title-cased safely. */
export function labelForAuthProvider(provider: string): string | null {
  const id = provider.trim().toLowerCase();
  if (!id || id === "credentials") return null;

  switch (id) {
    case "google":
      return "Google";
    case "github":
      return "GitHub";
    default: {
      if (!/^[a-z0-9_-]{1,32}$/.test(id)) return null;
      return id.charAt(0).toUpperCase() + id.slice(1);
    }
  }
}

/**
 * Build a short, non-technical sign-in summary for Settings.
 * Example: "Email and password, Google"
 */
export function formatSignInMethods(source: SignInMethodSource): string {
  const labels: string[] = [];

  if (source.hasPassword) {
    labels.push("Email and password");
  }

  const seen = new Set<string>();
  for (const provider of source.oauthProviders) {
    const label = labelForAuthProvider(provider);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }

  if (labels.length === 0) {
    return "Not available";
  }

  return labels.join(", ");
}
