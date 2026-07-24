import { cn } from "@/lib/utils/cn";

/**
 * Compact numeric attention badge for nav links.
 * Hides when count is 0.
 */
export function CountBadge({
  count,
  className,
  label,
  tone = "default",
}: {
  count: number;
  className?: string;
  /** Accessible label, e.g. "open support requests" */
  label?: string;
  tone?: "default" | "attention" | "success";
}) {
  if (!count || count < 1) return null;

  const display = count > 99 ? "99+" : String(count);

  return (
    <span
      className={cn(
        "inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums",
        tone === "attention" &&
          "bg-amber-500/15 text-amber-800 dark:text-amber-200",
        tone === "success" &&
          "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
        tone === "default" && "bg-primary/15 text-primary",
        className,
      )}
      aria-label={label ? `${count} ${label}` : undefined}
    >
      {display}
    </span>
  );
}
