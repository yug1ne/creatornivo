import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getTemplateCatalogForUser } from "@/lib/templates/queries";

/**
 * Public catalog endpoint (session optional).
 * Returns lightweight catalog metadata only — never prompts or full form variables.
 * Form schemas: GET /api/templates/[slug]. Generate loads prompts server-side only.
 */
export async function GET() {
  const session = await getSession();
  const templates = await getTemplateCatalogForUser(session);

  return NextResponse.json({ templates });
}
