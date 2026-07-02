import { NextResponse } from "next/server";

import {
  buildExportFilename,
  getExportMimeType,
  prepareExportContent,
  type ExportFormat,
} from "@/lib/export/utils";
import { canExportContent, EXPORT_UPGRADE_MESSAGE } from "@/lib/export/permissions";
import { requireSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const session = await requireSession();

    if (!canExportContent(session)) {
      return NextResponse.json({ error: EXPORT_UPGRADE_MESSAGE }, { status: 403 });
    }

    const body = await request.json();
    const { content, format, title } = body as {
      content?: string;
      format?: ExportFormat;
      title?: string;
    };

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Export content is required" },
        { status: 400 },
      );
    }

    if (format !== "md" && format !== "txt") {
      return NextResponse.json(
        { error: "Format must be md or txt" },
        { status: 400 },
      );
    }

    const exportContent = prepareExportContent(content, format);
    const filename = buildExportFilename(title ?? "generation", format);

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