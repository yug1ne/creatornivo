import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./sms-campaign-variables.json";

export const SMS_CAMPAIGN_GUIDE_PATH = "/generate/guides/sms-campaign";

export const smsCampaignFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const smsCampaignFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
