import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  etsyListingFormGroups,
  etsyListingFormVariables,
} from "@/config/template-forms/etsy-listing";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Etsy Listing field guide",
  description:
    "How to fill the Etsy Listing form - product format, seller role, item facts, fulfillment, SEO, personalization, and claim-safety fields.",
};

export default async function EtsyListingGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Etsy Listing - field guide"
      templateSlug="etsy-listing"
      intro="How to fill the Etsy Listing form. The required fields are enough for a useful first Etsy listing; optional fields refine physical, digital, personalized, vintage, production-partner, SEO, buyer-information, and claim-safety details without inventing unsupported product claims."
      quickStart={[
        "Choose Product format and Your role in creating it before adding the product name, overview, ideal buyer, selling points, and essential facts.",
        "Use Item Details when materials, dimensions, variations, set contents, personalization, vintage condition, or production-partner facts matter.",
        "Open Fulfillment & Buyer Information for shipping, processing, returns, digital files, compatibility, licenses, and buyer instructions.",
        "Use SEO & Brand for priority search phrases, category attributes, title-option count, listing emphasis, shop voice, and required wording.",
        "Use Claims & Restrictions for proof, safety facts, sensitive categories, and any instructions that prevent unsupported claims.",
      ]}
      groups={etsyListingFormGroups}
      variables={etsyListingFormVariables}
    />
  );
}
