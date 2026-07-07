import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function GenerateWorkspaceSkeleton() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Loading generate workspace"
    >
      {/* Usage banner */}
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((item) => (
            <Card key={item}>
              <CardContent className="p-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-2 h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-40" />
                <Skeleton className="mt-3 h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Template sidebar */}
        <aside className="space-y-4">
          <div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-3 w-36" />
          </div>
          <Skeleton className="h-10 w-full" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-7 w-16 rounded-full" />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[var(--radius-lg)] border border-border p-4"
              >
                <div className="flex items-start gap-3">
                  <Skeleton className="h-9 w-9 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Parameters + actions */}
        <div className="min-w-0 space-y-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 shrink-0 rounded-[var(--radius-lg)]" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          </div>

          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="grid gap-4 pt-0 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </CardContent>
          </Card>

          <Skeleton className="h-11 w-32" />
        </div>
      </div>
    </div>
  );
}