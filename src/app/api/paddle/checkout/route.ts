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
import { PaddleApiError } from "@/lib/paddle/client";

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

export function maskPaddlePriceId(priceId: string | null): string {
  if (!priceId) return "missing";
  return `${priceId.slice(0, 4)}…${priceId.slice(-4)}`;
}

export async function POST() {
  let session;
  let selectedPriceId: string | null = null;
  let stage = "session";

  try {
    session = await requireSession();
  } catch {
    console.warn("Paddle checkout rejected", {
      stage,
      sessionPresent: false,
    });
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 },
    );
  }

  try {
    stage = "configuration";
    if (getActiveBillingProvider() !== "paddle") {
      return NextResponse.json(
        {
          error: "Paddle is not configured. Contact the administrator.",
          code: "billing_not_configured",
        },
        { status: 503 },
      );
    }

    stage = "user_lookup";
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

    stage = "price_selection";
    const priceId = await resolveCheckoutPriceId("paddle");
    selectedPriceId = priceId;
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

    stage = "transaction_creation";
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
    const paddleError = error instanceof PaddleApiError ? error : null;
    console.error("Paddle checkout creation failed", {
      stage,
      sessionPresent: true,
      environment: paddleConfig.environment,
      priceId: maskPaddlePriceId(selectedPriceId),
      paddleHttpStatus: paddleError?.status ?? null,
      paddleErrorCode: paddleError?.code ?? null,
    });
    if (paddleError?.status === 403) {
      return NextResponse.json(
        {
          error: "Billing permissions are temporarily unavailable.",
          code: "paddle_forbidden",
        },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create checkout.", code: "checkout_failed" },
      { status: 502 },
    );
  }
}
