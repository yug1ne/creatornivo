"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isTemplateFieldVisible } from "@/lib/templates/utils";
import { cn } from "@/lib/utils/cn";
import type { TemplateFormDetail } from "@/types/template";

interface PromptPreviewProps {
  template: TemplateFormDetail;
  values: Record<string, string>;
}

/**
 * Safe readiness panel — does not receive or display full template prompts.
 * The real prompt is assembled server-side in POST /api/ai/generate.
 */
export function PromptPreview({ template, values }: PromptPreviewProps) {
  const visibleVariables = template.variables.filter((variable) =>
    isTemplateFieldVisible(variable, values),
  );
  const requiredVisible = visibleVariables.filter((v) => v.required);
  const filledRequired = requiredVisible.filter(
    (v) => (values[v.key] ?? "").trim().length > 0,
  );
  const optionalFilled = visibleVariables.filter(
    (v) => !v.required && (values[v.key] ?? "").trim().length > 0,
  );
  const missingRequired = requiredVisible.filter(
    (v) => !(values[v.key] ?? "").trim(),
  );
  const ready = missingRequired.length === 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-1 border-b border-border pb-4">
        <CardTitle className="text-sm">Ready to generate</CardTitle>
        <p className="text-xs text-muted-foreground">
          Your inputs are ready. Creatornivo assembles the final prompt securely
          on the server.
        </p>
      </CardHeader>

      <CardContent className="space-y-3 px-5 py-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 font-medium",
              ready
                ? "border-success/30 bg-success/10 text-success"
                : "border-warning/30 bg-warning/10 text-warning",
            )}
          >
            {ready ? "Inputs complete" : "Required fields missing"}
          </span>
          <span className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-muted-foreground">
            {filledRequired.length}/{requiredVisible.length} required
          </span>
          {optionalFilled.length > 0 && (
            <span className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-muted-foreground">
              {optionalFilled.length} optional filled
            </span>
          )}
        </div>

        <dl className="space-y-1.5 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Template</dt>
            <dd className="truncate font-medium text-foreground">
              {template.title}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Visible fields</dt>
            <dd className="font-medium text-foreground">
              {visibleVariables.length}
            </dd>
          </div>
        </dl>

        {missingRequired.length > 0 ? (
          <p className="rounded-md border border-warning/20 bg-warning/10 px-3 py-2 text-xs text-warning">
            Fill in required fields before generating
            {missingRequired.length <= 4
              ? `: ${missingRequired.map((v) => v.label).join(", ")}`
              : ` (${missingRequired.length} remaining)`}
            .
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            When you click Generate, the server loads the protected template and
            combines it with your form values. The full prompt never leaves the
            server.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
