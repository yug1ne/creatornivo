import { NextResponse } from "next/server";

import {
  isPaddleSubscriptionEventType,
  processPaddleWebhookEvent,
  type PaddleSubscriptionPayload,
  type PaddleWebhookEventInput,
} from "@/lib/paddle/subscription-service";
import { verifyPaddleWebhookSignature } from "@/lib/paddle/webhook-verify";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidDateString(value: unknown): value is string {
  return (
    isNonEmptyString(value) &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) &&
    !Number.isNaN(Date.parse(value))
  );
}

function isValidSubscriptionPayload(
  value: Record<string, unknown>,
): value is Record<string, unknown> & PaddleSubscriptionPayload {
  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.status) ||
    !isNonEmptyString(value.customer_id)
  ) {
    return false;
  }

  if (
    value.custom_data !== undefined &&
    value.custom_data !== null &&
    (!isRecord(value.custom_data) ||
      (value.custom_data.userId !== undefined &&
        !isNonEmptyString(value.custom_data.userId)))
  ) {
    return false;
  }

  if (value.current_billing_period !== undefined) {
    if (
      value.current_billing_period !== null &&
      (!isRecord(value.current_billing_period) ||
        (value.current_billing_period.ends_at !== undefined &&
          !isValidDateString(value.current_billing_period.ends_at)))
    ) {
      return false;
    }
  }

  if (
    value.scheduled_change !== undefined &&
    value.scheduled_change !== null &&
    (!isRecord(value.scheduled_change) ||
      (value.scheduled_change.action !== undefined &&
        typeof value.scheduled_change.action !== "string"))
  ) {
    return false;
  }

  if (value.items !== undefined) {
    if (!Array.isArray(value.items)) {
      return false;
    }

    for (const item of value.items) {
      if (
        !isRecord(item) ||
        (item.price !== undefined &&
          (!isRecord(item.price) ||
            (item.price.id !== undefined &&
              !isNonEmptyString(item.price.id))))
      ) {
        return false;
      }
    }
  }

  return true;
}

export function parsePaddleWebhookEvent(
  value: unknown,
): PaddleWebhookEventInput | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.event_id) ||
    !isNonEmptyString(value.event_type) ||
    !isValidDateString(value.occurred_at) ||
    !isRecord(value.data)
  ) {
    return null;
  }

  if (
    isPaddleSubscriptionEventType(value.event_type) &&
    !isValidSubscriptionPayload(value.data)
  ) {
    return null;
  }

  return {
    eventId: value.event_id,
    eventType: value.event_type,
    occurredAt: new Date(value.occurred_at),
    data: value.data,
  };
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("paddle-signature");
  const secret = process.env.PADDLE_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Missing webhook configuration" },
      { status: 400 },
    );
  }

  if (!verifyPaddleWebhookSignature(body, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: unknown;

  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const event = parsePaddleWebhookEvent(payload);

  if (!event) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const result = await processPaddleWebhookEvent(event);
    return NextResponse.json({ received: true, result });
  } catch (error) {
    console.error("Paddle webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}
