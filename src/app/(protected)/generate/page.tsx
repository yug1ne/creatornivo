import { Suspense } from "react";

import { GenerateWorkspaceSkeleton } from "@/components/generate/generate-workspace-skeleton";
import { GenerateWorkspace } from "@/components/generate/generate-workspace";
import { PageHeader } from "@/components/ui/page-header";
import { canExportContent } from "@/lib/export/permissions";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getUserUsageSnapshot } from "@/lib/usage";
import {
  getTemplateCatalogForUser,
  getTemplateFormBySlug,
  resolveInitialCatalogTemplate,
} from "@/lib/templates/queries";

export const dynamic = "force-dynamic";

interface GeneratePageProps {
  searchParams: Promise<{ template?: string }>;
}

export default async function GeneratePage({ searchParams }: GeneratePageProps) {
  const session = await requireSession();
  const { template: templateSlug } = await searchParams;

  const [catalog, usageSnapshot, savedCount, user] = await Promise.all([
    // Lightweight catalog for the picker — full form loads for the selected template only.
    getTemplateCatalogForUser(session),
    getUserUsageSnapshot(session.id, session.plan),
    prisma.savedPrompt.count({ where: { userId: session.id } }),
    prisma.user.findUnique({
      where: { id: session.id },
      select: { emailVerified: true },
    }),
  ]);

  const initialCatalogItem = resolveInitialCatalogTemplate(
    catalog,
    templateSlug,
  );

  // Form schema only for the initial selection (never includes prompt).
  const initialForm = initialCatalogItem
    ? await getTemplateFormBySlug(session, initialCatalogItem.slug)
    : null;

  // Never hand a locked form into the workspace as the active selection.
  const safeInitialForm =
    initialForm && !initialForm.isLocked ? initialForm : null;

  const emailVerified = Boolean(user?.emailVerified);

  return (
    <>
      <PageHeader
        title="Generate"
        description="Fill in parameters and generate content. The final prompt is assembled securely on the server."
      />

      <Suspense fallback={<GenerateWorkspaceSkeleton />}>
        <GenerateWorkspace
          catalog={catalog}
          initialForm={safeInitialForm}
          userPlan={session.plan}
          canExport={canExportContent(session)}
          emailVerified={emailVerified}
          usage={{
            ...usageSnapshot,
            savedCount,
          }}
        />
      </Suspense>
    </>
  );
}
