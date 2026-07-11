import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./linkedin-carousel-variables.json";

export const LINKEDIN_CAROUSEL_GUIDE_PATH = "/generate/guides/linkedin-carousel";

export const linkedinCarouselFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const linkedinCarouselFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
