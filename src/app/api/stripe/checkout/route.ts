import { NextResponse } from "next/server";

import { siteConfig } from "@/config/site";
import { stripeConfig } from "@/config/stripe";
import { requireSession } from "@/lib/auth/session";
import { resolveCheckoutPriceId } from "@/lib/billing/checkout-price";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe/client";
import { getOrCreateStripeCustomer } from "@/lib/stripe/subscription-service";

export async function POST() {
  try {
    const session = await requireSession();

    if (!process.env.STRIPE_SECRET_KEY || !stripeConfig.proPriceId) {
      return NextResponse.json(
        { error: "Stripe is not configured. Contact the administrator." },
        { status: 503 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.plan === "pro" && user.subscription?.status === "active") {
      return NextResponse.json(
        { error: "You already have an active Pro subscription" },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    const customerId = await getOrCreateStripeCustomer(
      user.id,
      user.email,
      user.name,
    );

    const priceId = await resolveCheckoutPriceId("stripe");

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${siteConfig.url}/settings?checkout=success`,
      cancel_url: `${siteConfig.url}/pricing?checkout=canceled`,
      metadata: {
        userId: user.id,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
        },
      },
      allow_promotion_codes: true,
    });

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}