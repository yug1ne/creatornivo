import { NextResponse } from "next/server";

import {
  adminAccessErrorResponse,
  requireAdmin,
} from "@/lib/admin/guards";
import { formatSignInMethods } from "@/lib/auth/sign-in-methods";
import { getSession } from "@/lib/auth/session";
import {
  getAdminSupportThreadDetail,
  SupportAccessError,
} from "@/lib/support/service";
import { prismaSupportStore } from "@/lib/support/store";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
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
    const thread = await getAdminSupportThreadDetail(
      id,
      prismaSupportStore,
      formatSignInMethods,
    );
    return NextResponse.json({ thread });
  } catch (error) {
    if (error instanceof SupportAccessError && error.code === "not_found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
