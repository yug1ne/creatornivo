import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  instagramCarouselFormGroups,
  instagramCarouselFormVariables,
} from "@/config/template-forms/instagram-carousel";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Instagram Carousel field guide",
  description:
    "How to fill the Instagram Carousel form — topic, audience, slide flow, visual direction, caption, disclosures, and accessibility.",
};

export default async function InstagramCarouselGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Instagram Carousel — field guide"
      templateSlug="instagram-carousel"
      intro="How to fill the Instagram Carousel form. Empty optional fields are fine — the model will omit missing proof, offers, visual constraints, disclosures, and extra requirements instead of inventing them."
      quickStart={[
        "Fill Topic, Primary goal, Target audience, Main takeaway, Points that must appear, and Output language.",
        "Use Number of slides, Carousel angle, Desired reader action, and Destination URL to shape the carousel structure and CTA.",
        "Open Content & Structure when you have source material, proof, offer terms, examples, or a preferred slide order.",
        "Use Visual Direction & Accessibility for format, image prompts, asset style, brand colors, and alt-text output.",
      ]}
      groups={instagramCarouselFormGroups}
      variables={instagramCarouselFormVariables}
    />
  );
}
