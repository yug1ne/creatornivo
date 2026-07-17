import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your account and subscription"
      />
      <div
        className="max-w-lg space-y-6"
        aria-busy="true"
        aria-label="Loading settings"
      >
        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-40" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
