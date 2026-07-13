"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EXPORT_UPGRADE_MESSAGE } from "@/lib/export/permissions";
import { cn } from "@/lib/utils/cn";
import type { ExportFormat } from "@/lib/export/utils";

interface ExportButtonsProps {
  canExport: boolean;
  title: string;
  content?: string;
  promptId?: string;
  size?: "sm" | "md";
  contentValidationMessage?: string | null;
}

const EXPORT_OPTIONS: {
  format: ExportFormat;
  label: string;
  title: string;
}[] = [
  {
    format: "md",
    label: "Markdown",
    title: "Download as Markdown (.md)",
  },
  {
    format: "txt",
    label: "Plain text",
    title: "Download as plain text (.txt)",
  },
];

function LockIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

async function downloadFromResponse(response: Response) {
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const filenameMatch = disposition?.match(/filename="(.+)"/);
  const filename = filenameMatch?.[1] ?? "creatornivo-export";

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function ExportButtons({
  canExport,
  title,
  content,
  promptId,
  size = "sm",
  contentValidationMessage,
}: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);
  const [message, setMessage] = useState("");

  const buttonClass = buttonVariants({
    variant: "outline",
    size: size === "sm" ? "sm" : "md",
    className: cn(
      "inline-flex items-center gap-1.5",
      size === "md" && "text-sm",
    ),
  });

  const lockedButtonClass = cn(
    buttonClass,
    "cursor-pointer opacity-75 hover:opacity-100",
  );

  async function handleExport(format: ExportFormat) {
    setMessage("");

    if (!canExport) {
      return;
    }

    if (contentValidationMessage) {
      setMessage(contentValidationMessage);
      return;
    }

    setIsExporting(format);

    try {
      let response: Response;

      if (promptId) {
        response = await fetch(`/api/library/${promptId}/export?format=${format}`);
      } else if (content) {
        response = await fetch("/api/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, format, title }),
        });
      } else {
        setMessage("No content to export");
        setIsExporting(null);
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        setMessage(data.error ?? "Export failed");
        setIsExporting(null);
        return;
      }

      await downloadFromResponse(response);
    } catch {
      setMessage("Failed to download file");
    }

    setIsExporting(null);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {EXPORT_OPTIONS.map((option) =>
          canExport ? (
            <button
              key={option.format}
              type="button"
              onClick={() => handleExport(option.format)}
              disabled={Boolean(isExporting) || Boolean(contentValidationMessage)}
              title={contentValidationMessage ?? option.title}
              className={buttonClass}
            >
              {isExporting === option.format
                ? "Downloading..."
                : `Export ${option.label}`}
            </button>
          ) : (
            <Link
              key={option.format}
              href="/pricing"
              title={`${option.title} — Pro plan required`}
              className={lockedButtonClass}
            >
              <LockIcon />
              <span>Export {option.label}</span>
              <Badge variant="pro" className="px-1.5 py-0 text-[10px]">
                Pro
              </Badge>
            </Link>
          ),
        )}
      </div>

      {message && (
        <p className="mt-2 text-xs text-warning">
          {message}{" "}
          {!canExport && (
            <Link href="/pricing" className="font-medium underline">
              Upgrade to Pro
            </Link>
          )}
        </p>
      )}

      {!canExport && !message && (
        <p className="sr-only">{EXPORT_UPGRADE_MESSAGE}</p>
      )}
    </div>
  );
}
