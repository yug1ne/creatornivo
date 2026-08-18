const DEFAULT_CALLBACK = "/dashboard";
const EMPTY_FALLBACK = "";
const SAFE_ORIGIN = "https://creatornivo.invalid";

function isLocalRelativePath(pathname: string): boolean {
  return pathname.startsWith("/") && !pathname.startsWith("//");
}

/**
 * Restrict callbackUrl to a same-origin relative path + query.
 * Rejects absolute URLs, protocol-relative URLs, javascript:, and strips hashes.
 */
export function getSafeCallbackUrl(
  value: string | null | undefined,
  fallback = DEFAULT_CALLBACK,
): string {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes("\\") ||
    /[\u0000-\u001F\u007F]/.test(trimmed)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(trimmed, SAFE_ORIGIN);
    if (parsed.origin !== SAFE_ORIGIN || parsed.protocol !== "https:") {
      return fallback;
    }
    if (parsed.username || parsed.password) {
      return fallback;
    }
    if (!isLocalRelativePath(parsed.pathname)) {
      return fallback;
    }

    let decodedPath = parsed.pathname;
    try {
      decodedPath = decodeURIComponent(parsed.pathname);
    } catch {
      return fallback;
    }
    if (!isLocalRelativePath(decodedPath)) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return fallback;
  }
}

/** Safe callback when one was explicitly provided; otherwise null. */
export function getOptionalSafeCallbackUrl(
  value: string | null | undefined,
): string | null {
  const safe = getSafeCallbackUrl(value, EMPTY_FALLBACK);
  return safe || null;
}

/** pathname + search only. Hash is never included. */
export function getSafeCallbackFromLocation(
  pathname: string,
  search = "",
): string {
  const query =
    search && !search.startsWith("?") && search.length > 0
      ? `?${search}`
      : search;
  return getSafeCallbackUrl(
    `${pathname}${query}`,
    getSafeCallbackUrl(pathname),
  );
}

export function getAuthPageHref(
  dest: "login" | "register",
  rawCallback?: string | null,
): string {
  const path = dest === "login" ? "/login" : "/register";
  const safe = getOptionalSafeCallbackUrl(rawCallback);
  if (!safe) {
    return path;
  }
  return `${path}?callbackUrl=${encodeURIComponent(safe)}`;
}
