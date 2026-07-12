import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./substack-post-variables.json";

export const SUBSTACK_POST_GUIDE_PATH = "/generate/guides/substack-post";

export const substackPostFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const substackPostFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
