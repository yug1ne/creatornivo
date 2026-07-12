import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./push-notification-variables.json";

export const PUSH_NOTIFICATION_GUIDE_PATH = "/generate/guides/push-notification";

export const pushNotificationFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const pushNotificationFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
