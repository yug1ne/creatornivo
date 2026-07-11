import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./youtube-video-package-variables.json";

export const YOUTUBE_VIDEO_PACKAGE_GUIDE_PATH =
  "/generate/guides/youtube-video-package";

export const youtubeVideoPackageFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const youtubeVideoPackageFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
