import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./landing-page-copy-variables.json";

export const LANDING_PAGE_COPY_GUIDE_PATH = "/generate/guides/landing-page-copy";

export const landingPageCopyFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const landingPageCopyFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
