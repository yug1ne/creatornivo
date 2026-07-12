import type { TemplateFormGroup, TemplateVariable } from "@/types/template";

import formSchema from "./product-hunt-launch-variables.json";

export const PRODUCT_HUNT_LAUNCH_GUIDE_PATH =
  "/generate/guides/product-hunt-launch";

export const productHuntLaunchFormGroups: TemplateFormGroup[] =
  formSchema.groups.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    defaultOpen: g.defaultOpen,
  }));

export const productHuntLaunchFormVariables: TemplateVariable[] =
  formSchema.variables as TemplateVariable[];
