"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fillPromptTemplate } from "@/lib/templates/utils";
import { cn } from "@/lib/utils/cn";
import type { TemplateListItem } from "@/types/template";

interface PromptPreviewProps {
  template: TemplateListItem;
  values: Record<string, string>;
}

function highlightVariables(
  prompt: string,
  values: Record<string, string>,
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\{\{(\w+)\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(prompt)) !== null) {
    if (match.index > lastIndex) {
      parts.push(prompt.slice(lastIndex, match.index));
    }

    const key = match[1];
    const value = values[key]?.trim();
    const isFilled = Boolean(value);

    parts.push(
      <span
        key={`${key}-${match.index}`}
        className={cn(
          "rounded px-1 py-0.5 font-semibold",
          isFilled
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
        )}
      >
        {isFilled ? value : `{{${key}}}`}
      </span>,
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < prompt.length) {
    parts.push(prompt.slice(lastIndex));
  }

  return parts;
}

export function PromptPreview({ template, values }: PromptPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const filledPrompt = fillPromptTemplate(template.prompt, values);
  const hasEmptyRequired = template.variables.some(
    (v) => v.required && !values[v.key]?.trim(),
  );
  const charCount = filledPrompt.length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border pb-4">
        <div>
          <CardTitle className="text-sm">Prompt preview</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            This exact text will be sent to AI · {charCount} characters
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          {isExpanded ? "Collapse" : "Expand"}
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        <div
          className={cn(
            "scrollbar-thin overflow-y-auto px-5 py-4",
            isExpanded ? "max-h-96" : "max-h-40",
          )}
        >
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/80">
            {highlightVariables(template.prompt, values)}
          </pre>
        </div>

        {hasEmptyRequired && (
          <p className="border-t border-border bg-warning/10 px-5 py-2.5 text-xs text-warning">
            Fill in required fields before generating
          </p>
        )}
      </CardContent>
    </Card>
  );
}