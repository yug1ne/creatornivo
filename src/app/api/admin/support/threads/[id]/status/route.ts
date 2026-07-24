import { NextResponse } from "next/server";

import {
  adminAccessErrorResponse,
  requireAdmin,
} from "@/lib/admin/guards";
import { getSession } from "@/lib/auth/session";
import {
  adminCloseSupportThread,
  adminReopenSupportThread,
  SupportAccessError,
} from "@/lib/support/service";
import { prismaSupportStore } from "@/lib/support/store";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    requireAdmin(await getSession());
  } catch (error) {
    const access = adminAccessErrorResponse(error);
    if (access) {
      return NextResponse.json(access.body, { status: access.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
    };
    const action =
      typeof body.action === "string" ? body.action.trim().toLowerCase() : "";

    if (action === "close") {
      await adminCloseSupportThread(id, prismaSupportStore);
      return NextResponse.json({ ok: true, status: "closed" });
    }

    if (action === "reopen") {
      await adminReopenSupportThread(id, prismaSupportStore);
      return NextResponse.json({ ok: true, status: "open" });
    }

    return NextResponse.json(
      { error: "Invalid action. Use close or reopen." },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof SupportAccessError && error.code === "not_found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    console.error("[admin-support] status update failed");
    return NextResponse.json(
      { error: "Could not update thread status" },
      { status: 500 },
    );
  }
}
