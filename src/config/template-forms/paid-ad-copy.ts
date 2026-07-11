import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./paid-ad-copy-variables.json";

export const PAID_AD_COPY_GUIDE_PATH = "/generate/guides/paid-ad-copy";

export const paidAdCopyFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const paidAdCopyFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
