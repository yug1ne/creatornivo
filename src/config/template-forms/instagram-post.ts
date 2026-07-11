import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./instagram-post-variables.json";

export const INSTAGRAM_POST_GUIDE_PATH = "/generate/guides/instagram-post";

export const instagramPostFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const instagramPostFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
