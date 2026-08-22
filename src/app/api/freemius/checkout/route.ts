import { NextResponse } from "next/server";

import { resolveFreemiusCheckoutAccess } from "@/config/freemius";
import { isAdminSession } from "@/lib/admin/is-admin-session";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  createFreemiusCheckoutSession,
  FreemiusCheckoutError,
  getFreemiusCheckoutBlock,
  hasPreviousFreemiusPurchase,
  parseFreemiusCheckoutInterval,
  resolveFreemiusFoundingCoupon,
} from "@/lib/freemius/checkout-service";

async function loadCheckoutUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      role: true,
      subscription: {
        select: {
          provider: true,
          status: true,
          cancelAtPeriodEnd: true,
          currentPeriodEnd: true,
          freemiusUserId: true,
          freemiusLicenseId: true,
          freemiusSubscriptionId: true,
        },
      },
    },
  });

  if (!user) return null;

  const completedCheckoutIntentCount =
    await prisma.freemiusCheckoutIntent.count({
      where: { userId: user.id, status: "completed" },
    });

  return {
    user,
    hasPreviousPurchase: hasPreviousFreemiusPurchase({
      subscription: user.subscription,
      completedCheckoutIntentCount,
    }),
  };
}

function adminCheckoutForbiddenResponse() {
  return NextResponse.json(
    {
      error: "Admin accounts cannot purchase or upgrade to Pro.",
      code: "admin_checkout_forbidden",
    },
    { status: 403 },
  );
}

/** Read-only UI eligibility; POST independently re-checks every condition. */
export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 },
    );
  }

  const context = await loadCheckoutUser(session.id);
  if (!context) {
    return NextResponse.json(
      { error: "User not found", code: "user_not_found" },
      { status: 404 },
    );
  }

  const isAdmin = isAdminSession(context.user);
  const accessMode = resolveFreemiusCheckoutAccess({
    email: context.user.email,
    isAdmin,
  });
  const block = getFreemiusCheckoutBlock(context.user);
  const canCheckout = Boolean(accessMode && !isAdmin && !block);
  const foundingEligible =
    canCheckout &&
    resolveFreemiusFoundingCoupon({
      interval: "monthly",
      foundingRequested: true,
      hasPreviousPurchase: context.hasPreviousPurchase,
    }) !== null;

  return NextResponse.json({
    canCheckout,
    foundingEligible,
    reason: isAdmin
      ? "admin_checkout_forbidden"
      : block?.code ?? (!accessMode ? "checkout_disabled" : null),
  });
}

/**
 * Freemius checkout session creator (Phase 3 + Phase 4 restricted testing).
 * - Public: PUBLIC_CHECKOUT_ENABLED must be exactly "true"
 * - Restricted (Phase 4): FREEMIUS_RESTRICTED_CHECKOUT_ENABLED + allowlisted email
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

  if (isAdminSession(session)) {
    return adminCheckoutForbiddenResponse();
  }

  const isAdmin = false;
  const accessMode = resolveFreemiusCheckoutAccess({
    email: session.email,
    isAdmin,
  });

  // Fail closed before reading body / creating intent when disabled.
  if (!accessMode) {
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

  const foundingRequested = record.founding === true;

  try {
    const context = await loadCheckoutUser(session.id);
    const user = context?.user ?? null;

    if (!user || !context) {
      return NextResponse.json(
        { error: "User not found", code: "user_not_found" },
        { status: 404 },
      );
    }

    const currentIsAdmin = isAdminSession(user);
    if (currentIsAdmin) {
      return adminCheckoutForbiddenResponse();
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
      foundingRequested,
      hasPreviousPurchase: context.hasPreviousPurchase,
      isAdmin: currentIsAdmin,
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
      foundingApplied: sessionResult.foundingApplied,
      mode: sessionResult.mode,
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
