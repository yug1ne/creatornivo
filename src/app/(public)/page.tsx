import Link from "next/link";

import { siteConfig } from "@/config/site";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-4 inline-flex rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          AI prompts and content generation
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Create content faster with {siteConfig.name}
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Choose ready-made templates, generate text with AI, and save your best
          prompts in a personal library.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/register" className={buttonVariants({ size: "lg" })}>
            Get started free
          </Link>
          <Link
            href="/pricing"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Compare plans
          </Link>
        </div>
      </div>

      <div className="mt-24 grid gap-6 sm:grid-cols-3">
        {[
          {
            icon: "▦",
            title: "Templates",
            description:
              "Ready-made prompts for social media, blogs, email, and marketing.",
          },
          {
            icon: "✦",
            title: "Generation",
            description:
              "AI creates content from your parameters in seconds.",
          },
          {
            icon: "▤",
            title: "Library",
            description:
              "Save and reuse your best prompts in one place.",
          },
        ].map((feature) => (
          <Card key={feature.title} hover>
            <CardContent className="p-6">
              <span
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-accent text-sm text-accent-foreground"
                aria-hidden
              >
                {feature.icon}
              </span>
              <h3 className="text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}