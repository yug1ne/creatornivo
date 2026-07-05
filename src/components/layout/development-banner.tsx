import { cn } from "@/lib/utils/cn";

// TODO: Удалить после запуска — временный development banner
// (удалить этот файл и импорты в `src/app/(public)/page.tsx` и `src/app/(protected)/dashboard/page.tsx`)

const DEVELOPMENT_BANNER_MESSAGE =
  "Creatornivo is under active development. A full platform launch is planned in the near future.";

interface DevelopmentBannerProps {
  className?: string;
}

export function DevelopmentBanner({ className }: DevelopmentBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "border-b border-warning/30 bg-warning/10",
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-2.5 text-center sm:px-6 sm:py-3">
        <p className="max-w-3xl text-pretty text-sm leading-relaxed text-foreground">
          {DEVELOPMENT_BANNER_MESSAGE}
        </p>
      </div>
    </div>
  );
}