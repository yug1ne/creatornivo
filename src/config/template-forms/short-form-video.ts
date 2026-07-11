import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./short-form-video-variables.json";

export const SHORT_FORM_VIDEO_GUIDE_PATH = "/generate/guides/short-form-video";

export const shortFormVideoFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const shortFormVideoFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
