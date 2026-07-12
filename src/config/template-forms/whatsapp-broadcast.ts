import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./whatsapp-broadcast-variables.json";

export const WHATSAPP_BROADCAST_GUIDE_PATH =
  "/generate/guides/whatsapp-broadcast";

export const whatsappBroadcastFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const whatsappBroadcastFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
