import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./youtube-script-variables.json";

export const YOUTUBE_SCRIPT_GUIDE_PATH = "/generate/guides/youtube-script";

export const youtubeScriptFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const youtubeScriptFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
