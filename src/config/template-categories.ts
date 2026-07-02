import type { TemplateCategory } from "@/types/template";

export const templateCategoryLabels: Record<TemplateCategory, string> = {
  x_thread: "X Thread",
  linkedin_post: "LinkedIn Post",
  newsletter: "Newsletter",
  instagram_post: "Instagram Post",
  blog: "Blog Article",
  email: "Email",
  marketing: "Marketing",
  product: "Product",
  youtube: "YouTube Script",
  other: "Other",
};

export const templateCategoryIcons: Record<TemplateCategory, string> = {
  x_thread: "𝕏",
  linkedin_post: "in",
  newsletter: "✉",
  instagram_post: "◎",
  blog: "✎",
  email: "📧",
  marketing: "📣",
  product: "📦",
  youtube: "▶",
  other: "◇",
};

export const templateCategoryColors: Record<TemplateCategory, string> = {
  x_thread: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  linkedin_post: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  newsletter: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  instagram_post: "bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
  blog: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  email: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  marketing: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  product: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  youtube: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  other: "bg-muted text-muted-foreground",
};

export function getCategoryLabel(category: TemplateCategory): string {
  return templateCategoryLabels[category] ?? category;
}

export function getCategoryIcon(category: TemplateCategory): string {
  return templateCategoryIcons[category] ?? "◇";
}

export function getCategoryColor(category: TemplateCategory): string {
  return templateCategoryColors[category] ?? templateCategoryColors.other;
}

export const ALL_CATEGORIES = Object.keys(
  templateCategoryLabels,
) as TemplateCategory[];