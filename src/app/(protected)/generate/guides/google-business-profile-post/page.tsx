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
    "How to fill every Google Business Profile post parameter — location, hours, offers, events, and CTA facts.",
};

export default async function GoogleBusinessProfilePostGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Google Business Profile Post — field guide"
      templateSlug="google-business-profile-post"
      intro="How to fill the Google Business Profile post form. Empty optional fields are fine — the model will not invent hours, prices, service areas, or local landmarks. Match every claim to the live profile for the correct location."
      quickStart={[
        "Fill Business name, Topic, Post type, Audience, Tone, and Language.",
        "Confirm location / service area only as they appear on the real profile.",
        "Add one main message and one desired action that matches an available CTA if you use one.",
        "Expand Hours, Offer, or Event only when those details are verified — update profile fields too when hours change.",
      ]}
      groups={googleBusinessProfilePostFormGroups}
      variables={googleBusinessProfilePostFormVariables}
    />
  );
}
