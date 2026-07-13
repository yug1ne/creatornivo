"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import {
  getCategoryColor,
  getCategoryIcon,
  getCategoryLabel,
} from "@/config/template-categories";
import { getPlanLimits } from "@/config/plans";
import { MODEL_BY_PLAN } from "@/lib/ai/provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildDefaultValues,
  validateVariableValues,
} from "@/lib/templates/utils";
import {
  getGeneratedOutputValidationMessage,
  sanitizeGeneratedOutput,
  validateGeneratedOutput,
} from "@/lib/templates/output-validation";
import {
  getGenerationLimitMessage,
  getSaveLimitMessage,
} from "@/lib/subscriptions/messages";
import type { Plan } from "@/config/plans";
import type { UserUsageSnapshot } from "@/lib/usage";
import { getGenerateDisabledHint } from "@/lib/usage/quota-copy";
import {
  parseGenerationApiError,
  type ParsedGenerationError,
} from "@/lib/usage/quota-exceeded";
import type { TemplateListItem, TemplateVariable } from "@/types/template";

import { GenerationResult } from "./generation-result";
import { PromptPreview } from "./prompt-preview";
import { TemplateHelpButton } from "./template-help-button";
import { TemplateParametersForm } from "./template-parameters-form";
import { TemplatePicker } from "./template-picker";
import { UsageBanner } from "./usage-banner";

interface UsageStats extends UserUsageSnapshot {
  savedCount: number;
}

export type GenerationUsageSnapshot = UserUsageSnapshot;

interface GenerateWorkspaceProps {
  templates: TemplateListItem[];
  userPlan: Plan;
  canExport: boolean;
  usage: UsageStats;
}

export function acquireGenerationAttempt(
  currentRequestId: string | null,
  isInFlight: boolean,
  createRequestId: () => string = () => crypto.randomUUID(),
): string | null {
  if (isInFlight) return null;
  return currentRequestId ?? createRequestId();
}

export function areTemplateValuesAtDefaults(
  variables: TemplateVariable[],
  values: Record<string, string>,
): boolean {
  const defaults = buildDefaultValues(variables);
  return variables.every(
    (variable) => (values[variable.key] ?? "") === (defaults[variable.key] ?? ""),
  );
}

export async function fetchGenerationUsageSnapshot(
  fetcher: typeof fetch = fetch,
): Promise<GenerationUsageSnapshot | null> {
  const response = await fetcher("/api/ai/usage", {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) return null;

  const data = (await response.json()) as Record<string, unknown>;
  if (
    (data.plan !== "free" && data.plan !== "pro") ||
    typeof data.remaining !== "number" ||
    typeof data.limit !== "number" ||
    (data.period !== "daily" && data.period !== "monthly") ||
    typeof data.resetAt !== "string"
  ) {
    return null;
  }

  const used =
    typeof data.used === "number"
      ? data.used
      : Math.max(0, (data.limit as number) - (data.remaining as number));

  return {
    plan: data.plan,
    remaining: data.remaining,
    limit: data.limit,
    period: data.period,
    resetAt: data.resetAt,
    used,
  };
}

export function GenerateWorkspace({
  templates,
  userPlan,
  canExport,
  usage: initialUsage,
}: GenerateWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSlug = searchParams.get("template");
  const limits = getPlanLimits(userPlan);

  const accessibleTemplates = templates.filter((t) => !t.isLocked);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [streamedContent, setStreamedContent] = useState("");
  const [model, setModel] = useState("");
  const [error, setError] = useState<ParsedGenerationError | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [generationUsage, setGenerationUsage] =
    useState<GenerationUsageSnapshot>({
      plan: initialUsage.plan,
      remaining: initialUsage.remaining,
      limit: initialUsage.limit,
      period: initialUsage.period,
      resetAt: initialUsage.resetAt,
      used: initialUsage.used,
    });
  const [savedCount, setSavedCount] = useState(initialUsage.savedCount);
  const [savedPromptId, setSavedPromptId] = useState<string | null>(null);
  const [resultValidationContext, setResultValidationContext] = useState<{
    templateId: string;
    variables: TemplateVariable[];
    values: Record<string, string>;
  } | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const resetButtonRef = useRef<HTMLButtonElement | null>(null);
  const cancelResetButtonRef = useRef<HTMLButtonElement | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [formResetVersion, setFormResetVersion] = useState(0);

  const selected = templates.find((t) => t.id === selectedId) ?? null;
  const isFormAtDefaults = selected
    ? areTemplateValuesAtDefaults(selected.variables, values)
    : true;
  const outputValidation = useMemo(() => {
    if (isStreaming || !streamedContent || !resultValidationContext) return null;
    return validateGeneratedOutput(
      streamedContent,
      resultValidationContext.variables,
      resultValidationContext.values,
    );
  }, [isStreaming, resultValidationContext, streamedContent]);
  const outputValidationMessage = outputValidation
    ? getGeneratedOutputValidationMessage(outputValidation)
    : null;

  const canGenerate = generationUsage.remaining > 0;

  const canSave =
    limits.maxSavedPrompts === Infinity ||
    savedCount < limits.maxSavedPrompts;

  const saveLimitMessage = getSaveLimitMessage(userPlan, savedCount);

  const refreshGenerationUsage = useCallback(async () => {
    try {
      const usage = await fetchGenerationUsageSnapshot();
      if (usage) setGenerationUsage(usage);
    } catch {
      // Keep the last server-provided value if usage refresh is unavailable.
    }
  }, []);

  const isFormValid = useMemo(() => {
    if (!selected) return false;
    return validateVariableValues(selected.variables, values) === null;
  }, [selected, values]);

  const generateDisabledHint = getGenerateDisabledHint({
    hasTemplate: Boolean(selected),
    values,
    variableCount: selected?.variables.length ?? 0,
    isFormValid,
    canGenerate,
    isStreaming,
  });

  const selectTemplate = useCallback(
    (template: TemplateListItem) => {
      if (template.isLocked) return;
      if (!inFlightRef.current) requestIdRef.current = null;

      setSelectedId(template.id);
      setValues(buildDefaultValues(template.variables));
      setStreamedContent("");
      setModel("");
      setError(null);
      setSavedPromptId(null);
      setResultValidationContext(null);

      const url = new URL(window.location.href);
      url.searchParams.set("template", template.slug);
      router.replace(url.pathname + url.search, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    if (selectedId) return;

    const preselected = initialSlug
      ? accessibleTemplates.find((t) => t.slug === initialSlug)
      : accessibleTemplates[0];

    if (preselected) {
      // The initial selection synchronizes local state with the URL/default.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      selectTemplate(preselected);
    }
  }, [initialSlug, accessibleTemplates, selectedId, selectTemplate]);

  const closeResetDialog = useCallback(() => {
    setResetConfirmOpen(false);
    window.setTimeout(() => resetButtonRef.current?.focus(), 0);
  }, []);

  const resetCurrentForm = useCallback(() => {
    if (!selected) return;

    if (!inFlightRef.current) {
      requestIdRef.current = null;
    }

    setValues(buildDefaultValues(selected.variables));
    setError(null);
    setFormResetVersion((current) => current + 1);
  }, [selected]);

  const handleResetRequest = useCallback(() => {
    if (!selected || isFormAtDefaults) return;
    setResetConfirmOpen(true);
  }, [isFormAtDefaults, selected]);

  const handleResetConfirm = useCallback(() => {
    resetCurrentForm();
    closeResetDialog();
  }, [closeResetDialog, resetCurrentForm]);

  async function handleGenerate() {
    if (!selected || !isFormValid || !canGenerate || inFlightRef.current) {
      return;
    }

    const requestId = acquireGenerationAttempt(
      requestIdRef.current,
      inFlightRef.current,
    );
    if (!requestId) return;

    requestIdRef.current = requestId;
    inFlightRef.current = true;
    const generationVariables = selected.variables;
    const generationValues = { ...values };

    setError(null);
    setIsStreaming(true);
    setStreamedContent("");
    setModel(MODEL_BY_PLAN[userPlan]);
    setSavedPromptId(null);
    setResultValidationContext({
      templateId: selected.id,
      variables: generationVariables,
      values: generationValues,
    });

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId,
            templateId: selected.id,
            values: generationValues,
          }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (
          response.status === 400 ||
          data.code === "generation_already_completed" ||
          data.code === "generation_request_failed"
        ) {
          requestIdRef.current = null;
        }
        setError(parseGenerationApiError(data));
        await refreshGenerationUsage();
        return;
      }

      const responseModel = response.headers.get("X-Model");
      if (responseModel) setModel(responseModel);

      const reader = response.body?.getReader();
      if (!reader) {
        setError({
          message: "Failed to receive data stream. Please try again.",
          showUpgradeLink: false,
        });
        await refreshGenerationUsage();
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulated += decoder.decode(value, { stream: true });
        setStreamedContent(accumulated);
      }

      const sanitizedOutput = sanitizeGeneratedOutput(
        accumulated,
        generationVariables,
        generationValues,
      );
      if (sanitizedOutput.changed) {
        setStreamedContent(sanitizedOutput.content);
      }

      requestIdRef.current = null;
      await refreshGenerationUsage();
    } catch {
      setError({
        message: "Network error. Please retry this generation.",
        showUpgradeLink: false,
      });
      await refreshGenerationUsage();
    } finally {
      inFlightRef.current = false;
      setIsStreaming(false);
    }
  }

  async function handleSave(): Promise<{ error?: string; id?: string }> {
    if (!selected || !streamedContent) {
      return { error: "No content to save" };
    }

    const sanitizedOutput = resultValidationContext
      ? sanitizeGeneratedOutput(
          streamedContent,
          resultValidationContext.variables,
          resultValidationContext.values,
        )
      : sanitizeGeneratedOutput(streamedContent);
    const sanitizedContent = sanitizedOutput.content;
    const outputValidation = resultValidationContext
      ? validateGeneratedOutput(
          sanitizedContent,
          resultValidationContext.variables,
          resultValidationContext.values,
        )
      : validateGeneratedOutput(sanitizedContent);
    const validationMessage =
      getGeneratedOutputValidationMessage(outputValidation);
    if (validationMessage) {
      return { error: validationMessage };
    }
    if (sanitizedOutput.changed) {
      setStreamedContent(sanitizedContent);
    }

    if (!canSave) {
      return { error: saveLimitMessage ?? "Save limit reached" };
    }

    const response = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `${selected.title} — ${new Date().toLocaleDateString("en-US")}`,
        content: sanitizedContent,
        templateId: selected.id,
        templateValues: resultValidationContext?.values,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error ?? "Failed to save" };
    }

    setSavedCount((prev) => prev + 1);
    setSavedPromptId(data.prompt.id);
    return { id: data.prompt.id };
  }

  return (
    <div className="space-y-6">
      <UsageBanner
        plan={userPlan}
        remaining={generationUsage.remaining}
        used={generationUsage.used}
        limit={generationUsage.limit}
        period={generationUsage.period}
        resetAt={generationUsage.resetAt}
        savedCount={savedCount}
        maxSavedPrompts={limits.maxSavedPrompts}
      />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <TemplatePicker
            templates={templates}
            selectedId={selectedId}
            userPlan={userPlan}
            onSelect={selectTemplate}
          />
        </aside>

        <div className="min-w-0 space-y-6">
          {selected ? (
            <div data-onboarding="generate-flow" className="space-y-6">
              <div className="flex items-start gap-4">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] text-sm font-bold ${getCategoryColor(selected.category)}`}
                  aria-hidden
                >
                  {getCategoryIcon(selected.category)}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground">
                      {selected.title}
                    </h2>
                    <Badge
                      variant={
                        selected.requiredPlan === "pro" ? "pro" : "free"
                      }
                    >
                      {getCategoryLabel(selected.category)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selected.description}
                  </p>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-sm">Parameters</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <TemplateParametersForm
                    key={`${selected.id}-${formResetVersion}`}
                    variables={selected.variables}
                    values={values}
                    toolbarAction={
                      <button
                        ref={resetButtonRef}
                        type="button"
                        onClick={handleResetRequest}
                        disabled={isFormAtDefaults}
                        aria-label="Reset form to default values"
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                          className:
                            "border-destructive/30 text-destructive hover:bg-destructive/10",
                        })}
                      >
                        <span className="hidden sm:inline">Reset form</span>
                        <span className="sm:hidden" aria-hidden>
                          Reset
                        </span>
                      </button>
                    }
                    toolbarEndAction={
                      <TemplateHelpButton templateSlug={selected.slug} />
                    }
                    onChange={(key, value) => {
                      if (!inFlightRef.current) {
                        requestIdRef.current = null;
                      }
                      setValues((prev) => ({
                        ...prev,
                        [key]: value,
                      }));
                    }}
                  />
                </CardContent>
              </Card>

              <PromptPreview template={selected} values={values} />

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={isStreaming || !isFormValid || !canGenerate}
                  title={
                    !canGenerate
                      ? getGenerationLimitMessage(
                          userPlan,
                          generationUsage.used,
                          generationUsage.resetAt,
                        ) ?? undefined
                      : generateDisabledHint ?? undefined
                  }
                >
                  {isStreaming ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                      Generating...
                    </>
                  ) : (
                    "Generate"
                  )}
                </Button>

                {!canGenerate && (
                  <Link
                    href="/pricing"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Upgrade to Pro
                  </Link>
                )}
              </div>

              {generateDisabledHint && (
                <p className="text-sm text-muted-foreground">
                  {generateDisabledHint}
                </p>
              )}

              {error && (
                <div
                  className={`rounded-[var(--radius-md)] px-4 py-3 text-sm ${
                    error.code === "generation_disabled"
                      ? "bg-warning/10 text-warning"
                      : "bg-destructive/10 text-destructive"
                  }`}
                  role="alert"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="min-w-0 flex-1">{error.message}</p>
                    {error.code !== "quota_exceeded" && error.code !== "quota" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerate}
                        disabled={
                          isStreaming || !isFormValid || !canGenerate
                        }
                        className={
                          error.code === "generation_disabled"
                            ? "border-warning/40 bg-background/80 hover:bg-background"
                            : "bg-background/80 hover:bg-background"
                        }
                      >
                        Try again
                      </Button>
                    )}
                  </div>
                  {error.showUpgradeLink && (
                    <Link
                      href="/pricing"
                      className="mt-2 inline-block font-medium underline hover:no-underline"
                    >
                      View Pro pricing
                    </Link>
                  )}
                </div>
              )}

              <GenerationResult
                content={streamedContent}
                model={model || MODEL_BY_PLAN[userPlan]}
                isStreaming={isStreaming}
                canSave={canSave}
                canExport={canExport}
                exportTitle={selected.title}
                saveLimitMessage={saveLimitMessage}
                savedPromptId={savedPromptId}
                outputValidationMessage={outputValidationMessage}
                onSave={handleSave}
              />
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-2xl text-muted-foreground">
                  ✦
                </span>
                <p className="text-sm font-medium text-foreground">
                  Select a template
                </p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Select a template on the left or use search to start generating
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <ResetFormConfirmationDialog
        open={resetConfirmOpen}
        cancelButtonRef={cancelResetButtonRef}
        onCancel={closeResetDialog}
        onConfirm={handleResetConfirm}
      />
    </div>
  );
}

function ResetFormConfirmationDialog({
  open,
  cancelButtonRef,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  cancelButtonRef: RefObject<HTMLButtonElement | null>;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    const focusTimer = window.setTimeout(
      () => cancelButtonRef.current?.focus(),
      0,
    );
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [cancelButtonRef, onCancel, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Cancel reset form"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-form-dialog-title"
        aria-describedby="reset-form-dialog-description"
        className="relative w-full max-w-sm rounded-[var(--radius-xl)] border border-border bg-card p-6 shadow-[var(--shadow-md)]"
      >
        <h2
          id="reset-form-dialog-title"
          className="text-lg font-semibold text-foreground"
        >
          Reset form?
        </h2>
        <p
          id="reset-form-dialog-description"
          className="mt-2 text-sm text-muted-foreground"
        >
          Reset all fields to their default values? Your current form entries
          will be removed.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className={buttonVariants({ variant: "outline" })}
          >
            Cancel
          </button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Reset fields
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
