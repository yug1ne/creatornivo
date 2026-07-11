import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./threads-post-variables.json";

export const THREADS_POST_GUIDE_PATH = "/generate/guides/threads-post";

export const threadsPostFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const threadsPostFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
