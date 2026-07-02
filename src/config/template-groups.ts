import type { TemplateCategory } from "@/types/template";

export type TemplateGroupId =
  | "social"
  | "email"
  | "marketing"
  | "content"
  | "seo"
  | "video"
  | "all";

export interface TemplateGroup {
  id: TemplateGroupId;
  label: string;
  categories: TemplateCategory[];
}

export const TEMPLATE_GROUPS: TemplateGroup[] = [
  {
    id: "social",
    label: "Social Media",
    categories: ["x_thread", "linkedin_post", "instagram_post"],
  },
  {
    id: "email",
    label: "Email",
    categories: ["email", "newsletter"],
  },
  {
    id: "marketing",
    label: "Marketing",
    categories: ["marketing", "product"],
  },
  {
    id: "content",
    label: "Content Creation",
    categories: ["blog", "other"],
  },
  {
    id: "seo",
    label: "SEO",
    categories: ["seo"],
  },
  {
    id: "video",
    label: "Video",
    categories: ["youtube"],
  },
];

export function getTemplateGroup(category: TemplateCategory): TemplateGroupId {
  for (const group of TEMPLATE_GROUPS) {
    if (group.categories.includes(category)) {
      return group.id;
    }
  }
  return "content";
}

export function getGroupLabel(groupId: TemplateGroupId): string {
  if (groupId === "all") return "All";
  return TEMPLATE_GROUPS.find((g) => g.id === groupId)?.label ?? "All";
}

export function categoryMatchesGroup(
  category: TemplateCategory,
  groupId: TemplateGroupId,
): boolean {
  if (groupId === "all") return true;
  const group = TEMPLATE_GROUPS.find((g) => g.id === groupId);
  return group?.categories.includes(category) ?? false;
}

export function getGroupsInUse(
  categories: TemplateCategory[],
): TemplateGroup[] {
  const used = new Set(categories.map(getTemplateGroup));
  return TEMPLATE_GROUPS.filter((g) => used.has(g.id));
}