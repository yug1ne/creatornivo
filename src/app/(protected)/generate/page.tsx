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

  const [templates, usageSnapshot, savedCount, user] = await Promise.all([
    // Client metadata only — full prompts stay server-side in /api/ai/generate.
    getTemplatesForUser(session, { includePrompt: false }),
    getUserUsageSnapshot(session.id, session.plan),
    prisma.savedPrompt.count({ where: { userId: session.id } }),
    prisma.user.findUnique({
      where: { id: session.id },
      select: { emailVerified: true },
    }),
  ]);

  const emailVerified = Boolean(user?.emailVerified);

  return (
    <>
      <PageHeader
        title="Generate"
        description="Fill in parameters and generate content. The final prompt is assembled securely on the server."
      />

      <Suspense fallback={<GenerateWorkspaceSkeleton />}>
        <GenerateWorkspace
          templates={templates}
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
