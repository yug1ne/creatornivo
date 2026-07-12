import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./telegram-post-variables.json";

export const TELEGRAM_POST_GUIDE_PATH = "/generate/guides/telegram-post";

export const telegramPostFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const telegramPostFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
