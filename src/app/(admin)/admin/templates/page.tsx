import Link from "next/link";

import { TemplatesTable } from "@/components/admin/templates-table";
import { buttonVariants } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/admin/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminTemplatesPage() {
  await requireAdminPage();

  const templates = await prisma.template.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      requiredPlan: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Templates
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {templates.length} templates in the database
          </p>
        </div>
        <Link
          href="/admin/templates/new"
          className={buttonVariants()}
        >
          + New template
        </Link>
      </div>

      <TemplatesTable
        templates={templates.map((t) => ({
          ...t,
          updatedAt: t.updatedAt.toISOString(),
        }))}
      />
    </>
  );
}