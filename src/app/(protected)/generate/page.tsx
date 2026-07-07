import { Suspense } from "react";

import { GenerateWorkspaceSkeleton } from "@/components/generate/generate-workspace-skeleton";
import { GenerateWorkspace } from "@/components/generate/generate-workspace";
import { PageHeader } from "@/components/ui/page-header";
import { canExportContent } from "@/lib/export/permissions";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getUserUsageSnapshot } from "@/lib/usage";
import { getTemplatesForUser } from "@/lib/templates/queries";

export const dynamic = "force-dynamic";

export default async function GeneratePage() {
  const session = await requireSession();

  const [templates, usageSnapshot, savedCount] = await Promise.all([
    getTemplatesForUser(session),
    getUserUsageSnapshot(session.id, session.plan),
    prisma.savedPrompt.count({ where: { userId: session.id } }),
  ]);

  return (
    <>
      <PageHeader
        title="Generate"
        description="Fill in parameters, review the prompt, and get content in real time"
      />

      <Suspense fallback={<GenerateWorkspaceSkeleton />}>
        <GenerateWorkspace
          templates={templates}
          userPlan={session.plan}
          canExport={canExportContent(session)}
          usage={{
            ...usageSnapshot,
            savedCount,
          }}
        />
      </Suspense>
    </>
  );
}
