import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./website-popup-variables.json";

export const WEBSITE_POPUP_GUIDE_PATH = "/generate/guides/website-popup";

export const websitePopupFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const websitePopupFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
