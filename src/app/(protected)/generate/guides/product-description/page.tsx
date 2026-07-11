import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  productDescriptionFormGroups,
  productDescriptionFormVariables,
} from "@/config/template-forms/product-description";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Product Description field guide",
  description:
    "How to fill every Product Description parameter — audience, features, specs, platform, and claim limits.",
};

export default async function ProductDescriptionGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Product Description — field guide"
      templateSlug="product-description"
      intro="How to fill the Product Description form. Empty optional fields are fine — the model will not invent materials, reviews, certifications, delivery times, or performance guarantees. Only fill what you can verify before publishing."
      quickStart={[
        "Fill Product name, Category, Brand, Product type, Audience, Customer problem, Main purpose, Platform, Tone, and Language.",
        "Add key features and benefits you can stand behind — connect features to real customer outcomes.",
        "Open Specs & package only for confirmed measurements, materials, variants, and package contents.",
        "Set one clear CTA. Leave price, offer, warranty, and shipping blank if not confirmed — placeholders beat fake claims.",
      ]}
      groups={productDescriptionFormGroups}
      variables={productDescriptionFormVariables}
    />
  );
}
