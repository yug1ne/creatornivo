"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fillPromptTemplate } from "@/lib/templates/utils";
import { cn } from "@/lib/utils/cn";
import type { TemplateListItem } from "@/types/template";

interface PromptPreviewProps {
  template: TemplateListItem;
  values: Record<string, string>;
}

const PROTECTED_NOTICE = "Промпт защищён";
const NOTICE_MS = 2200;

export function PromptPreview({ template, values }: PromptPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showProtectedNotice, setShowProtectedNotice] = useState(false);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filledPrompt = fillPromptTemplate(
    template.prompt,
    values,
    template.variables,
  );
  const hasEmptyRequired = template.variables.some(
    (v) => v.required && !values[v.key]?.trim(),
  );
  const charCount = filledPrompt.length;

  const flashProtectedNotice = useCallback(() => {
    setShowProtectedNotice(true);
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = setTimeout(() => {
      setShowProtectedNotice(false);
      noticeTimerRef.current = null;
    }, NOTICE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      flashProtectedNotice();
    },
    [flashProtectedNotice],
  );

  const handleCopy = useCallback(
    (event: React.ClipboardEvent) => {
      event.preventDefault();
      event.clipboardData?.setData("text/plain", "");
      flashProtectedNotice();
    },
    [flashProtectedNotice],
  );

  const handleCut = useCallback(
    (event: React.ClipboardEvent) => {
      event.preventDefault();
      event.clipboardData?.setData("text/plain", "");
      flashProtectedNotice();
    },
    [flashProtectedNotice],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isMod = event.ctrlKey || event.metaKey;
      if (!isMod) return;

      // Block common copy shortcuts while focus is in the preview body
      if (key === "c" || key === "x" || key === "a") {
        event.preventDefault();
        event.stopPropagation();
        flashProtectedNotice();
      }
    },
    [flashProtectedNotice],
  );

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
            "relative scrollbar-thin overflow-y-auto px-5 py-4",
            isExpanded ? "max-h-96" : "max-h-40",
          )}
          onContextMenu={handleContextMenu}
          onCopy={handleCopy}
          onCut={handleCut}
          onKeyDown={handleKeyDown}
          // tabIndex so keydown works when the block is focused
          tabIndex={0}
          role="region"
          aria-label="Protected prompt preview"
        >
          {/* Watermark overlay — visual friction, does not block scroll */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 overflow-hidden select-none"
          >
            <div
              className="absolute inset-[-20%] flex flex-wrap content-center justify-center gap-x-10 gap-y-8 opacity-[0.07] dark:opacity-[0.1]"
              style={{ transform: "rotate(-18deg)" }}
            >
              {Array.from({ length: 24 }).map((_, i) => (
                <span
                  key={i}
                  className="whitespace-nowrap text-sm font-semibold tracking-widest text-foreground"
                >
                  Creatornivo
                </span>
              ))}
            </div>
          </div>

          <pre
            className={cn(
              "relative z-0 whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/80",
              "select-none",
              "[-webkit-user-select:none] [-moz-user-select:none] [user-select:none]",
            )}
            // Extra hard block for selection APIs
            onMouseDown={(e) => {
              // Allow focusing the region for keyboard handling, but avoid drag-select
              if (e.detail > 1) {
                e.preventDefault();
              }
            }}
          >
            {filledPrompt}
          </pre>

          {showProtectedNotice && (
            <div
              className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-md border border-border bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-md backdrop-blur-sm"
              role="status"
              aria-live="polite"
            >
              {PROTECTED_NOTICE}
            </div>
          )}
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
