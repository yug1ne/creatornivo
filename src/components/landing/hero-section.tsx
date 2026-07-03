import Link from "next/link";

import { siteConfig } from "@/config/site";
import { buttonVariants } from "@/components/ui/button";

import { HeroVisual } from "./hero-visual";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -right-20 top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-accent blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 sm:pb-32 sm:pt-20 lg:pb-36 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="text-center lg:text-left">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-[var(--shadow-sm)] backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Built for AI-native creators
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
              Ship content{" "}
              <span className="bg-gradient-to-r from-primary via-primary to-primary/50 bg-clip-text text-transparent">
                10x faster
              </span>{" "}
              with proven AI prompts
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground lg:mx-0">
              {siteConfig.name} gives marketers, indie hackers, and creators
              ready-made templates, real-time generation, and a library — so you
              publish more without the blank-page anxiety.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
              <Link
                href="/register"
                className={buttonVariants({
                  size: "lg",
                  className: "min-w-[220px] shadow-lg shadow-primary/25",
                })}
              >
                Get started for free
              </Link>
              <Link
                href="#showcase"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "min-w-[220px]",
                })}
              >
                See the product
              </Link>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required · 5 free generations per day
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground lg:justify-start">
              {["Templates", "Live preview", "Library", "Export"].map(
                (item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <span className="text-success">✓</span>
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>

          <div className="relative lg:pl-4">
            <HeroVisual />
          </div>
        </div>
      </div>
    </section>
  );
}
