import Link from "next/link";

import { ToolDemo } from "@/components/tools/tool-demo";
import { ToolFaq } from "@/components/tools/tool-faq";
import { ToolPageJsonLd } from "@/components/tools/tool-json-ld";
import { ToolRelated } from "@/components/tools/tool-related";
import { ToolSignInLink, ToolTryCta } from "@/components/tools/tool-try-cta";
import { buttonVariants } from "@/components/ui/button";
import {
  getRelatedPublicTools,
  publicToolHowItWorks,
  type PublicTool,
} from "@/config/public-tools";
import { resolvePublicToolDemoFields } from "@/lib/seo/public-tools";

type ToolLandingProps = {
  tool: PublicTool;
};

export function ToolLanding({ tool }: ToolLandingProps) {
  const demoFields = resolvePublicToolDemoFields(tool);
  const related = getRelatedPublicTools(tool);

  return (
    <article className="overflow-x-clip">
      <ToolPageJsonLd tool={tool} />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -right-20 top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.4]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-16">
          <nav
            aria-label="Breadcrumb"
            className="text-sm text-muted-foreground"
          >
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="hover:text-foreground">
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link href="/tools" className="hover:text-foreground">
                  Tools
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li className="text-foreground">{tool.templateTitle}</li>
            </ol>
          </nav>

          <div className="mt-10 grid min-w-0 items-start gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="min-w-0">
              <p className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-[var(--shadow-sm)] sm:px-4">
                {tool.eyebrow}
              </p>
              <h1 className="text-3xl font-bold tracking-tight break-words text-foreground sm:text-4xl lg:text-5xl">
                {tool.h1}
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                {tool.subheading}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {tool.supportingCopy}
              </p>
              <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
                <ToolTryCta
                  templateSlug={tool.templateSlug}
                  label={tool.primaryCtaLabel}
                />
                <Link
                  href="/tools"
                  className={buttonVariants({
                    variant: "outline",
                    size: "lg",
                    className: "w-full min-w-0 sm:w-auto sm:min-w-[220px]",
                  })}
                >
                  Explore all templates
                </Link>
              </div>
              <div className="mt-3">
                <ToolSignInLink templateSlug={tool.templateSlug} />
              </div>
            </div>

            <div className="min-w-0">
              <ToolDemo tool={tool} fields={demoFields} />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/20 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-primary">How it works</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              Four steps, with generation after sign-in
            </h2>
            <p className="mt-4 text-muted-foreground">
              The public page is a preview. The live {tool.templateTitle}{" "}
              template opens in Generate once you are signed in.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {publicToolHowItWorks.map((item) => (
              <div
                key={item.step}
                className="rounded-[var(--radius-lg)] border border-border bg-card p-6 shadow-[var(--shadow-sm)]"
              >
                <span className="text-3xl font-bold text-primary/30">
                  {item.step}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-primary">
              Structured templates
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              {tool.whyStructured.heading}
            </h2>
          </div>
          <div className="space-y-6">
            <div className="rounded-[var(--radius-lg)] border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground">
                Blank chatbot prompt
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {tool.whyStructured.blankPrompt}
              </p>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-primary/25 bg-primary/5 p-6">
              <h3 className="font-semibold text-foreground">
                Structured template workflow
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {tool.whyStructured.structuredWorkflow}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/20 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-primary">In the product</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              What you get after you sign in
            </h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {tool.features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-[var(--radius-lg)] border border-border bg-card p-6 shadow-[var(--shadow-sm)]"
              >
                <h3 className="text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-primary">Use cases</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              Common {tool.platform} drafts
            </h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {tool.useCases.map((useCase) => (
              <div
                key={useCase.title}
                className="rounded-[var(--radius-lg)] border border-border bg-card p-6"
              >
                <h3 className="text-lg font-semibold text-foreground">
                  {useCase.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {useCase.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/20 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-sm font-medium text-primary">FAQ</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              {tool.templateTitle} questions
            </h2>
          </div>
          <div className="mt-10">
            <ToolFaq faqs={tool.faqs} />
          </div>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-medium text-primary">Related tools</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                Other public template pages
              </h2>
            </div>
            <div className="mt-12">
              <ToolRelated tools={related} />
            </div>
          </div>
        </section>
      ) : null}

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-primary/25 bg-gradient-to-br from-primary/5 via-accent/60 to-card px-4 py-10 text-center shadow-[var(--shadow-md)] sm:px-16 sm:py-16">
            <h2 className="text-2xl font-bold tracking-tight break-words text-foreground sm:text-4xl">
              {tool.primaryCtaLabel}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Sign in or create an account to open the {tool.templateTitle}{" "}
              template and generate an editable draft.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4">
              <ToolTryCta
                templateSlug={tool.templateSlug}
                label={tool.primaryCtaLabel}
              />
              <ToolSignInLink templateSlug={tool.templateSlug} />
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}
