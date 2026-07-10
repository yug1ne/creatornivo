"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { BLOG_ARTICLE_GUIDE_PATH } from "@/config/template-forms/blog-article";
import { cn } from "@/lib/utils/cn";

const GUIDE_PATH_BY_SLUG: Record<string, string> = {
  "blog-article": BLOG_ARTICLE_GUIDE_PATH,
};

interface TemplateHelpButtonProps {
  templateSlug: string;
  className?: string;
}

export function TemplateHelpButton({
  templateSlug,
  className,
}: TemplateHelpButtonProps) {
  const href = GUIDE_PATH_BY_SLUG[templateSlug];
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
