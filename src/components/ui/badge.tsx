import { cn } from "@/lib/utils/cn";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "pro" | "free" | "success" | "outline";
  className?: string;
}

const variantStyles = {
  default: "bg-muted text-muted-foreground",
  free: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  pro: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  outline: "border border-border bg-transparent text-muted-foreground",
};

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}