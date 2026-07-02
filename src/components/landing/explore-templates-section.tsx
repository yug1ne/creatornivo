import Link from "next/link";

import { featuredTemplates } from "@/config/featured-templates";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getCategoryColor,
  getCategoryIcon,
} from "@/config/template-categories";
import { cn } from "@/lib/utils/cn";

export function ExploreTemplatesSection() {
  return (
    <section
      id="templates"
      className="scroll-mt-24 border-y border-border bg-muted/20 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Template library</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Explore templates
          </h2>
          <p className="mt-4 text-muted-foreground">
            15 battle-tested prompts across social, email, marketing, SEO, and
            video. Pick one, fill in a few fields, and generate in seconds.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featuredTemplates.map((template) => (
            <Card
              key={template.slug}
              hover
              className="group flex flex-col overflow-hidden border-border/80 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]"
            >
              <CardContent className="flex flex-1 flex-col p-0">
                <div className="border-b border-border bg-card px-4 py-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-xs font-bold",
                          getCategoryColor(template.category),
                        )}
                        aria-hidden
                      >
                        {getCategoryIcon(template.category)}
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-foreground">
                          {template.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {template.groupLabel}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        template.requiredPlan === "pro" ? "pro" : "free"
                      }
                    >
                      {template.requiredPlan === "pro" ? "Pro" : "Free"}
                    </Badge>
                  </div>
                </div>

                <div className="relative flex-1 bg-muted/40 p-4">
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {template.variables.map((variable) => (
                      <span
                        key={variable}
                        className="rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                      >
                        {variable}
                      </span>
                    ))}
                  </div>

                  <div className="relative overflow-hidden rounded-[var(--radius-md)] border border-border bg-card">
                    <div className="flex items-center gap-1.5 border-b border-border bg-muted/60 px-3 py-2">
                      <span className="h-2 w-2 rounded-full bg-red-400/70" />
                      <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                      <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
                      <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                        Preview
                      </span>
                    </div>
                    <pre className="max-h-36 overflow-hidden whitespace-pre-wrap p-3 font-sans text-[11px] leading-relaxed text-foreground/85">
                      {template.preview}
                    </pre>
                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent"
                      aria-hidden
                    />
                  </div>
                </div>

                <div className="border-t border-border bg-card px-4 py-3">
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {template.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center gap-4 text-center">
          <p className="max-w-lg text-sm text-muted-foreground">
            8 templates free forever. Unlock all 15 — including video scripts,
            landing pages, and ad copy — on Pro.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className={buttonVariants({ size: "lg", className: "min-w-[240px]" })}
            >
              Get started for free
            </Link>
            <Link
              href="/register"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "min-w-[240px]",
              })}
            >
              Browse all 15 templates →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}