import { NextResponse } from "next/server";

import {
  adminAccessErrorResponse,
  requireAdmin,
} from "@/lib/admin/guards";
import { getSession } from "@/lib/auth/session";
import { parseAdminSupportListParams } from "@/lib/support/admin-query";
import { listAdminSupportThreads } from "@/lib/support/service";
import { prismaSupportStore } from "@/lib/support/store";

export async function GET(request: Request) {
  try {
    requireAdmin(await getSession());
  } catch (error) {
    const access = adminAccessErrorResponse(error);
    if (access) {
      return NextResponse.json(access.body, { status: access.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const params = parseAdminSupportListParams({
    status: url.searchParams.get("status") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
  });

  const result = await listAdminSupportThreads(params, prismaSupportStore);
  return NextResponse.json(result);
}
