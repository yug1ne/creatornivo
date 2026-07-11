import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  instagramPostFormGroups,
  instagramPostFormVariables,
} from "@/config/template-forms/instagram-post";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Instagram Post field guide",
  description:
    "How to fill every Instagram Post parameter — format, caption, media, offers, and community rules.",
};

export default async function InstagramPostGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Instagram Post — field guide"
      templateSlug="instagram-post"
      intro="How to fill the Instagram Post form. Empty optional fields are fine — the model will not invent personal stories, testimonials, discounts, or engagement bait. Match claims to real product facts and only use media and tags you have rights for."
      quickStart={[
        "Fill Topic, Post type, Audience, Tone, and Language.",
        "Set Post format (photo, carousel, Reel) so the package matches Instagram surfaces.",
        "Add one main message and one desired action — avoid stacking sell + share + DM + event in one post.",
        "Expand Offer, Event, Story, Media, or Partnership only when those details are real and approved.",
      ]}
      groups={instagramPostFormGroups}
      variables={instagramPostFormVariables}
    />
  );
}
