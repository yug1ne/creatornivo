import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function TemplatesLoading() {
  return (
    <>
      <PageHeader
        title="Templates"
        description="Browse structured templates for your content"
      />
      <div
        className="space-y-6"
        aria-busy="true"
        aria-label="Loading templates"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-16 rounded-full" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
                <Skeleton className="mt-4 h-12 w-full" />
                <Skeleton className="mt-3 h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
