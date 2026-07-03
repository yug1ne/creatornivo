import { generationExamples } from "@/config/pricing-display";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import { ProductScreenshots } from "./product-screenshots";

export function ShowcaseSection() {
  return (
    <section
      id="showcase"
      className="scroll-mt-24 border-y border-border bg-muted/30 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Product tour</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            See Creatornivo in action
          </h2>
          <p className="mt-4 text-muted-foreground">
            Explore the real workflow — from picking a template to saving your
            useful output. Product previews reflect the current workflow.
          </p>
        </div>

        <ProductScreenshots />

        <div className="mt-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-primary">Before → After</p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              From structured inputs to an editable AI-generated draft
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Add the context, generate a draft, then review and edit it for
              your use case.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {generationExamples.map((example, index) => (
              <Card
                key={example.id}
                className="overflow-hidden border-border/80 shadow-[var(--shadow-md)]"
              >
                <CardContent className="p-0">
                  <div className="flex items-center justify-between border-b border-border bg-card px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{example.label}</Badge>
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        Example {index + 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                        Before
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                        After
                      </span>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2">
                    <div className="border-b border-border bg-muted/50 p-5 sm:border-b-0 sm:border-r">
                      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px]">
                          1
                        </span>
                        {example.before.title}
                      </p>
                      <ul className="space-y-2">
                        {example.before.lines.map((line) => (
                          <li
                            key={line}
                            className="rounded-[var(--radius-md)] border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground/80"
                          >
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="relative bg-card p-5">
                      <div
                        className="pointer-events-none absolute inset-y-0 left-0 hidden w-px bg-gradient-to-b from-transparent via-primary/40 to-transparent sm:block"
                        aria-hidden
                      />
                      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">
                          2
                        </span>
                        {example.after.title}
                      </p>
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
                        {example.after.preview}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
