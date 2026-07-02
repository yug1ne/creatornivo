import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { paddleApiFetch } from "@/lib/paddle/client";
import { prisma } from "@/lib/db";

interface PaddleSubscriptionResponse {
  data: {
    management_urls?: {
      update_payment_method?: string;
      cancel?: string;
    };
  };
}

export async function POST() {
  try {
    const session = await requireSession();

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.id },
      select: {
        paddleSubscriptionId: true,
        provider: true,
      },
    });

    if (
      !subscription?.paddleSubscriptionId ||
      subscription.provider !== "paddle"
    ) {
      return NextResponse.json(
        { error: "Paddle subscription not found" },
        { status: 404 },
      );
    }

    const response = await paddleApiFetch<PaddleSubscriptionResponse>(
      `/subscriptions/${subscription.paddleSubscriptionId}`,
    );

    const portalUrl =
      response.data.management_urls?.update_payment_method ??
      response.data.management_urls?.cancel;

    if (!portalUrl) {
      return NextResponse.json(
        { error: "Subscription management link unavailable" },
        { status: 503 },
      );
    }

    return NextResponse.json({ url: portalUrl });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to open billing portal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}