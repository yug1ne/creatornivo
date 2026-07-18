import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export function FinalCtaSection() {
  return (
    <section className="pb-20 sm:pb-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-primary/25 bg-gradient-to-br from-primary/5 via-accent/60 to-card px-8 py-16 text-center shadow-[var(--shadow-md)] sm:px-16">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-2xl"
            aria-hidden
          />
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Ready to draft your first template-based piece?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Start building a faster, more consistent AI-assisted text content
            workflow — without starting every brief from scratch.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className={buttonVariants({ size: "lg", className: "min-w-[220px]" })}
            >
              Get started for free
            </Link>
            <Link
              href="/login"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "min-w-[220px]",
              })}
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
