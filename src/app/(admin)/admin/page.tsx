import Link from "next/link";

import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { requireAdminPage } from "@/lib/admin/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdminPage();

  const templateCount = await prisma.template.count();

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Admin dashboard
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Manage Creatornivo templates and content
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link href="/admin/templates">
          <Card hover className="h-full">
            <CardContent className="p-6">
              <CardTitle>Templates</CardTitle>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {templateCount}
              </p>
              <CardDescription className="mt-1">
                CRUD, categories, plans
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Card className="opacity-60">
          <CardContent className="p-6">
            <CardTitle>Users</CardTitle>
            <CardDescription className="mt-1">Coming soon</CardDescription>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardContent className="p-6">
            <CardTitle>Analytics</CardTitle>
            <CardDescription className="mt-1">Coming soon</CardDescription>
          </CardContent>
        </Card>
      </div>
    </>
  );
}