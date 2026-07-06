import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getUserUsageSnapshot, UsageError } from "@/lib/usage";

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
      select: { plan: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const snapshot = await getUserUsageSnapshot(session.id, user.plan);

    return NextResponse.json(
      {
        plan: snapshot.plan,
        remaining: snapshot.remaining,
        limit: snapshot.limit,
        period: snapshot.period,
        resetAt: snapshot.resetAt,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof UsageError) {
      console.error("Failed to load UserUsage snapshot:", error);
    }

    return NextResponse.json(
      { error: "Failed to load generation usage." },
      { status: 500 },
    );
  }
}