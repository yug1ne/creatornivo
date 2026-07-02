import { Suspense } from "react";

import { GenerateWorkspace } from "@/components/generate/generate-workspace";
import { PageHeader } from "@/components/ui/page-header";
import { canExportContent } from "@/lib/export/permissions";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { countGenerationsToday, getTemplatesForUser } from "@/lib/templates/queries";

export const dynamic = "force-dynamic";

export default async function GeneratePage() {
  const session = await requireSession();

  const [templates, generationsToday, savedCount] = await Promise.all([
    getTemplatesForUser(session),
    countGenerationsToday(session.id),
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
          usage={{ generationsToday, savedCount }}
        />
      </Suspense>
    </>
  );
}