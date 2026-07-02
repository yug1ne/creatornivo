"use client";

import Link from "next/link";
import { useState } from "react";

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
}: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);
  const [message, setMessage] = useState("");

  const buttonClass = buttonVariants({
    variant: "outline",
    size: size === "sm" ? "sm" : "md",
    className: cn(size === "md" && "text-sm"),
  });

  async function handleExport(format: ExportFormat) {
    setMessage("");

    if (!canExport) {
      setMessage(EXPORT_UPGRADE_MESSAGE);
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
        <button
          type="button"
          onClick={() => handleExport("md")}
          disabled={Boolean(isExporting)}
          className={buttonClass}
        >
          {isExporting === "md" ? "Downloading..." : ".md"}
        </button>
        <button
          type="button"
          onClick={() => handleExport("txt")}
          disabled={Boolean(isExporting)}
          className={buttonClass}
        >
          {isExporting === "txt" ? "Downloading..." : ".txt"}
        </button>
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
    </div>
  );
}