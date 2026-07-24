"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getPlanLimits } from "@/config/plans";
import { MODEL_BY_PLAN } from "@/lib/ai/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { areTemplateValuesAtDefaults } from "@/lib/templates/utils";
import {
  getGeneratedOutputValidationMessage,
  sanitizeGeneratedOutput,
  validateGeneratedOutput,
} from "@/lib/templates/output-validation";
import { getSaveLimitMessage } from "@/lib/subscriptions/messages";
import type { Plan } from "@/config/plans";
import type { UserUsageSnapshot } from "@/lib/usage";
import {
  parseGenerationApiError,
  type ParsedGenerationError,
} from "@/lib/usage/quota-exceeded";
import type {
  TemplateCatalogItem,
  TemplateFormDetail,
  TemplateVariable,
} from "@/types/template";

import { EmailVerificationBanner } from "./email-verification-banner";
import { GenerateFormSection } from "./generate-form-section";
import { TemplatePicker } from "./template-picker";
import { UsageBanner } from "./usage-banner";

/** Lazy-load result UI only when generation is active or output exists. */
const GenerationResult = dynamic(
  () =>
    import("./generation-result").then((mod) => ({
      default: mod.GenerationResult,
    })),
  { ssr: false, loading: () => null },
);

interface UsageStats extends UserUsageSnapshot {
  savedCount: number;
}

export type GenerationUsageSnapshot = UserUsageSnapshot;

interface GenerateWorkspaceProps {
  /** Lightweight catalog for the picker — no form variables or prompts. */
  catalog: TemplateCatalogItem[];
  /** SSR form for the initial selection (?template= or first accessible). */
  initialForm: TemplateFormDetail | null;
  userPlan: Plan;
  canExport: boolean;
  /** Server-loaded flag — unverified users may browse but cannot generate. */
  emailVerified?: boolean;
  usage: UsageStats;
}

function isTemplateFormDetail(value: unknown): value is TemplateFormDetail {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.slug === "string" &&
    typeof record.title === "string" &&
    Array.isArray(record.variables) &&
    // Prompt must never appear on client form payloads.
    !("prompt" in record && record.prompt != null && record.prompt !== "")
  );
}

export async function fetchTemplateFormBySlug(
  slug: string,
  fetcher: typeof fetch = fetch,
): Promise<TemplateFormDetail | null> {
  const response = await fetcher(`/api/templates/${encodeURIComponent(slug)}`, {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) return null;

  const data = (await response.json()) as { template?: unknown };
  if (!isTemplateFormDetail(data.template)) return null;

  // Defense-in-depth: drop prompt if a buggy response includes it.
  const { prompt: _drop, ...safe } = data.template as TemplateFormDetail & {
    prompt?: unknown;
  };
  void _drop;
  return safe as TemplateFormDetail;
}

export function acquireGenerationAttempt(
  currentRequestId: string | null,
  isInFlight: boolean,
  createRequestId: () => string = () => crypto.randomUUID(),
): string | null {
  if (isInFlight) return null;
  return currentRequestId ?? createRequestId();
}

/** @deprecated Prefer import from @/lib/templates/utils — re-exported for tests. */
export { areTemplateValuesAtDefaults };

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
  catalog,
  initialForm,
  userPlan,
  canExport,
  emailVerified = true,
  usage: initialUsage,
}: GenerateWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSlug = searchParams.get("template");
  const limits = getPlanLimits(userPlan);
  const canGenerateByEmail = emailVerified;

  const accessibleCatalog = useMemo(
    () => catalog.filter((t) => !t.isLocked),
    [catalog],
  );
  const formCacheRef = useRef<Map<string, TemplateFormDetail>>(new Map());
  const selectRequestRef = useRef(0);

  const [selectedId, setSelectedId] = useState<string | null>(
    initialForm?.id ?? null,
  );
  const [selectedForm, setSelectedForm] = useState<TemplateFormDetail | null>(
    initialForm,
  );
  const [formLoading, setFormLoading] = useState(false);
  const [formLoadError, setFormLoadError] = useState<string | null>(null);
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
  const [formResetVersion, setFormResetVersion] = useState(0);
  const didSyncUrlRef = useRef(false);

  // Seed client cache with SSR form (no prompt).
  useEffect(() => {
    if (initialForm) {
      formCacheRef.current.set(initialForm.id, initialForm);
    }
  }, [initialForm]);

  const selected = selectedForm;

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

  const canGenerateQuota = generationUsage.remaining > 0;

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

  const applyForm = useCallback((form: TemplateFormDetail) => {
    formCacheRef.current.set(form.id, form);
    setSelectedId(form.id);
    setSelectedForm(form);
    setFormLoading(false);
    setFormLoadError(null);
    setStreamedContent("");
    setModel("");
    setError(null);
    setSavedPromptId(null);
    setResultValidationContext(null);
    setFormResetVersion((current) => current + 1);
  }, []);

  const selectTemplate = useCallback(
    async (template: TemplateCatalogItem) => {
      if (template.isLocked) return;
      if (!inFlightRef.current) requestIdRef.current = null;

      const url = new URL(window.location.href);
      url.searchParams.set("template", template.slug);
      router.replace(url.pathname + url.search, { scroll: false });

      const cached = formCacheRef.current.get(template.id);
      if (cached) {
        applyForm(cached);
        return;
      }

      // Optimistically mark selection while form schema loads.
      const requestId = ++selectRequestRef.current;
      setSelectedId(template.id);
      setSelectedForm(null);
      setFormLoading(true);
      setFormLoadError(null);
      setStreamedContent("");
      setModel("");
      setError(null);
      setSavedPromptId(null);
      setResultValidationContext(null);

      try {
        const form = await fetchTemplateFormBySlug(template.slug);
        if (selectRequestRef.current !== requestId) return;

        if (!form || form.isLocked) {
          setFormLoading(false);
          setFormLoadError(
            form?.isLocked
              ? "This template is only available on the Pro plan."
              : "Could not load template form. Please try again.",
          );
          return;
        }

        applyForm(form);
      } catch {
        if (selectRequestRef.current !== requestId) return;
        setFormLoading(false);
        setFormLoadError("Could not load template form. Please try again.");
      }
    },
    [applyForm, router],
  );

  // Sync URL when SSR already selected a form without ?template=.
  useEffect(() => {
    if (didSyncUrlRef.current || !initialForm) return;
    didSyncUrlRef.current = true;
    if (initialSlug === initialForm.slug) return;

    const url = new URL(window.location.href);
    url.searchParams.set("template", initialForm.slug);
    router.replace(url.pathname + url.search, { scroll: false });
  }, [initialForm, initialSlug, router]);

  // If SSR had no form, pick first accessible catalog item and load its form.
  useEffect(() => {
    if (selectedId || initialForm) return;

    const preselected = initialSlug
      ? accessibleCatalog.find((t) => t.slug === initialSlug)
      : accessibleCatalog[0];

    if (preselected) {
      void selectTemplate(preselected);
    }
  }, [accessibleCatalog, initialForm, initialSlug, selectedId, selectTemplate]);

  const handleFormEdit = useCallback(() => {
    if (!inFlightRef.current) {
      requestIdRef.current = null;
    }
  }, []);

  const handleGenerate = useCallback(
    async (values: Record<string, string>) => {
      if (
        !selected ||
        !canGenerateByEmail ||
        !canGenerateQuota ||
        inFlightRef.current
      ) {
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
    },
    [
      canGenerateByEmail,
      canGenerateQuota,
      refreshGenerationUsage,
      selected,
      userPlan,
    ],
  );

  const handleSave = useCallback(async (): Promise<{
    error?: string;
    id?: string;
  }> => {
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
  }, [
    canSave,
    resultValidationContext,
    saveLimitMessage,
    selected,
    streamedContent,
  ]);

  const handleGenerateRetry = useCallback(() => {
    if (!resultValidationContext?.values) return;
    void handleGenerate(resultValidationContext.values);
  }, [handleGenerate, resultValidationContext]);

  return (
    <div className="space-y-6">
      <EmailVerificationBanner initialVerified={emailVerified} />

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
            templates={catalog}
            selectedId={selectedId}
            userPlan={userPlan}
            onSelect={selectTemplate}
          />
        </aside>

        <div className="min-w-0 space-y-6">
          {formLoading && !selected ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <span
                  className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
                  aria-hidden
                />
                <p className="text-sm font-medium text-foreground">
                  Loading template form…
                </p>
              </CardContent>
            </Card>
          ) : formLoadError && !selected ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm font-medium text-destructive">
                  {formLoadError}
                </p>
              </CardContent>
            </Card>
          ) : selected ? (
            <>
              <GenerateFormSection
                key={`${selected.id}-${formResetVersion}`}
                selected={selected}
                formResetVersion={formResetVersion}
                userPlan={userPlan}
                canGenerateByEmail={canGenerateByEmail}
                canGenerateQuota={canGenerateQuota}
                isStreaming={isStreaming}
                generationUsage={generationUsage}
                onGenerate={handleGenerate}
                onFormEdit={handleFormEdit}
              />

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
                    {error.code !== "quota_exceeded" &&
                      error.code !== "quota" &&
                      error.code !== "email_verification_required" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateRetry}
                          disabled={
                            isStreaming ||
                            !canGenerateByEmail ||
                            !canGenerateQuota
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

              {(isStreaming || streamedContent) && (
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
              )}
            </>
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
    </div>
  );
}
