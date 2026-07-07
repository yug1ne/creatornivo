import { earlyAccessConfig } from "@/config/early-access";
import { cn } from "@/lib/utils/cn";

// TODO: Remove after full launch — delete this file and imports in
// `(protected)/layout.tsx` and `(public)/page.tsx`.

interface EarlyAccessStatusBannerProps {
  className?: string;
}

export function EarlyAccessStatusBanner({
  className,
}: EarlyAccessStatusBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "border-b border-border/80 bg-muted/40",
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-2 text-center sm:px-6 sm:py-2.5">
        <p className="max-w-3xl text-pretty text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">
            {earlyAccessConfig.badgeLabel}
          </span>
          {" — "}
          {earlyAccessConfig.statusBannerMessage}
        </p>
      </div>
    </div>
  );
}