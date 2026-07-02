import { cn } from "@/lib/utils/cn";

interface BrowserFrameProps {
  children: React.ReactNode;
  url?: string;
  className?: string;
  glow?: boolean;
}

export function BrowserFrame({
  children,
  url = "app.creatornivo.com/generate",
  className,
  glow = false,
}: BrowserFrameProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card shadow-[var(--shadow-md)]",
        glow && "ring-1 ring-primary/20 shadow-primary/10",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-3">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="mx-auto flex h-7 min-w-0 max-w-[240px] flex-1 items-center justify-center rounded-md bg-background/80 px-3 sm:max-w-xs">
          <span className="truncate text-[11px] text-muted-foreground">{url}</span>
        </div>
      </div>
      <div className="relative bg-background">{children}</div>
    </div>
  );
}