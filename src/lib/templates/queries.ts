import { hasProAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { canUseTemplate } from "@/lib/subscriptions/limits";
import type { SessionUser } from "@/types";
import type {
  TemplateCatalogItem,
  TemplateFormDetail,
  TemplateListItem,
  TemplateVariable,
} from "@/types/template";

import { parseTemplateVariables } from "./utils";

export type GetTemplatesForUserOptions = {
  /**
   * Include full prompt text for trusted server-only callers.
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
  /** Only present when selected from DB with includePrompt. */
  prompt?: string;
  variables: unknown;
  requiredPlan: TemplateListItem["requiredPlan"];
};

/** Metadata + variables (never prompt) for catalog / form mapping. */
export type TemplateMetaSource = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: TemplateCatalogItem["category"];
  variables: unknown;
  requiredPlan: TemplateCatalogItem["requiredPlan"];
};

const templateCatalogSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  category: true,
  variables: true,
  requiredPlan: true,
} as const;

const templateListSelectWithoutPrompt = {
  ...templateCatalogSelect,
} as const;

const templateListSelectWithPrompt = {
  ...templateCatalogSelect,
  prompt: true,
} as const;

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
  const variables = parseTemplateVariables(
    template.variables,
  ) as TemplateVariable[];
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
  if (options.includePrompt && template.prompt !== undefined) {
    item.prompt = template.prompt;
  }

  return item;
}

/**
 * Count variables without full parseTemplateVariables walk.
 * Catalog only needs a number for UI badges.
 */
export function countTemplateVariablesLightweight(variables: unknown): number {
  if (!Array.isArray(variables)) return 0;
  return variables.length;
}

/** Catalog card DTO — never includes prompt or full variables. */
export function toTemplateCatalogItem(
  template: TemplateMetaSource,
  options: { canAccessPro: boolean },
): TemplateCatalogItem {
  const isLocked = template.requiredPlan === "pro" && !options.canAccessPro;

  return {
    id: template.id,
    slug: template.slug,
    title: template.title,
    description: template.description,
    category: template.category,
    requiredPlan: template.requiredPlan,
    isLocked,
    variableCount: countTemplateVariablesLightweight(template.variables),
  };
}

/**
 * Strip guide-only `help` blocks from form DTOs sent to the client.
 * Keep labels, hints, options, grouping, showWhen, validation metadata.
 */
export function stripHelpFromFormVariables(
  variables: TemplateVariable[],
): TemplateVariable[] {
  return variables.map((variable) => {
    if (variable.help === undefined) return variable;
    const { help: _help, ...rest } = variable;
    void _help;
    return rest;
  });
}

/** Form DTO for one template — variables only, never prompt. */
export function toTemplateFormDetail(
  template: TemplateMetaSource,
  options: { canAccessPro: boolean },
): TemplateFormDetail {
  const variables = stripHelpFromFormVariables(
    parseTemplateVariables(template.variables) as TemplateVariable[],
  );
  const isLocked = template.requiredPlan === "pro" && !options.canAccessPro;

  return {
    id: template.id,
    slug: template.slug,
    title: template.title,
    description: template.description,
    category: template.category,
    variables,
    requiredPlan: template.requiredPlan,
    isLocked,
  };
}

/**
 * Lightweight catalog for grids/pickers.
 * Selects metadata + variables (for count only); never selects prompt.
 */
export async function getTemplateCatalogForUser(
  session: SessionUser | null,
): Promise<TemplateCatalogItem[]> {
  const canAccessPro = hasProAccess(session);

  const templates = await prisma.template.findMany({
    where: { isActive: true },
    orderBy: [{ requiredPlan: "asc" }, { title: "asc" }],
    select: templateCatalogSelect,
  });

  return templates.map((template) =>
    toTemplateCatalogItem(template, { canAccessPro }),
  );
}

/**
 * Form schema for one template by slug.
 * Never returns or selects prompt. Locked templates still return form metadata
 * with isLocked=true (picker prevents use; generate API enforces access).
 */
export async function getTemplateFormBySlug(
  session: SessionUser | null,
  slug: string,
): Promise<TemplateFormDetail | null> {
  const canAccessPro = hasProAccess(session);

  const template = await prisma.template.findFirst({
    where: { slug, isActive: true },
    select: templateCatalogSelect,
  });

  if (!template) return null;

  return toTemplateFormDetail(template, { canAccessPro });
}

/**
 * Full list with variables (optional prompt for trusted server callers).
 * When includePrompt is false, prompt column is not selected from DB.
 */
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
    select: includePrompt
      ? templateListSelectWithPrompt
      : templateListSelectWithoutPrompt,
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

/** Resolve initial generate selection from catalog + optional ?template= slug. */
export function resolveInitialCatalogTemplate(
  catalog: TemplateCatalogItem[],
  templateSlug: string | null | undefined,
): TemplateCatalogItem | null {
  const accessible = catalog.filter((item) => !item.isLocked);
  if (accessible.length === 0) return null;

  if (templateSlug) {
    const match = accessible.find((item) => item.slug === templateSlug);
    if (match) return match;
  }

  return accessible[0] ?? null;
}
