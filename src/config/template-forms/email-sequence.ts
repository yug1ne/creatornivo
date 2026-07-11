import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./email-sequence-variables.json";

export const EMAIL_SEQUENCE_GUIDE_PATH = "/generate/guides/email-sequence";

export const emailSequenceFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const emailSequenceFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
