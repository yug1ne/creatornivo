import { howItWorksSteps } from "@/config/pricing-display";

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-24 border-y border-border bg-muted/20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">How it works</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Four steps from idea to editable draft
          </h2>
          <p className="mt-4 text-muted-foreground">
            No blank-page struggle. Pick a business template, fill the fields,
            and get an AI-assisted draft to review.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {howItWorksSteps.map((item) => (
            <div
              key={item.step}
              className="relative rounded-[var(--radius-lg)] border border-border bg-card p-6 shadow-[var(--shadow-sm)]"
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
  );
}
