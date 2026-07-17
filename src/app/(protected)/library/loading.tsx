import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LibraryLoading() {
  return (
    <>
      <PageHeader
        title="Library"
        description="Your saved prompts and generation results"
      />
      <div
        className="space-y-6"
        aria-busy="true"
        aria-label="Loading library"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-36" />
        </div>
        <Skeleton className="h-3 w-32" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-5">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="mt-2 h-5 w-24" />
                <Skeleton className="mt-3 h-12 w-full" />
                <Skeleton className="mt-4 h-3 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
