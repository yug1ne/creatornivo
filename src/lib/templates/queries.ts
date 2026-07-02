import { hasProAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { canUseTemplate } from "@/lib/subscriptions/limits";
import type { Plan } from "@/config/plans";
import type { SessionUser } from "@/types";
import type { TemplateListItem } from "@/types/template";

import { parseTemplateVariables } from "./utils";

export async function getTemplatesForUser(
  session: SessionUser | null,
): Promise<TemplateListItem[]> {
  const userPlan: Plan = session?.plan ?? "free";
  const canAccessPro = hasProAccess(session);

  const templates = await prisma.template.findMany({
    where: { isActive: true },
    orderBy: [{ requiredPlan: "asc" }, { title: "asc" }],
  });

  return templates.map((template) => {
    const variables = parseTemplateVariables(template.variables);
    const isLocked =
      template.requiredPlan === "pro" && !canAccessPro;

    return {
      id: template.id,
      slug: template.slug,
      title: template.title,
      description: template.description,
      category: template.category,
      prompt: template.prompt,
      variables,
      requiredPlan: template.requiredPlan,
      isLocked,
    };
  });
}

export async function getTemplateBySlug(slug: string) {
  return prisma.template.findUnique({
    where: { slug, isActive: true },
  });
}

export async function assertTemplateAccess(
  session: SessionUser,
  templateId: string,
) {
  const template = await prisma.template.findUnique({
    where: { id: templateId, isActive: true },
  });

  if (!template) {
    return { error: "Template not found", status: 404 as const, template: null };
  }

  if (!canUseTemplate(session.plan, template.requiredPlan)) {
    return {
      error: "This template is only available on the Pro plan",
      status: 403 as const,
      template: null,
    };
  }

  return { error: null, status: null, template };
}

export async function countGenerationsToday(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return prisma.generation.count({
    where: {
      userId,
      createdAt: { gte: startOfDay },
    },
  });
}