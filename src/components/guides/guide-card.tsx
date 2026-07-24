import Link from "next/link";

import type { GuideListItem } from "@/config/guides/types";
import { Card, CardContent } from "@/components/ui/card";

const categoryLabels: Record<GuideListItem["category"], string> = {
  product: "Product",
  workflow: "Workflow",
  "how-to": "How-to",
  "responsible-use": "Responsible use",
};

function formatGuideDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

interface GuideCardProps {
  guide: GuideListItem;
}

export function GuideCard({ guide }: GuideCardProps) {
  return (
    <Card className="h-full transition-colors hover:border-primary/40">
      <CardContent className="flex h-full flex-col p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          {categoryLabels[guide.category]}
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
          <Link
            href={`/guides/${guide.slug}`}
            className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {guide.title}
          </Link>
        </h2>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          {guide.description}
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Updated {formatGuideDate(guide.updatedAt)}
        </p>
      </CardContent>
    </Card>
  );
}
