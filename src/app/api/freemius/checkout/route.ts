import { NextResponse } from "next/server";

import { isPublicCheckoutEnabled } from "@/config/freemius";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  createFreemiusCheckoutSession,
  FreemiusCheckoutError,
  normalizeOptionalCoupon,
  parseFreemiusCheckoutInterval,
} from "@/lib/freemius/checkout-service";

/**
 * Freemius checkout session creator (Phase 3).
 * - Kill-switch: PUBLIC_CHECKOUT_ENABLED must be exactly "true"
 * - Never grants Pro (webhooks only)
 * - Does not assign billing periods
 */
export async function POST(request: Request) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 },
    );
  }

  // Fail closed before reading body / touching Freemius when disabled.
  if (!isPublicCheckoutEnabled()) {
    return NextResponse.json(
      {
        error: "Public Freemius checkout is disabled.",
        code: "checkout_disabled",
      },
      { status: 403 },
    );
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const record =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  const interval = parseFreemiusCheckoutInterval(record.interval);
  if (!interval) {
    return NextResponse.json(
      {
        error: 'Interval must be "monthly" or "annual".',
        code: "invalid_interval",
      },
      { status: 400 },
    );
  }

  const coupon = normalizeOptionalCoupon(record.coupon);

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        subscription: {
          select: {
            provider: true,
            status: true,
            cancelAtPeriodEnd: true,
            currentPeriodEnd: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "user_not_found" },
        { status: 404 },
      );
    }

    // Snapshot plan before checkout; never mutate plan here.
    const planBefore = user.plan;

    const sessionResult = await createFreemiusCheckoutSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      subscription: user.subscription,
      interval,
      coupon,
    });

    const planAfter = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true },
    });

    if (planAfter && planAfter.plan !== planBefore) {
      // Defensive: checkout path must never change plan.
      console.error("[freemius-checkout] unexpected plan mutation", {
        userId: user.id,
        planBefore,
        planAfter: planAfter.plan,
      });
    }

    return NextResponse.json({
      checkoutUrl: sessionResult.checkoutUrl,
      intentId: sessionResult.intentId,
      interval: sessionResult.interval,
      billingCycle: sessionResult.billingCycle,
      // pricingId is non-secret allowlisted id; useful for support/debug
      pricingId: sessionResult.pricingId,
    });
  } catch (error) {
    if (error instanceof FreemiusCheckoutError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error("[freemius-checkout] failed", error);
    return NextResponse.json(
      { error: "Checkout failed", code: "checkout_failed" },
      { status: 500 },
    );
  }
}
