import type { PublicToolFaq } from "@/config/public-tools";

type ToolFaqProps = {
  faqs: PublicToolFaq[];
};

export function ToolFaq({ faqs }: ToolFaqProps) {
  return (
    <div className="space-y-4">
      {faqs.map((faq) => (
        <div
          key={faq.question}
          className="rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-[var(--shadow-sm)]"
        >
          <h3 className="text-base font-semibold text-foreground">
            {faq.question}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {faq.answer}
          </p>
        </div>
      ))}
    </div>
  );
}
