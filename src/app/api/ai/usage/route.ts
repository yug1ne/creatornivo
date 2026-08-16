import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin/is-admin-session";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { UsageError } from "@/lib/usage";
import { countActiveAppSumoRedemptions } from "@/lib/appsumo/entitlement";
import {
  getEffectiveUsageSnapshot,
  resolveUserAccess,
} from "@/lib/trial/access";

/** Returns UserUsage-backed quota for the authenticated user. */
export async function GET() {
  let session;

  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        plan: true,
        emailVerified: true,
        trialStartedAt: true,
        trialEndsAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = resolveUserAccess(user, {
      isAdmin: isAdminSession(session),
      activeAppSumoCodeCount: await countActiveAppSumoRedemptions(session.id),
    });
    const snapshot = await getEffectiveUsageSnapshot(session.id, access);

    return NextResponse.json(
      {
        plan: snapshot.plan,
        remaining: snapshot.remaining,
        limit: snapshot.limit,
        period: snapshot.period,
        resetAt: snapshot.resetAt,
        used: snapshot.used,
        quotaBasis: snapshot.quotaBasis,
        accessMode: snapshot.accessMode,
        trialEndsAt: snapshot.trialEndsAt,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof UsageError && error.code === "stale_session") {
      return NextResponse.json(
        { error: "Unauthorized", code: "stale_session" },
        { status: 401 },
      );
    }

    if (error instanceof UsageError) {
      console.error("Failed to load UserUsage snapshot:", error);
    }

    return NextResponse.json(
      { error: "Failed to load generation usage." },
      { status: 500 },
    );
  }
}
