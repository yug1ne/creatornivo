import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./press-release-variables.json";

export const PRESS_RELEASE_GUIDE_PATH = "/generate/guides/press-release";

export const pressReleaseFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const pressReleaseFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
