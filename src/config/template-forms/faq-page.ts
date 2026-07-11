import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./faq-page-variables.json";

export const FAQ_PAGE_GUIDE_PATH = "/generate/guides/faq-page";

export const faqPageFormGroups: TemplateFormGroup[] = formSchema.groups.map(
  (g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }),
);

export const faqPageFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
