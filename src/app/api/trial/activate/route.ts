import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TRIAL_INVITE_COOKIE_NAME } from "@/config/trial";
import { requireSession } from "@/lib/auth/session";
import { claimOrActivateTrial } from "@/lib/trial/invites";

export async function POST() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(TRIAL_INVITE_COOKIE_NAME)?.value ?? null;
  const result = await claimOrActivateTrial({
    userId: session.id,
    token,
  });

  cookieStore.delete(TRIAL_INVITE_COOKIE_NAME);

  const okStatuses = new Set([
    "activated",
    "already_active",
    "pending_verification",
    "paid_pro",
  ]);

  return NextResponse.json(
    {
      status: result.status,
      trialStartedAt: result.trialStartedAt?.toISOString(),
      trialEndsAt: result.trialEndsAt?.toISOString(),
      ...(!okStatuses.has(result.status)
        ? { error: "This invitation cannot be activated." }
        : {}),
    },
    {
      status: okStatuses.has(result.status) ? 200 : 409,
      headers: {
        "Cache-Control": "no-store, private",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    },
  );
}
