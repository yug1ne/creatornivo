import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { PublicTool } from "@/config/public-tools";
import {
  getCategoryColor,
  getCategoryIcon,
} from "@/config/template-categories";
import { cn } from "@/lib/utils/cn";

type ToolRelatedProps = {
  tools: PublicTool[];
};

export function ToolRelated({ tools }: ToolRelatedProps) {
  if (tools.length === 0) return null;

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => (
        <Card key={tool.slug} hover className="h-full">
          <CardContent className="flex h-full flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-xs font-bold",
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
            <h3 className="mt-3 text-base font-semibold text-foreground">
              <Link
                href={`/tools/${tool.slug}`}
                className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {tool.h1}
              </Link>
            </h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              {tool.subheading}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
