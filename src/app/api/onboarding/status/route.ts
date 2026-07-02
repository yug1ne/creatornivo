import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { isOnboardingCompleted } from "@/lib/onboarding/service";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const completed = await isOnboardingCompleted(session.id);

  return NextResponse.json({ completed });
}