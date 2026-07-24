import Link from "next/link";

import type { GuideCta } from "@/config/guides/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const ctaConfig: Record<
  GuideCta,
  { href: string; label: string; secondaryHref: string; secondaryLabel: string }
> = {
  register: {
    href: "/register",
    label: "Get started for free",
    secondaryHref: "/pricing",
    secondaryLabel: "View pricing",
  },
  templates: {
    href: "/templates",
    label: "Browse templates",
    secondaryHref: "/register",
    secondaryLabel: "Create a free account",
  },
  pricing: {
    href: "/pricing",
    label: "View pricing",
    secondaryHref: "/register",
    secondaryLabel: "Get started for free",
  },
  "responsible-use": {
    href: "/responsible-use",
    label: "Read Responsible Use",
    secondaryHref: "/register",
    secondaryLabel: "Get started for free",
  },
};

interface GuideCtaBlockProps {
  primary?: GuideCta;
  className?: string;
}

export function GuideCtaBlock({
  primary = "register",
  className,
}: GuideCtaBlockProps) {
  const config = ctaConfig[primary];

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-muted/30 p-5 sm:p-6",
        className,
      )}
    >
      <p className="text-sm font-medium text-foreground">Next step</p>
      <p className="mt-1 text-sm text-muted-foreground">
        CreatorNivo is AI-assisted template drafting. Review every draft before
        you use it. Self-serve paid checkout may be unavailable—see pricing for
        Early Access options.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={config.href} className={buttonVariants({ size: "sm" })}>
          {config.label}
        </Link>
        <Link
          href={config.secondaryHref}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {config.secondaryLabel}
        </Link>
      </div>
    </div>
  );
}
