import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./sales-proposal-variables.json";

export const SALES_PROPOSAL_GUIDE_PATH = "/generate/guides/sales-proposal";

export const salesProposalFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const salesProposalFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
