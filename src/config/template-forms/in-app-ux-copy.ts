import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./in-app-ux-copy-variables.json";

export const IN_APP_UX_COPY_GUIDE_PATH =
  "/generate/guides/in-app-ux-copy";

export const inAppUxCopyFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const inAppUxCopyFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
