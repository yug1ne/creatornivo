import Link from "next/link";

import type { LegalSection } from "@/config/legal/types";
import { cn } from "@/lib/utils/cn";

interface LegalDocumentProps {
  title: string;
  description: string;
  effectiveDate: string;
  lastUpdated: string;
  sections: LegalSection[];
  contactEmail?: string;
  className?: string;
}

function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
      {items.map((item) => (
        <li key={item} className="leading-relaxed">
          {item}
        </li>
      ))}
    </ul>
  );
}

function LegalSubsections({
  subsections,
}: {
  subsections: NonNullable<LegalSection["subsections"]>;
}) {
  return (
    <div className="mt-6 space-y-6">
      {subsections.map((subsection) => (
        <div key={subsection.title}>
          <h3 className="text-base font-semibold text-foreground">
            {subsection.title}
          </h3>
          {subsection.paragraphs?.map((paragraph) => (
            <p
              key={paragraph}
              className="mt-3 leading-relaxed text-muted-foreground"
            >
              {paragraph}
            </p>
          ))}
          {subsection.list && <LegalList items={subsection.list} />}
        </div>
      ))}
    </div>
  );
}

export function LegalDocument({
  title,
  description,
  effectiveDate,
  lastUpdated,
  sections,
  contactEmail,
  className,
}: LegalDocumentProps) {
  const tocSections = sections.filter((section) => section.id !== "introduction");

  return (
    <article className={cn("mx-auto max-w-3xl", className)}>
      <header className="border-b border-border pb-10">
        <p className="text-sm font-medium text-primary">Legal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          {description}
        </p>
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
          <div>
            <dt className="inline font-medium text-foreground">
              Effective date:{" "}
            </dt>
            <dd className="inline">{effectiveDate}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-foreground">
              Last updated:{" "}
            </dt>
            <dd className="inline">{lastUpdated}</dd>
          </div>
        </dl>
      </header>

      <nav
        aria-label="Table of contents"
        className="mt-10 rounded-[var(--radius-lg)] border border-border bg-muted/30 p-6"
      >
        <h2 className="text-sm font-semibold text-foreground">On this page</h2>
        <ol className="mt-3 columns-1 gap-x-8 space-y-2 text-sm sm:columns-2">
          {tocSections.map((section, index) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                {index + 1}. {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-12 space-y-12">
        {sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-24"
          >
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {section.title}
            </h2>

            {section.paragraphs?.map((paragraph) => (
              <p
                key={paragraph}
                className="mt-4 leading-relaxed text-muted-foreground"
              >
                {paragraph}
              </p>
            ))}

            {section.list && <LegalList items={section.list} />}

            {section.subsections && (
              <LegalSubsections subsections={section.subsections} />
            )}

            {section.id === "contact" && contactEmail && (
              <p className="mt-6 text-sm text-muted-foreground">
                You may also reach us at{" "}
                <Link
                  href={`mailto:${contactEmail}`}
                  className="font-medium text-primary hover:underline"
                >
                  {contactEmail}
                </Link>
                .
              </p>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}