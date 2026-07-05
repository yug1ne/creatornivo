const CLIENT_IP_HEADERS = [
  "x-vercel-forwarded-for",
  "x-forwarded-for",
  "x-real-ip",
] as const;

function normalizeIp(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("[")) {
    const end = trimmed.indexOf("]");
    if (end > 0) {
      return trimmed.slice(1, end);
    }
  }

  const withoutPort = trimmed.includes(":") && trimmed.includes(".")
    ? trimmed.split(":")[0]
    : trimmed;

  if (/^[\da-f:.]+$/i.test(withoutPort)) {
    return withoutPort;
  }

  return null;
}

export function getClientIp(request: Request): string | null {
  for (const header of CLIENT_IP_HEADERS) {
    const raw = request.headers.get(header);
    if (!raw) continue;

    const first = raw.split(",")[0]?.trim();
    if (!first) continue;

    const ip = normalizeIp(first);
    if (ip) return ip;
  }

  return null;
}

export function getRateLimitClientKey(request: Request): string {
  return getClientIp(request) ?? "unknown-ip";
}