import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOnboardingStarterGenerateUrl } from "@/config/onboarding";

interface RecentPrompt {
  id: string;
  title: string;
  updatedAt: Date;
  templateTitle: string | null;
}

interface DashboardRecentSavesProps {
  prompts: RecentPrompt[];
}

export function DashboardRecentSaves({ prompts }: DashboardRecentSavesProps) {
  if (prompts.length === 0) {
    return (
      <Card className="mt-8 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-14 text-center">
          <span
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-2xl text-muted-foreground"
            aria-hidden
          >
            ▤
          </span>
          <p className="text-sm font-medium text-foreground">No saved content yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Pick a template, generate your first draft, then save it here.
          </p>
          <Link
            href={getOnboardingStarterGenerateUrl()}
            className={buttonVariants({ className: "mt-6" })}
          >
            Start with LinkedIn Post
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Recent saves</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {prompts.map((prompt) => (
          <Link
            key={prompt.id}
            href={`/library/${prompt.id}`}
            className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-border p-4 transition-colors hover:bg-muted/50"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{prompt.title}</p>
              {prompt.templateTitle && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {prompt.templateTitle}
                </p>
              )}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {prompt.updatedAt.toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}