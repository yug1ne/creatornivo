"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { getTemplateGuidePath } from "@/config/template-guide-paths";
import { cn } from "@/lib/utils/cn";

interface TemplateHelpButtonProps {
  templateSlug: string;
  className?: string;
}

/**
 * Opens the field Help guide for the selected template.
 * Imports only the paths-only registry — never form schemas or prompt text.
 */
export function TemplateHelpButton({
  templateSlug,
  className,
}: TemplateHelpButtonProps) {
  const href = getTemplateGuidePath(templateSlug);
  if (!href) return null;

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "gap-1.5",
        className,
      )}
      title="Open field guide in a new tab"
    >
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs font-semibold"
        aria-hidden
      >
        ?
      </span>
      Help
    </Link>
  );
}
