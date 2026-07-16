import { hasProAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { canUseTemplate } from "@/lib/subscriptions/limits";
import type { SessionUser } from "@/types";
import type { TemplateListItem, TemplateVariable } from "@/types/template";

import { parseTemplateVariables } from "./utils";

export type GetTemplatesForUserOptions = {
  /**
   * Include full prompt text for server-rendered generate UI only.
   * Requires a non-null session. Default false — public/API lists never get prompts.
   */
  includePrompt?: boolean;
};

/** Fields needed to build a list item (DB row or test double). */
export type TemplateListSource = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: TemplateListItem["category"];
  prompt: string;
  variables: unknown;
  requiredPlan: TemplateListItem["requiredPlan"];
};

/**
 * Map a template row to a list DTO.
 * When `includePrompt` is false (default for all client paths), `prompt` is omitted.
 */
export function toTemplateListItem(
  template: TemplateListSource,
  options: {
    canAccessPro: boolean;
    includePrompt: boolean;
  },
): TemplateListItem {
  const variables = parseTemplateVariables(template.variables) as TemplateVariable[];
  const isLocked = template.requiredPlan === "pro" && !options.canAccessPro;

  const item: TemplateListItem = {
    id: template.id,
    slug: template.slug,
    title: template.title,
    description: template.description,
    category: template.category,
    variables,
    requiredPlan: template.requiredPlan,
    isLocked,
  };

  // Only attach prompt when explicitly requested for a trusted server-only caller.
  // Client-facing routes must pass includePrompt: false.
  if (options.includePrompt) {
    item.prompt = template.prompt;
  }

  return item;
}

export async function getTemplatesForUser(
  session: SessionUser | null,
  options: GetTemplatesForUserOptions = {},
): Promise<TemplateListItem[]> {
  const canAccessPro = hasProAccess(session);
  // Never leak prompts without a session, even if a caller passes includePrompt: true.
  const includePrompt = Boolean(options.includePrompt && session);

  const templates = await prisma.template.findMany({
    where: { isActive: true },
    orderBy: [{ requiredPlan: "asc" }, { title: "asc" }],
  });

  return templates.map((template) =>
    toTemplateListItem(template, { canAccessPro, includePrompt }),
  );
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
