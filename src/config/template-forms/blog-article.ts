import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./blog-article-variables.json";

export const BLOG_ARTICLE_GUIDE_PATH = "/generate/guides/blog-article";

export const blogArticleFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const blogArticleFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];

export function getBlogArticleGuideAnchor(key: string): string {
  return `field-${key}`;
}
