import type { CSSProperties } from "react";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils/cn";

interface LogoProps {
  className?: string;
  href?: string;
  onClick?: () => void;
}

/**
 * Theme-aware brand mark (~wordmark size in the header).
 *
 * SVGs use fill="currentColor". We paint via CSS mask + bg-current so color
 * follows text-* classes (default: text-foreground). Asset swap follows the
 * `dark` class on <html> (see ThemeProvider / themeInitScript).
 *
 * Size is controlled on the Link (`h-10` by default). Mark spans use h-full
 * so `className="h-12"` on <Logo /> scales the graphic.
 */
export function Logo({ className, href = "/", onClick }: LogoProps) {
  const markClassName = cn(
    // 360×105 viewBox → ~3.43∶1; at h-10 (~2.5rem) width ≈ 8.6rem
    "block h-full w-auto aspect-[360/105] bg-current",
  );

  const maskStyle = (src: string): CSSProperties => ({
    WebkitMaskImage: `url(${src})`,
    maskImage: `url(${src})`,
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "left center",
    maskPosition: "left center",
  });

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label={siteConfig.name}
      className={cn(
        "inline-flex h-10 shrink-0 items-center text-foreground",
        className,
      )}
    >
      <span
        className={cn(markClassName, "dark:hidden")}
        style={maskStyle("/images/logo-light.svg")}
        aria-hidden
      />
      <span
        className={cn(markClassName, "hidden dark:block")}
        style={maskStyle("/images/logo-dark.svg")}
        aria-hidden
      />
    </Link>
  );
}
