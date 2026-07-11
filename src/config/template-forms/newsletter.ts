import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./newsletter-variables.json";

export const NEWSLETTER_GUIDE_PATH = "/generate/guides/newsletter";

export const newsletterFormGroups: TemplateFormGroup[] = formSchema.groups.map(
  (g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }),
);

export const newsletterFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
