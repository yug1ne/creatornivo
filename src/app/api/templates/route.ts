import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getTemplatesForUser } from "@/lib/templates/queries";

export async function GET() {
  const session = await getSession();
  const templates = await getTemplatesForUser(session);

  return NextResponse.json({ templates });
}