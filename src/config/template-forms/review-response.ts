import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./review-response-variables.json";

export const REVIEW_RESPONSE_GUIDE_PATH = "/generate/guides/review-response";

export const reviewResponseFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const reviewResponseFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
