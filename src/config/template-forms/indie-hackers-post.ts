import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./indie-hackers-post-variables.json";

export const INDIE_HACKERS_POST_GUIDE_PATH =
  "/generate/guides/indie-hackers-post";

export const indieHackersPostFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const indieHackersPostFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
