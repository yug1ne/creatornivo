import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./facebook-post-variables.json";

export const FACEBOOK_POST_GUIDE_PATH = "/generate/guides/facebook-post";

export const facebookPostFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const facebookPostFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
