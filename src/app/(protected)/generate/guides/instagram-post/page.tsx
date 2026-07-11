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
    "How to fill Instagram Post fields — caption brief, proof, hashtags, visual concept, and alt text.",
};

export default async function InstagramPostGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Instagram Post — field guide"
      templateSlug="instagram-post"
      intro="How to fill the Instagram Post form (23 fields). Empty optional sections are fine — the model will not invent proof, discounts, engagement bait, or private details. Five Essentials fields are enough for a solid first caption package."
      quickStart={[
        "Fill Post topic, Primary goal, Target audience, Core message, and Output language.",
        "Add Essential details only when names, dates, or terms must appear accurately.",
        "Open Message & Evidence for proof, disclosures, and offer terms (offer fields appear for promotional goals).",
        "Set hashtag strategy and visual format; use Provided only hashtags when the campaign requires fixed tags.",
      ]}
      groups={instagramPostFormGroups}
      variables={instagramPostFormVariables}
    />
  );
}
