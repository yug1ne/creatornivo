import type { TemplateCategory } from "@/types/template";

export type TemplateGroupId =
  | "social"
  | "email"
  | "marketing"
  | "content"
  | "seo"
  | "video"
  | "ecommerce"
  | "community"
  | "launch"
  | "app_sales"
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
    categories: [
      "x_thread",
      "linkedin_post",
      "instagram_post",
      "facebook_post",
      "threads_post",
      "pinterest",
      "reddit",
      "google_business",
      "tiktok",
    ],
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
    label: "Video & Audio",
    categories: ["youtube"],
  },
  {
    id: "ecommerce",
    label: "E-commerce",
    categories: ["ecommerce"],
  },
  {
    id: "community",
    label: "Community",
    categories: ["community"],
  },
  {
    id: "launch",
    label: "Product Launch",
    categories: ["product_launch"],
  },
  {
    id: "app_sales",
    label: "App, Sales & Support",
    categories: ["app_ux", "sales"],
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
