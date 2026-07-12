import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./quora-answer-variables.json";

export const QUORA_ANSWER_GUIDE_PATH = "/generate/guides/quora-answer";

export const quoraAnswerFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const quoraAnswerFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
