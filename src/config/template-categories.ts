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
  youtube: "YouTube / Video",
  seo: "SEO",
  other: "Other",
  facebook_post: "Facebook Post",
  threads_post: "Threads Post",
  pinterest: "Pinterest",
  reddit: "Reddit",
  google_business: "Google Business",
  tiktok: "TikTok",
  ecommerce: "E-commerce",
  community: "Community",
  product_launch: "Product Launch",
  sales: "Sales & Support",
  app_ux: "App & UX",
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
  seo: "⌕",
  other: "◇",
  facebook_post: "f",
  threads_post: "@",
  pinterest: "P",
  reddit: "r/",
  google_business: "G",
  tiktok: "♪",
  ecommerce: "🛒",
  community: "💬",
  product_launch: "🚀",
  sales: "🤝",
  app_ux: "⌘",
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
  seo: "bg-lime-50 text-lime-700 dark:bg-lime-950 dark:text-lime-300",
  other: "bg-muted text-muted-foreground",
  facebook_post: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  threads_post: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  pinterest: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  reddit: "bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  google_business: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  tiktok: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300",
  ecommerce: "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  community: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  product_launch: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  sales: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  app_ux: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
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

/** Public marketing counts — keep in sync with prisma/templates-catalog.json */
export const TEMPLATE_CATALOG_COUNTS = {
  total: 45,
  free: 15,
  pro: 30,
} as const;
