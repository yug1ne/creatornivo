import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getGenerationUsage } from "@/lib/generation/usage-service";

export async function GET() {
  let session;

  try {
    session = await requireSession();
  } catch {
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

    const usage = await getGenerationUsage(session.id, user.plan);

    return NextResponse.json(
      {
        generationsUsed: usage.used,
        generationLimit: usage.limit,
        generationPeriod: usage.period,
        periodKey: usage.periodKey,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to load generation usage." },
      { status: 500 },
    );
  }
}
