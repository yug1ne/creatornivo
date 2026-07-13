"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  outputValidationMessage?: string | null;
}

function isSaveLimitError(message: string): boolean {
  return /save limit|limit reached/i.test(message);
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
  outputValidationMessage,
}: GenerationResultProps) {
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedId, setSavedId] = useState<string | null>(initialSavedId ?? null);
  const [saveSuccessFlash, setSaveSuccessFlash] = useState(false);

  useEffect(() => {
    if (initialSavedId) {
      // Keep the local saved-link state synchronized with the server response.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSavedId(initialSavedId);
    }
  }, [initialSavedId]);

  async function handleCopy() {
    if (!content) return;
    if (outputValidationMessage) {
      setSaveError(outputValidationMessage);
      return;
    }

    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSave() {
    setSaveError("");
    setSaveSuccessFlash(false);
    setIsSaving(true);

    const result = await onSave();
    setIsSaving(false);

    if (result.error) {
      setSaveError(result.error);
      return;
    }

    if (result.id) {
      setSavedId(result.id);
      setSaveSuccessFlash(true);
      window.setTimeout(() => setSaveSuccessFlash(false), 2000);
    }
  }

  if (!content && !isStreaming) return null;
  const hasOutputValidationError = Boolean(outputValidationMessage);

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
            {saveSuccessFlash && (
              <Badge variant="success">Saved to library</Badge>
            )}
            {hasOutputValidationError && (
              <Badge className="bg-destructive/10 text-destructive">
                Output validation failed
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
              disabled={hasOutputValidationError}
              title={outputValidationMessage ?? undefined}
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
                disabled={isSaving || !canSave || hasOutputValidationError}
                title={outputValidationMessage ?? saveLimitMessage ?? undefined}
                data-onboarding="save-to-library"
              >
                {isSaving ? "Saving..." : "Save to library"}
              </Button>
            )}

            <ExportButtons
              canExport={canExport}
              title={exportTitle}
              content={content}
              contentValidationMessage={outputValidationMessage}
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="scrollbar-thin max-h-[36rem] overflow-y-auto p-0">
        {outputValidationMessage && !isStreaming && (
          <div
            className="border-b border-destructive/20 bg-destructive/10 px-6 py-3 text-sm text-destructive"
            role="alert"
          >
            {outputValidationMessage}
          </div>
        )}
        <div className="px-6 py-6">
          <MarkdownContent content={content} isStreaming={isStreaming} />
        </div>
      </CardContent>

      {saveError && (
        <div
          className="border-t border-destructive/20 bg-destructive/10 px-6 py-3 text-sm text-destructive"
          role="alert"
        >
          <p>{saveError}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="border-destructive/30 bg-background/80 text-destructive hover:bg-background"
            >
              {isSaving ? "Saving..." : "Try again"}
            </Button>
            {(saveLimitMessage || isSaveLimitError(saveError)) && (
              <Link
                href="/library"
                className="text-sm font-medium underline hover:no-underline"
              >
                Manage library
              </Link>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
