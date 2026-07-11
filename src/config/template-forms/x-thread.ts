import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./x-thread-variables.json";

export const X_THREAD_GUIDE_PATH = "/generate/guides/x-thread";

export const xThreadFormGroups: TemplateFormGroup[] = formSchema.groups.map(
  (g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }),
);

export const xThreadFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
