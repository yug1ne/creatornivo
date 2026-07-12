import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./discord-announcement-variables.json";

export const DISCORD_ANNOUNCEMENT_GUIDE_PATH =
  "/generate/guides/discord-announcement";

export const discordAnnouncementFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const discordAnnouncementFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
