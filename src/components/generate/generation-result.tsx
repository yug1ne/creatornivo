"use client";

import Link from "next/link";
import { useState } from "react";

import { ExportButtons } from "@/components/export/export-buttons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { Badge } from "@/components/ui/badge";

interface GenerationResultProps {
  content: string;
  model: string;
  isStreaming: boolean;
  canSave: boolean;
  canExport: boolean;
  exportTitle: string;
  saveLimitMessage: string | null;
  onSave: () => Promise<{ error?: string; id?: string }>;
  savedPromptId?: string | null;
}

export function GenerationResult({
  content,
  model,
  isStreaming,
  canSave,
  canExport,
  exportTitle,
  saveLimitMessage,
  onSave,
  savedPromptId: initialSavedId,
}: GenerationResultProps) {
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const savedId = initialSavedId;

  async function handleCopy() {
    if (!content) return;

    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSave() {
    setSaveError("");
    setIsSaving(true);

    const result = await onSave();
    setIsSaving(false);

    if (result.error) {
      setSaveError(result.error);
    }
  }

  if (!content && !isStreaming) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b border-border bg-muted/30 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">Result</CardTitle>
            {isStreaming && (
              <Badge variant="success">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                Generating...
              </Badge>
            )}
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{model}</p>
        </div>

        {!isStreaming && content && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={copied ? "secondary" : "outline"}
              size="sm"
              onClick={handleCopy}
            >
              {copied ? "✓ Copied" : "Copy"}
            </Button>

            {savedId ? (
              <Link
                href={`/library/${savedId}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-md)] border border-success/30 bg-success/10 px-3 text-xs font-medium text-success transition-colors hover:bg-success/20"
              >
                ✓ Open in library
              </Link>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !canSave}
                title={saveLimitMessage ?? undefined}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            )}

            <ExportButtons
              canExport={canExport}
              title={exportTitle}
              content={content}
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="scrollbar-thin max-h-[36rem] overflow-y-auto p-0">
        <div className="px-6 py-6">
          <MarkdownContent content={content} isStreaming={isStreaming} />
        </div>
      </CardContent>

      {saveError && (
        <p className="border-t border-border px-6 py-3 text-xs text-destructive">
          {saveError}
        </p>
      )}
    </Card>
  );
}