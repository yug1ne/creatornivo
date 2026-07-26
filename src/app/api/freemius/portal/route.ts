import { NextResponse } from "next/server";

import { getFreemiusConfigStatus } from "@/config/freemius";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  buildFreemiusCustomerPortalUrl,
  FreemiusCheckoutError,
} from "@/lib/freemius/checkout-service";

/**
 * Freemius customer portal link (Phase 3).
 * Only for users with provider === freemius and linked Freemius ids.
 * Does not fall back to Paddle/Stripe.
 */
async function handlePortal() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 },
    );
  }

  const config = getFreemiusConfigStatus();
  if (!config.portalFoundationReady) {
    return NextResponse.json(
      {
        error: "Freemius customer portal is not configured.",
        code: "portal_not_configured",
      },
      { status: 503 },
    );
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.id },
    select: {
      provider: true,
      freemiusUserId: true,
      freemiusLicenseId: true,
      freemiusSubscriptionId: true,
      status: true,
    },
  });

  if (!subscription || subscription.provider !== "freemius") {
    return NextResponse.json(
      {
        error: "No Freemius subscription found for this account.",
        code: "freemius_subscription_not_found",
      },
      { status: 404 },
    );
  }

  if (
    !subscription.freemiusUserId &&
    !subscription.freemiusLicenseId &&
    !subscription.freemiusSubscriptionId
  ) {
    return NextResponse.json(
      {
        error: "Freemius subscription is missing provider identifiers.",
        code: "freemius_ids_missing",
      },
      { status: 404 },
    );
  }

  try {
    const portalUrl = buildFreemiusCustomerPortalUrl({
      email: session.email,
      freemiusUserId: subscription.freemiusUserId,
    });

    return NextResponse.json({
      portalUrl,
      provider: "freemius" as const,
      status: subscription.status,
    });
  } catch (error) {
    if (error instanceof FreemiusCheckoutError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error("[freemius-portal] failed", error);
    return NextResponse.json(
      { error: "Failed to open Freemius portal", code: "portal_failed" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return handlePortal();
}

export async function POST() {
  return handlePortal();
}
