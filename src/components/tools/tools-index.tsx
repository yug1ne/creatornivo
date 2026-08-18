import Link from "next/link";

import { ToolsIndexJsonLd } from "@/components/tools/tool-json-ld";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  listPublicTools,
  publicToolsIndex,
} from "@/config/public-tools";
import {
  getCategoryColor,
  getCategoryIcon,
} from "@/config/template-categories";
import { cn } from "@/lib/utils/cn";

export function ToolsIndex() {
  const tools = listPublicTools();

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <ToolsIndexJsonLd />
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-foreground">Tools</li>
        </ol>
      </nav>

      <div className="mx-auto mt-10 max-w-2xl text-center">
        <p className="text-sm font-medium text-primary">Public templates</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {publicToolsIndex.h1}
        </h1>
        <p className="mt-4 text-muted-foreground">{publicToolsIndex.intro}</p>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Card key={tool.slug} hover className="h-full">
            <CardContent className="flex h-full flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-xs font-bold",
                    getCategoryColor(tool.category),
                  )}
                  aria-hidden
                >
                  {getCategoryIcon(tool.category)}
                </span>
                <Badge variant={tool.requiredPlan === "pro" ? "pro" : "free"}>
                  {tool.requiredPlan === "pro" ? "Pro" : "Free"}
                </Badge>
              </div>
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {tool.platform}
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                <Link
                  href={`/tools/${tool.slug}`}
                  className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {tool.h1}
                </Link>
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {tool.subheading}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
