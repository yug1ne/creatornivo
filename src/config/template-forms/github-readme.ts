import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./github-readme-variables.json";

export const GITHUB_README_GUIDE_PATH = "/generate/guides/github-readme";

export const githubReadmeFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const githubReadmeFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
