import Link from "next/link";

import type { GuideArticle, GuideListItem } from "@/config/guides/types";
import { GuideCtaBlock } from "@/components/guides/guide-cta";
import { cn } from "@/lib/utils/cn";

function formatGuideDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

interface GuideArticleViewProps {
  article: GuideArticle;
  related: GuideListItem[];
  className?: string;
}

export function GuideArticleView({
  article,
  related,
  className,
}: GuideArticleViewProps) {
  return (
    <article className={cn("mx-auto max-w-3xl", className)}>
      <header className="border-b border-border pb-8">
        <p className="text-sm font-medium text-primary">
          <Link href="/guides" className="hover:underline">
            Guides
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {article.title}
        </h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          {article.description}
        </p>
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
          <div>
            <dt className="inline font-medium text-foreground">Published: </dt>
            <dd className="inline">{formatGuideDate(article.publishedAt)}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-foreground">Updated: </dt>
            <dd className="inline">{formatGuideDate(article.updatedAt)}</dd>
          </div>
        </dl>
      </header>

      <div className="mt-10 space-y-10">
        {article.sections.map((section, index) => (
          <section key={section.heading ?? `section-${index}`}>
            {section.heading ? (
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {section.heading}
              </h2>
            ) : null}
            {section.paragraphs.map((paragraph) => (
              <p
                key={paragraph.slice(0, 48)}
                className={cn(
                  "leading-relaxed text-muted-foreground",
                  section.heading || section.paragraphs[0] !== paragraph
                    ? "mt-3"
                    : "mt-0",
                )}
              >
                {paragraph}
              </p>
            ))}
            {section.list && section.list.length > 0 ? (
              <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
                {section.list.map((item) => (
                  <li key={item} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <GuideCtaBlock primary={article.primaryCta} className="mt-12" />

      {related.length > 0 ? (
        <aside className="mt-12 border-t border-border pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Related guides
          </h2>
          <ul className="mt-4 space-y-3">
            {related.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/guides/${item.slug}`}
                  className="font-medium text-primary hover:underline"
                >
                  {item.title}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.description}
                </p>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </article>
  );
}
