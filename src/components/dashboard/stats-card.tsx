import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";

interface StatsCardProps {
  label: string;
  value: string;
  description?: string;
  icon: string;
  progress?: {
    current: number;
    max: number;
  };
  href?: string;
  hrefLabel?: string;
  className?: string;
}

export function StatsCard({
  label,
  value,
  description,
  icon,
  progress,
  href,
  hrefLabel,
  className,
}: StatsCardProps) {
  return (
    <Card hover={Boolean(href)} className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {value}
            </p>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent text-sm text-accent-foreground"
            aria-hidden
          >
            {icon}
          </span>
        </div>

        {progress && progress.max !== Infinity && (
          <div className="mt-4">
            <Progress value={progress.current} max={progress.max} />
          </div>
        )}

        {href && hrefLabel && (
          <Link
            href={href}
            className="mt-4 inline-flex text-xs font-medium text-primary hover:underline"
          >
            {hrefLabel} →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}