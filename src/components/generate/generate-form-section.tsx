"use client";

import Link from "next/link";
import {
  memo,
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
import type { Plan } from "@/config/plans";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PromptPreview } from "@/components/generate/prompt-preview";
import { TemplateHelpButton } from "@/components/generate/template-help-button";
import { TemplateParametersForm } from "@/components/generate/template-parameters-form";
import { getGenerationLimitMessage } from "@/lib/subscriptions/messages";
import {
  areTemplateValuesAtDefaults,
  buildDefaultValues,
  validateVariableValues,
} from "@/lib/templates/utils";
import type { UserUsageSnapshot } from "@/lib/usage";
import { getGenerateDisabledHint } from "@/lib/usage/quota-copy";
import type { TemplateFormDetail } from "@/types/template";

type GenerationUsageSnapshot = UserUsageSnapshot;

export type GenerateFormSectionProps = {
  selected: TemplateFormDetail;
  formResetVersion: number;
  userPlan: Plan;
  canGenerateByEmail: boolean;
  canGenerateQuota: boolean;
  isStreaming: boolean;
  generationUsage: GenerationUsageSnapshot;
  /** Called with a snapshot of current field values (identical shape to prior workspace). */
  onGenerate: (values: Record<string, string>) => void;
  /** Clear in-flight request id when the user edits fields. */
  onFormEdit: () => void;
};

/**
 * Owns form field state so typing does not re-render the template picker,
 * usage banner, or other workspace chrome.
 */
export const GenerateFormSection = memo(function GenerateFormSection({
  selected,
  formResetVersion,
  userPlan,
  canGenerateByEmail,
  canGenerateQuota,
  isStreaming,
  generationUsage,
  onGenerate,
  onFormEdit,
}: GenerateFormSectionProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    buildDefaultValues(selected.variables),
  );
  const resetButtonRef = useRef<HTMLButtonElement | null>(null);
  const cancelResetButtonRef = useRef<HTMLButtonElement | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Parent remounts this section on template/reset; keep values aligned if version bumps without remount.
  useEffect(() => {
    setValues(buildDefaultValues(selected.variables));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed by id + reset version
  }, [selected.id, formResetVersion]);

  const isFormAtDefaults = useMemo(
    () => areTemplateValuesAtDefaults(selected.variables, values),
    [selected.variables, values],
  );

  const isFormValid = useMemo(
    () => validateVariableValues(selected.variables, values) === null,
    [selected.variables, values],
  );

  const canGenerate = canGenerateByEmail && canGenerateQuota;

  const generateDisabledHint = getGenerateDisabledHint({
    hasTemplate: true,
    values,
    variableCount: selected.variables.length,
    isFormValid,
    canGenerate,
    isStreaming,
  });

  const handleFieldChange = useCallback(
    (key: string, value: string) => {
      onFormEdit();
      setValues((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [onFormEdit],
  );

  const closeResetDialog = useCallback(() => {
    setResetConfirmOpen(false);
    window.setTimeout(() => resetButtonRef.current?.focus(), 0);
  }, []);

  const resetCurrentForm = useCallback(() => {
    onFormEdit();
    setValues(buildDefaultValues(selected.variables));
  }, [onFormEdit, selected.variables]);

  const handleResetRequest = useCallback(() => {
    if (isFormAtDefaults) return;
    setResetConfirmOpen(true);
  }, [isFormAtDefaults]);

  const handleResetConfirm = useCallback(() => {
    resetCurrentForm();
    closeResetDialog();
  }, [closeResetDialog, resetCurrentForm]);

  const handleGenerateClick = useCallback(() => {
    if (!isFormValid || !canGenerate || isStreaming) return;
    onGenerate({ ...values });
  }, [canGenerate, isFormValid, isStreaming, onGenerate, values]);

  return (
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
              variant={selected.requiredPlan === "pro" ? "pro" : "free"}
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
            onChange={handleFieldChange}
          />
        </CardContent>
      </Card>

      <PromptPreview template={selected} values={values} />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="lg"
          onClick={handleGenerateClick}
          disabled={isStreaming || !isFormValid || !canGenerate}
          title={
            !canGenerateByEmail
              ? "Confirm your email to generate content."
              : !canGenerateQuota
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

        {!canGenerateByEmail ? (
          <span className="text-sm text-muted-foreground">
            Confirm your email to generate content.
          </span>
        ) : (
          !canGenerateQuota && (
            <Link
              href="/pricing"
              className="text-sm font-medium text-primary hover:underline"
            >
              Upgrade to Pro
            </Link>
          )
        )}
      </div>

      {generateDisabledHint && (
        <p className="text-sm text-muted-foreground">{generateDisabledHint}</p>
      )}

      <ResetFormConfirmationDialog
        open={resetConfirmOpen}
        cancelButtonRef={cancelResetButtonRef}
        onCancel={closeResetDialog}
        onConfirm={handleResetConfirm}
      />
    </div>
  );
});

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
