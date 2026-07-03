import { NextResponse } from "next/server";

import { getActiveBillingProvider } from "@/config/billing";
import { paddleConfig } from "@/config/paddle";
import {
  getPaddleServerCheckoutConfig,
  isPaddleServerCheckoutConfigured,
} from "@/config/paddle";
import { requireSession } from "@/lib/auth/session";
import { resolveCheckoutPriceId } from "@/lib/billing/checkout-price";
import { prisma } from "@/lib/db";
import {
  createServerPaddleCheckout,
  PaddleCheckoutError,
} from "@/lib/paddle/checkout-service";

interface CheckoutUserState {
  plan: string;
  subscription: {
    provider: string;
    status: string;
    paddleStatus: string | null;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
  } | null;
}

export function getPaddleCheckoutBlock(
  user: CheckoutUserState,
  now = new Date(),
):
  | {
      code: "subscription_already_active" | "subscription_requires_action";
      message: string;
    }
  | null {
  const subscription = user.subscription;
  if (!subscription || subscription.provider !== "paddle") return null;

  if (
    subscription.status === "past_due" ||
    subscription.paddleStatus === "paused"
  ) {
    return {
      code: "subscription_requires_action",
      message:
        "Your existing subscription requires attention. Manage it in the Customer Portal.",
    };
  }

  const paidPeriodIsActive =
    subscription.currentPeriodEnd !== null &&
    subscription.currentPeriodEnd > now;
  if (
    subscription.status === "active" ||
    subscription.status === "trialing" ||
    (subscription.cancelAtPeriodEnd && paidPeriodIsActive) ||
    (user.plan === "pro" && paidPeriodIsActive)
  ) {
    return {
      code: "subscription_already_active",
      message: "You already have an active Pro subscription.",
    };
  }

  return null;
}

export async function POST() {
  let session;

  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (getActiveBillingProvider() !== "paddle") {
      return NextResponse.json(
        {
          error: "Paddle is not configured. Contact the administrator.",
          code: "billing_not_configured",
        },
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

    const checkoutBlock = getPaddleCheckoutBlock(user);
    if (checkoutBlock) {
      return NextResponse.json(
        {
          error: checkoutBlock.message,
          code: checkoutBlock.code,
          portalUrl: "/settings",
        },
        { status: 409 },
      );
    }

    const priceId = await resolveCheckoutPriceId("paddle");
    const config = getPaddleServerCheckoutConfig();

    if (!isPaddleServerCheckoutConfigured(priceId, config)) {
      return NextResponse.json(
        {
          error: "Billing is temporarily unavailable.",
          code: "billing_not_configured",
        },
        { status: 503 },
      );
    }

    const { transactionId } = await createServerPaddleCheckout({
      userId: user.id,
      priceId,
    });

    return NextResponse.json({
      transactionId,
      clientToken: paddleConfig.clientToken,
      environment: paddleConfig.environment,
    });
  } catch (error) {
    if (error instanceof PaddleCheckoutError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error("Paddle checkout creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create checkout." },
      { status: 502 },
    );
  }
}
