import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { completeOnboarding } from "@/lib/onboarding/service";

export async function POST() {
  try {
    const session = await requireSession();
    await completeOnboarding(session.id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}