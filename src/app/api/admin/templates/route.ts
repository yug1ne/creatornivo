import { NextResponse } from "next/server";

import { isAdminUser, requireAdmin } from "@/lib/admin/guards";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { parseTemplateFormBody } from "@/lib/templates/validation";

export async function GET() {
  const session = await getSession();

  if (!isAdminUser(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const templates = await prisma.template.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  try {
    const session = requireAdmin(await getSession());
    const body = await request.json();
    const { data, error } = parseTemplateFormBody(body);

    if (error || !data) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const existing = await prisma.template.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A template with this slug already exists" },
        { status: 409 },
      );
    }

    const template = await prisma.template.create({
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

    return NextResponse.json({ template }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}