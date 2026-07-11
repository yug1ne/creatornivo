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
    "How to fill Product Description fields — facts, benefits, purchase details, SEO, and claim limits.",
};

export default async function ProductDescriptionGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Product Description — field guide"
      templateSlug="product-description"
      intro="How to fill the Product Description form (32 fields). Empty optional sections are fine — the model will not invent specs, prices, reviews, delivery promises, or performance guarantees. Seven Essentials fields are enough for a solid first draft."
      quickStart={[
        "Fill Product name, Format, Category, Target customer, Primary goal, Essential product facts, and Main customer benefits.",
        "Set Product format carefully — Physical, Digital, Subscription, and Bundle unlock different purchase fields.",
        "Add only verified features, specs, and proof; leave blanks instead of estimating dimensions or results.",
        "Open Positioning, SEO & Brand for objections, use cases, keywords, and brand voice when you need them.",
      ]}
      groups={productDescriptionFormGroups}
      variables={productDescriptionFormVariables}
    />
  );
}
