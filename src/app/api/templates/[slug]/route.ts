import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getTemplateFormBySlug } from "@/lib/templates/queries";

/**
 * Selected-template form schema for the generate UI.
 * Never returns full template prompts — generation loads prompts server-side only.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const session = await getSession();
  const { slug } = await context.params;

  if (!slug?.trim()) {
    return NextResponse.json({ error: "Template slug is required" }, { status: 400 });
  }

  const template = await getTemplateFormBySlug(session, slug.trim());

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Defense-in-depth: strip any accidental prompt key before responding.
  const { prompt: _never, ...safeTemplate } = template as typeof template & {
    prompt?: unknown;
  };
  void _never;

  return NextResponse.json({ template: safeTemplate });
}
