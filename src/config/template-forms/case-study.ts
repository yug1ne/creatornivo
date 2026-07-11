import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./case-study-variables.json";

export const CASE_STUDY_GUIDE_PATH = "/generate/guides/case-study";

export const caseStudyFormGroups: TemplateFormGroup[] = formSchema.groups.map(
  (g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }),
);

export const caseStudyFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
