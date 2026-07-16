import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getTemplatesForUser } from "@/lib/templates/queries";

/**
 * Public catalog endpoint (session optional).
 * Never returns full template prompts — generate loads prompts server-side only.
 */
export async function GET() {
  const session = await getSession();
  // Never include prompts in this API response (authenticated or not).
  const templates = await getTemplatesForUser(session, { includePrompt: false });

  return NextResponse.json({ templates });
}