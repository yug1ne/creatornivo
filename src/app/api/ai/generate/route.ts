import { NextResponse } from "next/server";

import { PLANS, type Plan } from "@/config/plans";
import {
  createContentText,
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
  getUsagePeriodForPlan,
  getUserUsageSnapshot,
  incrementUsage,
  UsageError,
  type UserUsageSnapshot,
} from "@/lib/usage";
import {
  buildQuotaExceededBody,
  getRetryAfterSeconds,
} from "@/lib/usage/quota-exceeded";
import { maybeSendQuotaExhaustedEmail } from "@/lib/email/send-quota-exhausted";
import { maybeSendQuotaWarningEmail } from "@/lib/email/send-quota-warning";
import { assertTemplateAccess } from "@/lib/templates/queries";
import {
  findRenderedPromptIssues,
  fillPromptTemplate,
  parseTemplateVariables,
  validateVariableValues,
} from "@/lib/templates/utils";
import {
  getGeneratedOutputValidationMessage,
  sanitizeGeneratedOutput,
  validateGeneratedOutput,
} from "@/lib/templates/output-validation";
import {
  getAutoRepairFailureMessage,
  isGeneratedOutputValidAfterRepair,
  isGenerationAutoRepairEnabled,
  repairGeneratedOutputOnce,
} from "@/lib/templates/output-repair";

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

/** Rich 429 payload when UserUsage quota is exhausted (monitoring-friendly Retry-After). */
function quotaExceededResponse(snapshot: UserUsageSnapshot) {
  const body = buildQuotaExceededBody(snapshot);

  return NextResponse.json(body, {
    status: 429,
    headers: {
      "Retry-After": String(getRetryAfterSeconds(snapshot.resetAt)),
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  let session;

  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let requestId: string | null = null;
  let userPlan: Plan | undefined;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { plan: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userPlan = user.plan;

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
    const templateValues = body.values;

    const variables = parseTemplateVariables(template.variables);
    const validationError = validateVariableValues(variables, templateValues);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const filledPrompt = fillPromptTemplate(
      template.prompt,
      templateValues,
      variables,
    );
    const renderIssues = findRenderedPromptIssues(filledPrompt, variables);

    if (
      renderIssues.unresolvedVariables.length > 0 ||
      renderIssues.unsafeTokens.length > 0
    ) {
      console.error("Template rendering failed:", {
        templateId: template.id,
        templateSlug: template.slug,
        unresolvedVariables: renderIssues.unresolvedVariables,
        unsafeTokens: renderIssues.unsafeTokens,
      });

      return NextResponse.json(
        {
          error: "Template rendering failed. Please try another template or contact support.",
          code: "template_render_error",
        },
        { status: 500 },
      );
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

    // UserUsage quota — checked before reservation/idempotency flow
    let usageSnapshot: UserUsageSnapshot;
    try {
      usageSnapshot = await getUserUsageSnapshot(userId, user.plan);
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

    if (usageSnapshot.remaining <= 0) {
      return quotaExceededResponse(usageSnapshot);
    }

    const reservation = await reserveGeneration({
      requestId,
      userId: session.id,
      plan: user.plan,
    });

    const markGenerationStarted = () =>
      prismaGenerationReservationStore.markStarted(
        session.id,
        requestId!,
        new Date(),
      );

    const completeAndRecordUsage = async ({
      content,
      usedModel,
      inputTokens,
      outputTokens,
    }: {
      content: string;
      usedModel: string;
      inputTokens: number;
      outputTokens: number;
    }) => {
      await prismaGenerationReservationStore.complete(
        session.id,
        requestId!,
        {
          userId: session.id,
          templateId: template.id,
          prompt: filledPrompt,
          result: content,
          model: usedModel,
          inputTokens,
          outputTokens,
        },
        new Date(),
      );

      // Count only completed generations toward UserUsage (after DB persist)
      try {
        await incrementUsage(userId, getUsagePeriodForPlan(user.plan));

        if (user.plan === PLANS.FREE) {
          const snapshot = await getUserUsageSnapshot(userId, user.plan);
          if (snapshot.remaining === 0) {
            void maybeSendQuotaExhaustedEmail({
              userId,
              resetAt: snapshot.resetAt,
            }).catch((emailError) => {
              console.error(
                "[email] Quota exhausted email task failed:",
                emailError,
              );
            });
          } else if (snapshot.remaining === 1) {
            void maybeSendQuotaWarningEmail(
              userId,
              snapshot.resetAt,
            ).catch((emailError) => {
              console.error(
                "[email] Quota warning email task failed:",
                emailError,
              );
            });
          }
        }
      } catch (error) {
        // Stream already succeeded — log for manual reconciliation
        console.error(
          "Failed to increment UserUsage after successful generation:",
          error,
        );
      }
    };

    try {
      if (isGenerationAutoRepairEnabled()) {
        const generated = await createContentText({
          prompt: filledPrompt,
          plan: user.plan,
          onStart: markGenerationStarted,
        });
        const sanitizedOutput = sanitizeGeneratedOutput(
          generated.text,
          variables,
          templateValues,
        );
        const outputValidation = validateGeneratedOutput(
          sanitizedOutput.content,
          variables,
          templateValues,
        );

        let finalContent = sanitizedOutput.content;
        let finalValidation = outputValidation;
        let finalInputTokens = generated.inputTokens;
        let finalOutputTokens = generated.outputTokens;

        if (
          !isGeneratedOutputValidAfterRepair(
            sanitizedOutput.content,
            outputValidation,
          )
        ) {
          const repairResult = await repairGeneratedOutputOnce({
            content: sanitizedOutput.content,
            validation: outputValidation,
            variables,
            values: templateValues,
            repairModel: (repairPrompt) =>
              createContentText({
                prompt: repairPrompt,
                plan: user.plan,
              }),
          });

          finalContent = repairResult.content;
          finalValidation = repairResult.validation;
          finalInputTokens += repairResult.repairInputTokens;
          finalOutputTokens += repairResult.repairOutputTokens;

          if (repairResult.repaired) {
            console.info("Generated output auto-repaired:", {
              templateId: template.id,
              templateSlug: template.slug,
              requestId,
              issues: repairResult.assessment.repairableIssues.map((issue) => ({
                code: issue.code,
                category: issue.category,
              })),
            });
          } else {
            console.error("Generated output validation failed:", {
              templateId: template.id,
              templateSlug: template.slug,
              requestId,
              sanitized: sanitizedOutput.changed,
              autoRepairAttempted: repairResult.attempted,
              removedArtifacts: sanitizedOutput.changes.map((change) => ({
                category: change.category,
                reason: change.reason,
              })),
              issues: repairResult.assessment.repairableIssues.map((issue) => ({
                code: issue.code,
                category: issue.category,
              })),
              unrepairableIssues:
                repairResult.assessment.unrepairableIssues.map((issue) => ({
                  code: issue.code,
                  category: issue.category,
                })),
              message: getAutoRepairFailureMessage(
                finalContent,
                finalValidation,
              ),
            });

            await prismaGenerationReservationStore.fail(
              session.id,
              requestId!,
              {
                inputTokens: finalInputTokens,
                outputTokens: finalOutputTokens,
              },
              new Date(),
            );

            return NextResponse.json(
              {
                error: getAutoRepairFailureMessage(
                  finalContent,
                  finalValidation,
                ),
                code: "output_validation_failed",
              },
              { status: 422 },
            );
          }
        }

        if (!isGeneratedOutputValidAfterRepair(finalContent, finalValidation)) {
          await prismaGenerationReservationStore.fail(
            session.id,
            requestId!,
            {
              inputTokens: finalInputTokens,
              outputTokens: finalOutputTokens,
            },
            new Date(),
          );

          return NextResponse.json(
            {
              error: getAutoRepairFailureMessage(finalContent, finalValidation),
              code: "output_validation_failed",
            },
            { status: 422 },
          );
        }

        await completeAndRecordUsage({
          content: finalContent,
          usedModel: generated.model,
          inputTokens: finalInputTokens,
          outputTokens: finalOutputTokens,
        });

        return new Response(finalContent, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "X-Model": generated.model,
            "X-Request-Id": reservation.requestId,
          },
        });
      }

      const { stream, model } = await createContentStream({
        prompt: filledPrompt,
        plan: user.plan,
        onStart: markGenerationStarted,
        onFinish: async ({
          text,
          model: usedModel,
          inputTokens,
          outputTokens,
        }) => {
          const sanitizedOutput = sanitizeGeneratedOutput(
            text,
            variables,
            templateValues,
          );
          const outputValidation = validateGeneratedOutput(
            sanitizedOutput.content,
            variables,
            templateValues,
          );

          if (!outputValidation.ok) {
            console.error("Generated output validation failed:", {
              templateId: template.id,
              templateSlug: template.slug,
              requestId,
              sanitized: sanitizedOutput.changed,
              removedArtifacts: sanitizedOutput.changes.map((change) => ({
                category: change.category,
                reason: change.reason,
              })),
              issues: outputValidation.issues.map((issue) => ({
                code: issue.code,
                category: issue.category,
                match: issue.match,
              })),
              message: getGeneratedOutputValidationMessage(outputValidation),
            });

            await prismaGenerationReservationStore.fail(
              session.id,
              requestId!,
              { inputTokens, outputTokens },
              new Date(),
            );
            return;
          }

          await completeAndRecordUsage({
            content: sanitizedOutput.content,
            usedModel,
            inputTokens,
            outputTokens,
          });
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
      // Reservation layer may still hit quota (legacy rows / drift) — return same rich 429
      if (
        error.code === "quota" &&
        session?.id &&
        userPlan
      ) {
        try {
          const snapshot = await getUserUsageSnapshot(session.id, userPlan);
          return quotaExceededResponse({ ...snapshot, remaining: 0 });
        } catch (usageLoadError) {
          console.error("Failed to build quota exceeded response:", usageLoadError);
        }
      }

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
