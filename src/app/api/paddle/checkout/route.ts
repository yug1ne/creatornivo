import { NextResponse } from "next/server";

import { getActiveBillingProvider } from "@/config/billing";
import { paddleConfig } from "@/config/paddle";
import { siteConfig } from "@/config/site";
import { requireSession } from "@/lib/auth/session";
import { resolveCheckoutPriceId } from "@/lib/billing/checkout-price";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await requireSession();

    if (getActiveBillingProvider() !== "paddle") {
      return NextResponse.json(
        { error: "Paddle is not configured. Contact the administrator." },
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

    const priceId = await resolveCheckoutPriceId("paddle");

    return NextResponse.json({
      clientToken: paddleConfig.clientToken,
      environment: paddleConfig.environment,
      priceId,
      userId: user.id,
      email: user.email,
      successUrl: `${siteConfig.url}/settings?checkout=success`,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}