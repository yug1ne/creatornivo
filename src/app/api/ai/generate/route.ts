import { NextResponse } from "next/server";

import {
  createContentStream,
  isAIProviderConfigured,
} from "@/lib/ai/provider";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  GenerationPolicyError,
  prismaGenerationReservationStore,
  reserveGeneration,
  validateUserInput,
} from "@/lib/generation/usage-service";
import {
  getRemainingGenerations,
  getUsagePeriodForPlan,
  incrementUsage,
  UsageError,
} from "@/lib/usage";
import { assertTemplateAccess } from "@/lib/templates/queries";
import {
  fillPromptTemplate,
  parseTemplateVariables,
  validateVariableValues,
} from "@/lib/templates/utils";

function isValidRequestId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export function requireGenerationRequestId(value: unknown): string {
  if (!isValidRequestId(value)) {
    throw new GenerationPolicyError(
      "invalid_request",
      400,
      "A valid generation request ID is required.",
    );
  }

  return value;
}

export function parseGenerationRequestBody(body: unknown): {
  requestId?: unknown;
  templateId: string | null;
  values: unknown;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { templateId: null, values: undefined };
  }

  const record = body as Record<string, unknown>;

  return {
    requestId: record.requestId,
    templateId:
      typeof record.templateId === "string" ? record.templateId : null,
    values: record.values,
  };
}

export async function POST(request: Request) {
  let session;

  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let requestId: string | null = null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { plan: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = parseGenerationRequestBody(await request.json());
    const { templateId, requestId: suppliedRequestId } = body;

    if (!templateId || !body.values) {
      return NextResponse.json(
        { error: "templateId and values are required" },
        { status: 400 },
      );
    }

    requestId = requireGenerationRequestId(suppliedRequestId);
    const serverSession = { ...session, plan: user.plan };
    const { error, status, template } = await assertTemplateAccess(
      serverSession,
      templateId,
    );

    if (error || !template) {
      return NextResponse.json({ error }, { status: status ?? 404 });
    }

    validateUserInput(user.plan, body.values);

    const variables = parseTemplateVariables(template.variables);
    const validationError = validateVariableValues(variables, body.values);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (!isAIProviderConfigured()) {
      return NextResponse.json(
        {
          error: "AI generation is temporarily unavailable.",
          code: "generation_disabled",
        },
        { status: 503 },
      );
    }

    const userId = session.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // UserUsage quota (Stage 2) — checked before reservation/idempotency flow
    let remaining: number;
    try {
      remaining = await getRemainingGenerations(userId, user.plan);
    } catch (error) {
      if (error instanceof UsageError) {
        console.error("UserUsage check failed:", error);
        return NextResponse.json(
          {
            error: "Unable to verify generation limit. Please try again.",
            code: "usage_check_failed",
          },
          { status: 500 },
        );
      }
      throw error;
    }

    if (remaining <= 0) {
      return NextResponse.json(
        {
          error: "Generation limit reached for today/month",
          code: "quota",
        },
        { status: 429 },
      );
    }

    const filledPrompt = fillPromptTemplate(template.prompt, body.values);
    const reservation = await reserveGeneration({
      requestId,
      userId: session.id,
      plan: user.plan,
    });

    try {
      const { stream, model } = await createContentStream({
        prompt: filledPrompt,
        plan: user.plan,
        onStart: () =>
          prismaGenerationReservationStore.markStarted(
            session.id,
            requestId!,
            new Date(),
          ),
        onFinish: async ({
          text,
          model: usedModel,
          inputTokens,
          outputTokens,
        }) => {
          await prismaGenerationReservationStore.complete(
            session.id,
            requestId!,
            {
              userId: session.id,
              templateId: template.id,
              prompt: filledPrompt,
              result: text,
              model: usedModel,
              inputTokens,
              outputTokens,
            },
            new Date(),
          );

          // Count only completed generations toward UserUsage (after DB persist)
          try {
            await incrementUsage(userId, getUsagePeriodForPlan(user.plan));
          } catch (error) {
            // Stream already succeeded — log for manual reconciliation
            console.error(
              "Failed to increment UserUsage after successful generation:",
              error,
            );
          }
        },
        onError: ({ error: streamError, inputTokens, outputTokens }) =>
          prismaGenerationReservationStore.fail(
            session.id,
            requestId!,
            { inputTokens, outputTokens },
            new Date(),
          ).then(() => {
            console.error("AI generation stream error:", streamError);
          }),
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          "X-Model": model,
          "X-Request-Id": reservation.requestId,
        },
      });
    } catch (error) {
      await prismaGenerationReservationStore.fail(
        session.id,
        requestId,
        {},
        new Date(),
      );
      throw error;
    }
  } catch (error) {
    if (error instanceof GenerationPolicyError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    console.error("AI generation error:", error);
    return NextResponse.json(
      { error: "Generation failed. Please try again." },
      { status: 500 },
    );
  }
}
