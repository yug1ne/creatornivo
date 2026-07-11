import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./pinterest-pin-variables.json";

export const PINTEREST_PIN_GUIDE_PATH = "/generate/guides/pinterest-pin";

export const pinterestPinFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const pinterestPinFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
