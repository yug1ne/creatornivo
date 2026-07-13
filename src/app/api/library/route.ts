import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { canSavePrompt } from "@/lib/subscriptions/limits";
import { getSaveLimitMessage } from "@/lib/subscriptions/messages";
import {
  getGeneratedOutputValidationMessage,
  sanitizeGeneratedOutput,
  validateGeneratedOutput,
} from "@/lib/templates/output-validation";
import { parseTemplateVariables } from "@/lib/templates/utils";

function parseStringRecord(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

export async function GET() {
  try {
    const session = await requireSession();

    const prompts = await prisma.savedPrompt.findMany({
      where: { userId: session.id },
      orderBy: { updatedAt: "desc" },
      include: {
        template: {
          select: { title: true, slug: true },
        },
      },
    });

    return NextResponse.json({ prompts });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();

    const { title, content, templateId } = body as {
      title?: string;
      content?: string;
      templateId?: string | null;
      templateValues?: unknown;
    };

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 },
      );
    }

    const template =
      templateId
        ? await prisma.template.findUnique({
            where: { id: templateId },
            select: { variables: true },
          })
        : null;
    const variables = template ? parseTemplateVariables(template.variables) : [];
    const templateValues = parseStringRecord(
      (body as { templateValues?: unknown }).templateValues,
    );
    const sanitizedOutput = sanitizeGeneratedOutput(
      content,
      variables,
      templateValues,
    );
    const outputValidation = validateGeneratedOutput(
      sanitizedOutput.content,
      variables,
      templateValues,
    );
    const outputValidationMessage =
      getGeneratedOutputValidationMessage(outputValidation);

    if (outputValidationMessage) {
      return NextResponse.json(
        { error: outputValidationMessage, code: "output_validation_failed" },
        { status: 400 },
      );
    }

    const savedCount = await prisma.savedPrompt.count({
      where: { userId: session.id },
    });

    if (!canSavePrompt(session.plan, savedCount)) {
      return NextResponse.json(
        {
          error:
            getSaveLimitMessage(session.plan, savedCount) ??
            "Save limit reached",
        },
        { status: 429 },
      );
    }

    const prompt = await prisma.savedPrompt.create({
      data: {
        userId: session.id,
        title: title.trim(),
        content: sanitizedOutput.content.trim(),
        templateId: templateId ?? null,
      },
      include: {
        template: {
          select: { title: true, slug: true },
        },
      },
    });

    return NextResponse.json({ prompt }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
