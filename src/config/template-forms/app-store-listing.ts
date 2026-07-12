import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./app-store-listing-variables.json";

export const APP_STORE_LISTING_GUIDE_PATH =
  "/generate/guides/app-store-listing";

export const appStoreListingFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const appStoreListingFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
