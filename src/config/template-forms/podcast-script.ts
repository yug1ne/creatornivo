import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./podcast-script-variables.json";

export const PODCAST_SCRIPT_GUIDE_PATH = "/generate/guides/podcast-script";

export const podcastScriptFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const podcastScriptFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
