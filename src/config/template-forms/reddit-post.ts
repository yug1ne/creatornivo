import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./reddit-post-variables.json";

export const REDDIT_POST_GUIDE_PATH = "/generate/guides/reddit-post";

export const redditPostFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const redditPostFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
