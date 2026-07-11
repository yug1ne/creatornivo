import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./instagram-carousel-variables.json";

export const INSTAGRAM_CAROUSEL_GUIDE_PATH =
  "/generate/guides/instagram-carousel";

export const instagramCarouselFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const instagramCarouselFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
