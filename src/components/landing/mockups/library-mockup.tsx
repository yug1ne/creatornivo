import { Badge } from "@/components/ui/badge";

const items = [
  {
    title: "LinkedIn Post — Mar 15, 2026",
    template: "LinkedIn Post",
    preview: "I spent 6 months building in public. Here's what nobody tells you...",
  },
  {
    title: "X Thread — Mar 14, 2026",
    template: "X Thread",
    preview: "1/ Creators don't need more ideas. They need a system...",
  },
];

export function LibraryMockup() {
  return (
    <div className="p-4 text-left sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">Library</p>
          <p className="text-[10px] text-muted-foreground sm:text-xs">
            Your saved prompts and results
          </p>
        </div>
        <span className="rounded-md bg-primary px-3 py-1.5 text-[10px] font-medium text-primary-foreground sm:text-xs">
          New generation
        </span>
      </div>

      <div className="mb-3 rounded-md border border-input bg-background px-3 py-2 text-[10px] text-muted-foreground sm:text-xs">
        Search by title or content...
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-lg border border-border bg-card p-3 shadow-[var(--shadow-sm)]"
          >
            <p className="line-clamp-1 text-xs font-semibold text-foreground">
              {item.title}
            </p>
            <Badge variant="outline" className="mt-1.5 scale-90">
              {item.template}
            </Badge>
            <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
              {item.preview}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}