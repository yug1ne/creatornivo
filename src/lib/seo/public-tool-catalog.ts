import type { PublicTool } from "@/config/public-tools";
import { listPublicTools } from "@/config/public-tools";
import {
  getCategoryLabel,
} from "@/config/template-categories";
import {
  categoryMatchesGroup,
  getGroupLabel,
  getGroupsInUse,
  getTemplateGroup,
  type TemplateGroup,
  type TemplateGroupId,
} from "@/config/template-groups";

export type PublicToolCatalogItem = Pick<
  PublicTool,
  | "slug"
  | "templateSlug"
  | "templateTitle"
  | "category"
  | "requiredPlan"
  | "platform"
  | "h1"
  | "subheading"
>;

export function toPublicToolCatalogItems(
  tools: PublicTool[] = listPublicTools(),
): PublicToolCatalogItem[] {
  return tools.map((tool) => ({
    slug: tool.slug,
    templateSlug: tool.templateSlug,
    templateTitle: tool.templateTitle,
    category: tool.category,
    requiredPlan: tool.requiredPlan,
    platform: tool.platform,
    h1: tool.h1,
    subheading: tool.subheading,
  }));
}

export function getPublicToolGroupsInUse(
  tools: PublicToolCatalogItem[] = toPublicToolCatalogItems(),
): TemplateGroup[] {
  return getGroupsInUse(tools.map((tool) => tool.category));
}

export function publicToolMatchesQuery(
  tool: PublicToolCatalogItem,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const haystack = [
    tool.h1,
    tool.templateTitle,
    tool.platform,
    tool.subheading,
    getCategoryLabel(tool.category),
    getGroupLabel(getTemplateGroup(tool.category)),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

export function publicToolMatchesGroup(
  tool: PublicToolCatalogItem,
  groupId: TemplateGroupId,
): boolean {
  return categoryMatchesGroup(tool.category, groupId);
}

export function filterPublicTools(
  tools: PublicToolCatalogItem[],
  query: string,
  groupId: TemplateGroupId,
): PublicToolCatalogItem[] {
  return tools.filter(
    (tool) =>
      publicToolMatchesGroup(tool, groupId) &&
      publicToolMatchesQuery(tool, query),
  );
}

export function getPublicToolHref(slug: string): string {
  return `/tools/${slug}`;
}
