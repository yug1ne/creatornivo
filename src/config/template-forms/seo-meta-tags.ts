import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./seo-meta-tags-variables.json";

export const SEO_META_TAGS_GUIDE_PATH = "/generate/guides/seo-meta-tags";

export const seoMetaTagsFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const seoMetaTagsFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
