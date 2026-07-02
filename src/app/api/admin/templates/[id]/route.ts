import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/guards";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { parseTemplateFormBody } from "@/lib/templates/validation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    requireAdmin(await getSession());
    const { id } = await params;

    const template = await prisma.template.findUnique({ where: { id } });

    if (!template) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    requireAdmin(await getSession());
    const { id } = await params;
    const body = await request.json();
    const { data, error } = parseTemplateFormBody(body);

    if (error || !data) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const existing = await prisma.template.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const slugConflict = await prisma.template.findFirst({
      where: { slug: data.slug, NOT: { id } },
    });

    if (slugConflict) {
      return NextResponse.json(
        { error: "A template with this slug already exists" },
        { status: 409 },
      );
    }

    const template = await prisma.template.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description,
        prompt: data.prompt,
        variables: data.variables as object[],
        category: data.category,
        requiredPlan: data.requiredPlan,
        isActive: data.isActive,
      },
    });

    return NextResponse.json({ template });
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    requireAdmin(await getSession());
    const { id } = await params;

    const existing = await prisma.template.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.template.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}