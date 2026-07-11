import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./tiktok-caption-variables.json";

export const TIKTOK_CAPTION_GUIDE_PATH = "/generate/guides/tiktok-caption";

export const tiktokCaptionFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const tiktokCaptionFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
