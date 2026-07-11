import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  googleBusinessProfilePostFormGroups,
  googleBusinessProfilePostFormVariables,
} from "@/config/template-forms/google-business-profile-post";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Google Business Profile Post field guide",
  description:
    "How to fill the Google Business Profile Post form - updates, offers, events, CTA, local relevance, and claim-safe details.",
};

export default async function GoogleBusinessProfilePostGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Google Business Profile Post - field guide"
      templateSlug="google-business-profile-post"
      intro="How to fill the compact Google Business Profile Post form. Empty optional fields are fine - the model will omit missing offer, event, link, visual, and brand details instead of inventing prices, dates, locations, terms, or availability."
      quickStart={[
        "Fill Business name, Post type, Primary goal, and Key message and facts.",
        "Use Location or service area, Target customers, Preferred action, Destination URL, and Output language to shape the public post.",
        "Open Offer or Event Details only when Post type is Offer or Event; the title and timing fields become required for those workflows.",
        "Use Local Fit & Brand and Output Options for local context, voice, wording restrictions, variants, visual suggestion, and final requirements.",
      ]}
      groups={googleBusinessProfilePostFormGroups}
      variables={googleBusinessProfilePostFormVariables}
    />
  );
}
