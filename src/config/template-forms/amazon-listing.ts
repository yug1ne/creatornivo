import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./amazon-listing-variables.json";

export const AMAZON_LISTING_GUIDE_PATH = "/generate/guides/amazon-listing";

export const amazonListingFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const amazonListingFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
