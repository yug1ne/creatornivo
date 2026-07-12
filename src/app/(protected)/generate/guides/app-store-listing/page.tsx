import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  appStoreListingFormGroups,
  appStoreListingFormVariables,
} from "@/config/template-forms/app-store-listing";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "App Store Listing field guide",
  description:
    "How to fill the App Store Listing form - app facts, positioning, features, monetization, discovery, visuals, release notes, and compliance fields.",
};

export default async function AppStoreListingGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="App Store Listing - field guide"
      templateSlug="app-store-listing"
      intro="How to fill the App Store Listing form. The required fields are enough for a factual first listing; optional fields refine store destination, positioning, trust details, discovery, visuals, release-note content, and compliance review without inventing unsupported app claims."
      quickStart={[
        "Fill Store destination, App name, What does the app do?, Target users, Core features, Key user benefits, and Output language.",
        "Use App category, Listing goal, Monetization model, and Listing stage to shape the listing package for launch, refresh, or update work.",
        "Open Audience & Positioning when the listing needs stronger problem framing, differentiation, brand voice, or regional context.",
        "Use Product & Trust Details for deeper feature facts, pricing, supported devices, usage requirements, proof, privacy notes, and screenshot context.",
        "Use Discovery, Visuals & Release and Compliance & Output for keyword themes, promo text, existing copy, release notes, sensitive categories, age audience, output modules, and final restrictions.",
      ]}
      groups={appStoreListingFormGroups}
      variables={appStoreListingFormVariables}
    />
  );
}
