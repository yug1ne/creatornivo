import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./etsy-listing-variables.json";

export const ETSY_LISTING_GUIDE_PATH = "/generate/guides/etsy-listing";

export const etsyListingFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const etsyListingFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
