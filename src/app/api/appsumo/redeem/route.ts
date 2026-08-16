import { NextResponse } from "next/server";

import {
  isEmailVerified,
} from "@/lib/auth/email-verification";
import {
  AuthRateLimitError,
  AuthRateLimitUnavailableError,
  checkAuthRateLimits,
} from "@/lib/auth/rate-limit";
import { getRateLimitClientKey } from "@/lib/auth/request";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { redeemAppSumoCode } from "@/lib/appsumo/redeem";

export async function POST(request: Request) {
  const session = await getSession();
  const ipKey = getRateLimitClientKey(request);

  try {
    await checkAuthRateLimits({
      action: "appsumo_redeem",
      ipKey,
      email: session?.email,
    });
  } catch (error) {
    if (error instanceof AuthRateLimitUnavailableError) {
      return NextResponse.json(
        { error: error.message, code: "rate_limit_unavailable" },
        { status: 503 },
      );
    }
    if (error instanceof AuthRateLimitError) {
      return NextResponse.json(
        { error: error.message, code: "rate_limited" },
        { status: 429 },
      );
    }
    throw error;
  }

  if (!session) {
    return NextResponse.json(
      { error: "Sign in to redeem an AppSumo code.", code: "unauthenticated" },
      { status: 401 },
    );
  }

  let rawCode: unknown;
  try {
    const body = (await request.json()) as { code?: unknown };
    rawCode = body.code;
  } catch {
    return NextResponse.json(
      { error: "This code is unavailable or has already been redeemed." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { emailVerified: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to redeem an AppSumo code.", code: "unauthenticated" },
      { status: 401 },
    );
  }

  const result = await redeemAppSumoCode({
    userId: session.id,
    emailVerified: isEmailVerified(user.emailVerified),
    rawCode,
  });

  const status =
    result.status === "tier1_active" || result.status === "tier2_active"
      ? 200
      : result.status === "already_owned"
        ? 200
        : result.status === "unverified"
          ? 403
          : result.status === "max_codes"
            ? 409
            : result.status === "misconfigured"
              ? 503
              : 400;

  return NextResponse.json(
    {
      status: result.status,
      message: result.message,
      activeCodeCount: result.activeCodeCount ?? null,
    },
    { status },
  );
}
