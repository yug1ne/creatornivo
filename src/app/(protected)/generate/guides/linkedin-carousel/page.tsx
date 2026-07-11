import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  linkedinCarouselFormGroups,
  linkedinCarouselFormVariables,
} from "@/config/template-forms/linkedin-carousel";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "LinkedIn Carousel field guide",
  description:
    "How to fill LinkedIn Carousel fields — topic, structure, slides, caption, hashtags, and compliance.",
};

export default async function LinkedInCarouselGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="LinkedIn Carousel — field guide"
      templateSlug="linkedin-carousel"
      intro="How to fill the LinkedIn Carousel form (36 fields). Empty optional sections are fine — the model will not invent stats, quotes, URLs, or social proof. Six Essentials fields are enough for a solid first document package."
      quickStart={[
        "Fill Carousel topic, Primary goal, Target audience, Core takeaway, Key information, and Output language.",
        "Pick structure, publisher type, slide count, and CTA when you know them; otherwise use defaults.",
        "Paste only verified proof and sources — leave blanks instead of guessing results.",
        "Set Hashtag mode to Custom only when you have fixed campaign tags; custom hashtags appear then.",
      ]}
      groups={linkedinCarouselFormGroups}
      variables={linkedinCarouselFormVariables}
    />
  );
}
