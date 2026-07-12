import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./webinar-package-variables.json";

export const WEBINAR_PACKAGE_GUIDE_PATH = "/generate/guides/webinar-package";

export const webinarPackageFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const webinarPackageFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
