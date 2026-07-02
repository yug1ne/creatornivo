import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe/client";
import {
  downgradeUserToFree,
  syncSubscriptionFromStripe,
} from "@/lib/stripe/subscription-service";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing webhook configuration" },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;

        if (
          checkoutSession.mode === "subscription" &&
          checkoutSession.subscription
        ) {
          const subscriptionId =
            typeof checkoutSession.subscription === "string"
              ? checkoutSession.subscription
              : checkoutSession.subscription.id;

          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId);

          await syncSubscriptionFromStripe(
            subscription,
            checkoutSession.metadata?.userId,
          );
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionFromStripe(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.userId;

        if (userId) {
          await downgradeUserToFree(userId);
        } else {
          const customerId =
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer.id;

          const record = await prisma.subscription.findUnique({
            where: { stripeCustomerId: customerId },
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
    console.error("Stripe webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}