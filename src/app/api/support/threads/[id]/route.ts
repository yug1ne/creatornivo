import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import {
  getUserSupportThreadDetail,
  SupportAccessError,
} from "@/lib/support/service";
import { prismaSupportStore } from "@/lib/support/store";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const thread = await getUserSupportThreadDetail(
      { userId: session.id, threadId: id },
      prismaSupportStore,
    );
    return NextResponse.json({ thread });
  } catch (error) {
    if (error instanceof SupportAccessError && error.code === "not_found") {
      // Same response whether missing or owned by someone else.
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    console.error("[support] get thread failed");
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
