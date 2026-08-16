import { Suspense } from "react";

import { GenerateWorkspaceSkeleton } from "@/components/generate/generate-workspace-skeleton";
import { GenerateWorkspace } from "@/components/generate/generate-workspace";
import { PageHeader } from "@/components/ui/page-header";
import {
  clearStaleSessionAndRedirect,
  isStaleSessionUsageError,
} from "@/lib/auth/stale-session";
import { requireSession } from "@/lib/auth/session";
import { isAdminSession } from "@/lib/admin/is-admin-session";
import { countActiveAppSumoRedemptions } from "@/lib/appsumo/entitlement";
import { prisma } from "@/lib/db";
import {
  getEffectiveUsageSnapshot,
  resolveUserAccess,
} from "@/lib/trial/access";
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

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      emailVerified: true,
      plan: true,
      trialStartedAt: true,
      trialEndsAt: true,
    },
  });

  if (!user) {
    return clearStaleSessionAndRedirect();
  }

  const access = resolveUserAccess(user, {
    isAdmin: isAdminSession(session),
    activeAppSumoCodeCount: await countActiveAppSumoRedemptions(session.id),
  });
  const serverSession = { ...session, plan: user.plan };

  let usageSnapshot: Awaited<ReturnType<typeof getEffectiveUsageSnapshot>>;
  try {
    usageSnapshot = await getEffectiveUsageSnapshot(session.id, access);
  } catch (error) {
    if (isStaleSessionUsageError(error)) {
      await clearStaleSessionAndRedirect();
    }
    throw error;
  }

  const [catalog, savedCount] = await Promise.all([
    // Lightweight catalog for the picker — full form loads for the selected template only.
    getTemplateCatalogForUser(serverSession),
    prisma.savedPrompt.count({ where: { userId: session.id } }),
  ]);

  const initialCatalogItem = resolveInitialCatalogTemplate(
    catalog,
    templateSlug,
  );

  // Form schema only for the initial selection (never includes prompt).
  const initialForm = initialCatalogItem
    ? await getTemplateFormBySlug(serverSession, initialCatalogItem.slug)
    : null;

  // Never hand a locked form into the workspace as the active selection.
  const safeInitialForm =
    initialForm && !initialForm.isLocked ? initialForm : null;

  const emailVerified = Boolean(user.emailVerified);

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
          userPlan={user.plan}
          canExport={access.canExport}
          maxSavedPrompts={access.maxSavedPrompts}
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
