import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./cold-email-outreach-variables.json";

export const COLD_EMAIL_OUTREACH_GUIDE_PATH =
  "/generate/guides/cold-email-outreach";

export const coldEmailOutreachFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const coldEmailOutreachFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];

export function getColdEmailGuideAnchor(key: string): string {
  return `field-${key}`;
}
