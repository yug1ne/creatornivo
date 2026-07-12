import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  amazonListingFormGroups,
  amazonListingFormVariables,
} from "@/config/template-forms/amazon-listing";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Amazon Listing field guide",
  description:
    "How to fill the Amazon Listing form - marketplace, product facts, purchase details, search positioning, compliance, variations, and source fields.",
};

export default async function AmazonListingGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Amazon Listing - field guide"
      templateSlug="amazon-listing"
      intro="How to fill the Amazon Listing form. The required fields are enough for a useful first listing; optional fields refine purchase facts, search positioning, compliance evidence, variation handling, existing copy, and source material without inventing unsupported product claims."
      quickStart={[
        "Fill Amazon Marketplace, Product Name, Product Category, Target Customer, and Verified Product Facts.",
        "Use Output Language, Brand Name, Key Differentiators, Primary Use Cases, and Primary Listing Goal to shape the listing without overloading the first draft.",
        "Open Product Facts & Purchase Info when dimensions, materials, contents, compatibility, care, safety, or warranty details affect the purchase decision.",
        "Use Search & Positioning for keyword research, positioning angle, tone, and wording restrictions.",
        "Use Compliance, Variations & Sources for regulated claims, Seller Central rules, variation families, existing listings, source material, and final constraints.",
      ]}
      groups={amazonListingFormGroups}
      variables={amazonListingFormVariables}
    />
  );
}
