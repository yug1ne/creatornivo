import { Badge } from "@/components/ui/badge";

export function GenerateMockup() {
  return (
    <div className="flex min-h-[320px] text-left text-[11px] sm:min-h-[380px] sm:text-xs">
      <aside className="hidden w-[140px] shrink-0 border-r border-border bg-card p-3 sm:block">
        <p className="mb-2 text-[10px] font-semibold text-muted-foreground">
          Templates
        </p>
        <div className="space-y-1.5">
          <div className="rounded-md border border-primary bg-accent p-2">
            <div className="flex items-center justify-between gap-1">
              <span className="font-medium text-foreground">LinkedIn Post</span>
              <Badge variant="free" className="scale-75">Free</Badge>
            </div>
          </div>
          {["X Thread", "Newsletter"].map((t) => (
            <div
              key={t}
              className="rounded-md border border-border p-2 text-muted-foreground"
            >
              {t}
            </div>
          ))}
        </div>
      </aside>

      <div className="min-w-0 flex-1 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            in
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-foreground sm:text-sm">
                LinkedIn Post
              </h3>
              <Badge variant="outline" className="scale-90">
                LinkedIn Post
              </Badge>
            </div>
            <p className="mt-0.5 text-muted-foreground">
              Professional post with a story or insight
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-card p-3">
          <p className="font-medium text-foreground">Parameters</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {[
              ["Topic", "SaaS launch lessons"],
              ["Tone", "honest, founder"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <div className="mt-0.5 rounded-md border border-input bg-background px-2 py-1.5 text-foreground">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
          <p className="font-medium text-foreground">Prompt preview</p>
          <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
            Write a LinkedIn post about{" "}
            <span className="rounded bg-emerald-100 px-1 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              SaaS launch lessons
            </span>
            . Tone: honest...
          </p>
        </div>

        <div className="mt-3 inline-flex rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">
          Generate
        </div>
      </div>
    </div>
  );
}