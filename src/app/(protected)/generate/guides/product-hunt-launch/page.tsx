import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  productHuntLaunchFormGroups,
  productHuntLaunchFormVariables,
} from "@/config/template-forms/product-hunt-launch";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Product Hunt Launch field guide",
  description:
    "How to fill the Product Hunt Launch form - product facts, positioning, proof, maker story, launch assets, CTA, and claim-safety fields.",
};

export default async function ProductHuntLaunchGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Product Hunt Launch - field guide"
      templateSlug="product-hunt-launch"
      intro="How to fill the Product Hunt Launch form. The required fields are enough for a clear first package; optional fields refine positioning, proof, maker story, launch assets, offer details, and regulated-topic handling without inventing missing claims."
      quickStart={[
        "Fill Product name, Product URL, What does the product do?, Who is it for?, Problem it solves, Main user outcome, and Pricing type.",
        "Use Product type, Primary launch goal, and Output language to shape the launch package without over-specifying the copy.",
        "Open Positioning & Evidence when you have concrete features, use cases, differentiation, proof, availability, or competitor context.",
        "Use Maker Story & Offer for first-comment material, requested feedback, maker voice, and a real Product Hunt offer if one exists.",
        "Use Launch Assets & Controls for tags, gallery ideas, demo video, CTA focus, regulated areas, tagline variants, and final constraints.",
      ]}
      groups={productHuntLaunchFormGroups}
      variables={productHuntLaunchFormVariables}
    />
  );
}
