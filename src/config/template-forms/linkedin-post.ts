import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./linkedin-post-variables.json";

export const LINKEDIN_POST_GUIDE_PATH = "/generate/guides/linkedin-post";

export const linkedinPostFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const linkedinPostFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
