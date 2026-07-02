import { NextResponse } from "next/server";

import { createContentStream } from "@/lib/ai/provider";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  assertTemplateAccess,
  countGenerationsToday,
} from "@/lib/templates/queries";
import {
  fillPromptTemplate,
  parseTemplateVariables,
  validateVariableValues,
} from "@/lib/templates/utils";
import { canGenerate } from "@/lib/subscriptions/limits";
import { getGenerationLimitMessage } from "@/lib/subscriptions/messages";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();

    const { templateId, values } = body as {
      templateId?: string;
      values?: Record<string, string>;
    };

    if (!templateId || !values) {
      return NextResponse.json(
        { error: "templateId and values are required" },
        { status: 400 },
      );
    }

    const { error, status, template } = await assertTemplateAccess(
      session,
      templateId,
    );

    if (error || !template) {
      return NextResponse.json({ error }, { status: status ?? 404 });
    }

    const variables = parseTemplateVariables(template.variables);
    const validationError = validateVariableValues(variables, values);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const generationsToday = await countGenerationsToday(session.id);

    if (!canGenerate(session.plan, generationsToday)) {
      return NextResponse.json(
        {
          error:
            getGenerationLimitMessage(session.plan, generationsToday) ??
            "Generation limit reached",
        },
        { status: 429 },
      );
    }

    const filledPrompt = fillPromptTemplate(template.prompt, values);

    const { stream, model } = await createContentStream({
      prompt: filledPrompt,
      plan: session.plan,
      onFinish: async ({ text, model: usedModel, tokensUsed }) => {
        await prisma.generation.create({
          data: {
            userId: session.id,
            templateId: template.id,
            prompt: filledPrompt,
            result: text,
            model: usedModel,
            tokensUsed,
          },
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Model": model,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}