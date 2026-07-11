import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./product-description-variables.json";

export const PRODUCT_DESCRIPTION_GUIDE_PATH =
  "/generate/guides/product-description";

export const productDescriptionFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const productDescriptionFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
