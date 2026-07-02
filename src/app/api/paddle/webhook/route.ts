import { NextResponse } from "next/server";

import {
  downgradeUserToFree,
  syncSubscriptionFromPaddle,
  type PaddleSubscriptionPayload,
} from "@/lib/paddle/subscription-service";
import { verifyPaddleWebhookSignature } from "@/lib/paddle/webhook-verify";
import { prisma } from "@/lib/db";

interface PaddleWebhookEvent {
  event_type: string;
  data: PaddleSubscriptionPayload;
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

  let event: PaddleWebhookEvent;

  try {
    event = JSON.parse(body) as PaddleWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    switch (event.event_type) {
      case "subscription.created":
      case "subscription.activated":
      case "subscription.updated":
      case "subscription.trialing":
      case "subscription.past_due":
      case "subscription.resumed": {
        await syncSubscriptionFromPaddle(
          event.data,
          event.data.custom_data?.userId,
        );
        break;
      }

      case "subscription.canceled": {
        const userId = event.data.custom_data?.userId;

        if (userId) {
          await downgradeUserToFree(userId);
        } else {
          const record = await prisma.subscription.findUnique({
            where: { paddleCustomerId: event.data.customer_id },
          });

          if (record) {
            await downgradeUserToFree(record.userId);
          }
        }
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error("Paddle webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}