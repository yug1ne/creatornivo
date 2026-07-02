import { NextResponse } from "next/server";

import { siteConfig } from "@/config/site";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe/client";

export async function POST() {
  try {
    const session = await requireSession();

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 503 },
      );
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.id },
    });

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    const stripe = getStripe();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${siteConfig.url}/settings`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}