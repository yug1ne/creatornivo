import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  getCategoryColor,
  getCategoryIcon,
  getCategoryLabel,
} from "@/config/template-categories";
import { getSession } from "@/lib/auth/session";
import { getTemplatesForUser } from "@/lib/templates/queries";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const session = await getSession();
  const templates = await getTemplatesForUser(session);

  return (
    <>
      <PageHeader
        title="Templates"
        description="Choose a template and customize parameters for your task"
        action={
          <Link href="/generate" className={buttonVariants()}>
            Start generating
          </Link>
        }
      />

      <div
        data-onboarding="templates-grid"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {templates.map((template) => (
          <Card
            key={template.id}
            hover={!template.isLocked}
            className={cn(
              "flex flex-col",
              template.isLocked && "opacity-70",
            )}
          >
            <CardContent className="flex flex-1 flex-col p-5">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-xs font-bold",
                    getCategoryColor(template.category),
                  )}
                  aria-hidden
                >
                  {getCategoryIcon(template.category)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground">
                      {template.title}
                    </h3>
                    <Badge
                      variant={
                        template.requiredPlan === "pro" ? "pro" : "free"
                      }
                    >
                      {template.requiredPlan === "pro" ? "Pro" : "Free"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getCategoryLabel(template.category)}
                  </p>
                </div>
              </div>

              <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                {template.description}
              </p>
            </CardContent>

            <CardFooter className="border-t border-border p-5 pt-4">
              {template.isLocked ? (
                <p className="text-xs text-warning">
                  Available on the{" "}
                  <Link href="/pricing" className="font-medium underline">
                    Pro
                  </Link>
                </p>
              ) : (
                <Link
                  href={`/generate?template=${template.slug}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Use →
                </Link>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  );
}