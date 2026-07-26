import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verifies Freemius webhook `x-signature` header.
 * HMAC-SHA256 of raw body using product secret key, hex digest.
 * @see https://freemius.com/help/documentation/saas/events-webhooks/
 */
export function verifyFreemiusWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secretKey: string,
): boolean {
  if (!signatureHeader || !secretKey) return false;

  const expected = createHmac("sha256", secretKey)
    .update(rawBody, "utf8")
    .digest("hex");
  const received = signatureHeader.trim();

  try {
    const expectedBuf = Buffer.from(expected, "hex");
    const receivedBuf = Buffer.from(received, "hex");
    if (expectedBuf.length !== receivedBuf.length || expectedBuf.length === 0) {
      return false;
    }
    return timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}

/**
 * Compares webhook URL/query token to FREEMIUS_WEBHOOK_SECRET_TOKEN.
 * Uses timing-safe compare on UTF-8 bytes when lengths match.
 */
export function verifyFreemiusWebhookToken(
  providedToken: string | null | undefined,
  expectedToken: string,
): boolean {
  if (!providedToken || !expectedToken) return false;

  const provided = providedToken.trim();
  const expected = expectedToken.trim();
  if (!provided || !expected) return false;

  try {
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function extractWebhookTokenFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  const fromQuery =
    url.searchParams.get("token") ?? url.searchParams.get("secret");
  if (fromQuery?.trim()) return fromQuery.trim();

  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const bearer = auth.slice(7).trim();
    if (bearer) return bearer;
  }

  const headerToken =
    request.headers.get("x-freemius-webhook-token") ??
    request.headers.get("x-webhook-token");
  return headerToken?.trim() || null;
}
