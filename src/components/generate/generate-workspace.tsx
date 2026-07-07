"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getCategoryColor,
  getCategoryIcon,
  getCategoryLabel,
} from "@/config/template-categories";
import { getPlanLimits } from "@/config/plans";
import { MODEL_BY_PLAN } from "@/lib/ai/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  buildDefaultValues,
  validateVariableValues,
} from "@/lib/templates/utils";
import {
  getGenerationLimitMessage,
  getSaveLimitMessage,
} from "@/lib/subscriptions/messages";
import type { Plan } from "@/config/plans";
import type { UserUsageSnapshot } from "@/lib/usage";
import {
  parseGenerationApiError,
  type ParsedGenerationError,
} from "@/lib/usage/quota-exceeded";
import type { TemplateListItem } from "@/types/template";

import { GenerationResult } from "./generation-result";
import { PromptPreview } from "./prompt-preview";
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
  const requestIdRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  const selected = templates.find((t) => t.id === selectedId) ?? null;

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

    setError(null);
    setIsStreaming(true);
    setStreamedContent("");
    setModel(MODEL_BY_PLAN[userPlan]);
    setSavedPromptId(null);

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          templateId: selected.id,
          values,
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

    if (!canSave) {
      return { error: saveLimitMessage ?? "Save limit reached" };
    }

    const response = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `${selected.title} — ${new Date().toLocaleDateString("en-US")}`,
        content: streamedContent,
        templateId: selected.id,
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
                  <CardTitle className="text-sm">Parameters</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {selected.variables.map((variable) => (
                      <div
                        key={variable.key}
                        className={
                          selected.variables.length % 2 !== 0 &&
                          variable.key === selected.variables.at(-1)?.key
                            ? "sm:col-span-2"
                            : ""
                        }
                      >
                        <label
                          htmlFor={variable.key}
                          className="mb-1.5 block text-sm font-medium text-foreground"
                        >
                          {variable.label}
                          {variable.required && (
                            <span className="text-destructive"> *</span>
                          )}
                        </label>
                        <Input
                          id={variable.key}
                          type="text"
                          value={values[variable.key] ?? ""}
                          onChange={(e) => {
                            if (!inFlightRef.current) {
                              requestIdRef.current = null;
                            }
                            setValues((prev) => ({
                              ...prev,
                              [variable.key]: e.target.value,
                            }));
                          }}
                          placeholder={variable.placeholder}
                        />
                      </div>
                    ))}
                  </div>
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
                        ) ??
                        undefined
                      : undefined
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

              {error && (
                <div
                  className="rounded-[var(--radius-md)] bg-destructive/10 px-4 py-3 text-sm text-destructive"
                  role="alert"
                >
                  <p>{error.message}</p>
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
    </div>
  );
}
