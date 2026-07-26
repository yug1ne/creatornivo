import { NextResponse } from "next/server";

import { getFreemiusEnvSnapshot } from "@/config/freemius";
import {
  parseFreemiusWebhookEvent,
  processFreemiusWebhookEvent,
} from "@/lib/freemius/subscription-service";
import {
  extractWebhookTokenFromRequest,
  verifyFreemiusWebhookSignature,
  verifyFreemiusWebhookToken,
} from "@/lib/freemius/webhook-verify";

/**
 * Freemius webhook receiver (Phase 2).
 * - Query/header token: FREEMIUS_WEBHOOK_SECRET_TOKEN
 * - Header x-signature: HMAC-SHA256(rawBody, FREEMIUS_SECRET_KEY)
 * - Idempotent via FreemiusWebhookEvent
 * Does not enable checkout.
 */
export async function POST(request: Request) {
  const env = getFreemiusEnvSnapshot();

  if (!env.secretKey || !env.webhookSecretToken) {
    console.error("[freemius-webhook] missing secret configuration");
    return NextResponse.json(
      { error: "Missing webhook configuration", code: "webhook_not_configured" },
      { status: 503 },
    );
  }

  const providedToken = extractWebhookTokenFromRequest(request);
  if (!verifyFreemiusWebhookToken(providedToken, env.webhookSecretToken)) {
    return NextResponse.json(
      { error: "Invalid webhook token", code: "invalid_token" },
      { status: 401 },
    );
  }

  // Raw body first — never JSON.parse before signature verification.
  const rawBody = await request.text();
  const signature =
    request.headers.get("x-signature") ??
    request.headers.get("X-Signature");

  if (
    !verifyFreemiusWebhookSignature(rawBody, signature, env.secretKey)
  ) {
    return NextResponse.json(
      { error: "Invalid signature", code: "invalid_signature" },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid payload", code: "invalid_payload" },
      { status: 400 },
    );
  }

  const event = parseFreemiusWebhookEvent(payload);
  if (!event) {
    return NextResponse.json(
      { error: "Invalid payload", code: "invalid_payload" },
      { status: 400 },
    );
  }

  try {
    const result = await processFreemiusWebhookEvent(event);
    return NextResponse.json({ received: true, result });
  } catch (error) {
    console.error("[freemius-webhook] handler failed", error);
    return NextResponse.json(
      { error: "Webhook handler failed", code: "handler_failed" },
      { status: 500 },
    );
  }
}
