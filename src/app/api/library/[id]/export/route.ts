import { NextResponse } from "next/server";

import {
  buildExportFilename,
  getExportMimeType,
  prepareExportContent,
  type ExportFormat,
} from "@/lib/export/utils";
import { canExportContent, EXPORT_UPGRADE_MESSAGE } from "@/lib/export/permissions";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await requireSession();

    if (!canExportContent(session)) {
      return NextResponse.json({ error: EXPORT_UPGRADE_MESSAGE }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") as ExportFormat | null;

    if (format !== "md" && format !== "txt") {
      return NextResponse.json(
        { error: "The format parameter must be md or txt" },
        { status: 400 },
      );
    }

    const prompt = await prisma.savedPrompt.findFirst({
      where: { id, userId: session.id },
      select: { title: true, content: true },
    });

    if (!prompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    const exportContent = prepareExportContent(prompt.content, format);
    const filename = buildExportFilename(prompt.title, format);

    return new Response(exportContent, {
      headers: {
        "Content-Type": getExportMimeType(format),
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}