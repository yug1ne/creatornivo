import { cn } from "@/lib/utils/cn";

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
  showLabel?: boolean;
}

export function Progress({
  value,
  max = 100,
  className,
  indicatorClassName,
  showLabel,
}: ProgressProps) {
  const percentage = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const isWarning = percentage >= 80 && percentage < 100;
  const isDanger = percentage >= 100;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isDanger
              ? "bg-destructive"
              : isWarning
                ? "bg-warning"
                : "bg-primary",
            indicatorClassName,
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-muted-foreground">
          {value} / {max === Infinity ? "∞" : max}
        </p>
      )}
    </div>
  );
}