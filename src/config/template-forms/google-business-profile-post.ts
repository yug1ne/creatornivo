import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./google-business-profile-post-variables.json";

export const GOOGLE_BUSINESS_PROFILE_POST_GUIDE_PATH =
  "/generate/guides/google-business-profile-post";

export const googleBusinessProfilePostFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const googleBusinessProfilePostFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
