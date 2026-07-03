import { Card, CardContent } from "@/components/ui/card";

const workflowBenefits = [
  {
    title: "Start with a reusable structure",
    text: "Choose a template instead of rebuilding every prompt from scratch.",
  },
  {
    title: "Keep your content consistent",
    text: "Reuse the same tone, format, and workflow across different projects.",
  },
  {
    title: "Save what actually works",
    text: "Store useful prompts and generated content in one personal library.",
  },
] as const;

export function SocialProofSection() {
  return (
    <section className="relative py-20 sm:py-28">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
        aria-hidden
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">
            Built for real content workflows
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Less prompt rewriting. More finished content.
          </h2>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {workflowBenefits.map((benefit) => (
            <Card key={benefit.title} hover className="flex flex-col">
              <CardContent className="flex flex-1 flex-col p-6">
                <h3 className="text-base font-semibold text-foreground">
                  {benefit.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {benefit.text}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
