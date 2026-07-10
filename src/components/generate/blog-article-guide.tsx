import Link from "next/link";

import {
  blogArticleFormGroups,
  blogArticleFormVariables,
  getBlogArticleGuideAnchor,
} from "@/config/template-forms/blog-article";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BlogArticleGuide() {
  const byGroup = new Map<string, typeof blogArticleFormVariables>();
  for (const variable of blogArticleFormVariables) {
    const g = variable.group || "other";
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(variable);
  }

  const required = blogArticleFormVariables.filter((v) => v.required);

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <Link
            href="/generate?template=blog-article"
            className="text-primary hover:underline"
          >
            ← Back to Generate
          </Link>
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Blog Article — field guide
        </h1>
        <p className="text-muted-foreground">
          How to fill the Blog Article form. Empty optional fields are fine —
          the model will not invent missing facts, sources, or credentials.
          Only the four required fields must be filled to generate.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick start</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ol className="list-decimal space-y-2 pl-5 text-foreground">
            <li>
              Fill <strong>Topic</strong>, <strong>Primary keyword</strong>,{" "}
              <strong>Audience</strong>, and <strong>Language</strong>.
            </li>
            <li>
              Add <strong>Article type</strong>, <strong>Search intent</strong>,
              and the reader’s main question when you know them.
            </li>
            <li>
              Paste only <strong>approved sources and facts</strong> you can
              stand behind. Leave blanks instead of guessing.
            </li>
            <li>
              Expand advanced sections (SEO, monetization, YMYL) only when
              relevant.
            </li>
          </ol>
          <p>
            Required now:{" "}
            {required.map((v) => v.label).join(", ")}.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sections</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="columns-1 gap-x-8 text-sm sm:columns-2">
            {blogArticleFormGroups.map((group) => (
              <li key={group.id} className="mb-1.5 break-inside-avoid">
                <a
                  href={`#group-${group.id}`}
                  className="text-primary hover:underline"
                >
                  {group.title}
                </a>
                <span className="text-muted-foreground">
                  {" "}
                  ({byGroup.get(group.id)?.length ?? 0})
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {blogArticleFormGroups.map((group) => {
        const fields = byGroup.get(group.id) ?? [];
        if (fields.length === 0) return null;

        return (
          <section
            key={group.id}
            id={`group-${group.id}`}
            className="scroll-mt-24 space-y-4"
          >
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {group.title}
              </h2>
              {group.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {group.description}
                </p>
              )}
            </div>

            <div className="space-y-4">
              {fields.map((field) => {
                const help = field.help;
                return (
                  <article
                    key={field.key}
                    id={getBlogArticleGuideAnchor(field.key)}
                    className="scroll-mt-24 rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-[var(--shadow-sm)]"
                  >
                    <h3 className="text-base font-semibold text-foreground">
                      {field.label}
                      {field.required && (
                        <span className="ml-1 text-sm font-normal text-destructive">
                          required
                        </span>
                      )}
                    </h3>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {`{{${field.key}}}`}
                      {field.type && field.type !== "text"
                        ? ` · ${field.type}`
                        : ""}
                    </p>

                    <dl className="mt-3 space-y-2 text-sm">
                      <div>
                        <dt className="font-medium text-foreground">What</dt>
                        <dd className="text-muted-foreground">
                          {help?.what ?? field.hint ?? field.label}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">Why</dt>
                        <dd className="text-muted-foreground">
                          {help?.why ??
                            "Gives the model real context so it does not invent details."}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">
                          Better to write
                        </dt>
                        <dd className="text-muted-foreground">
                          {help?.example ??
                            field.placeholder ??
                            "A short, factual value you can verify."}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">Avoid</dt>
                        <dd className="text-muted-foreground">
                          {help?.avoid ??
                            "Invented stats, fake credentials, or copied competitor wording."}
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      <p className="text-center text-sm text-muted-foreground">
        {blogArticleFormVariables.length} fields documented · prompt text is not
        modified by this guide
      </p>
    </div>
  );
}
