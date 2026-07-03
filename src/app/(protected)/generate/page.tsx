import { Suspense } from "react";

import { GenerateWorkspace } from "@/components/generate/generate-workspace";
import { PageHeader } from "@/components/ui/page-header";
import { canExportContent } from "@/lib/export/permissions";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getGenerationUsage } from "@/lib/generation/usage-service";
import { getTemplatesForUser } from "@/lib/templates/queries";

export const dynamic = "force-dynamic";

export default async function GeneratePage() {
  const session = await requireSession();

  const [templates, generationUsage, savedCount] = await Promise.all([
    getTemplatesForUser(session),
    getGenerationUsage(session.id, session.plan),
    prisma.savedPrompt.count({ where: { userId: session.id } }),
  ]);

  return (
    <>
      <PageHeader
        title="Generate"
        description="Fill in parameters, review the prompt, and get content in real time"
      />

      <Suspense
        fallback={
          <div className="text-sm text-zinc-500">Loading templates...</div>
        }
      >
        <GenerateWorkspace
          templates={templates}
          userPlan={session.plan}
          canExport={canExportContent(session)}
          usage={{
            generationsUsed: generationUsage.used,
            generationLimit: generationUsage.limit,
            generationPeriod: generationUsage.period,
            savedCount,
          }}
        />
      </Suspense>
    </>
  );
}
