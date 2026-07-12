import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./kickstarter-campaign-variables.json";

export const KICKSTARTER_CAMPAIGN_GUIDE_PATH =
  "/generate/guides/kickstarter-campaign";

export const kickstarterCampaignFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const kickstarterCampaignFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
