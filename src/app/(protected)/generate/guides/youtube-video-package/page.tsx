import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  youtubeVideoPackageFormGroups,
  youtubeVideoPackageFormVariables,
} from "@/config/template-forms/youtube-video-package";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "YouTube Video Package field guide",
  description:
    "How to fill the YouTube Video Package form - strategy, script depth, retention, titles, thumbnails, production, metadata, disclosure, and safety fields.",
};

export default async function YouTubeVideoPackageGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="YouTube Video Package - field guide"
      templateSlug="youtube-video-package"
      intro="How to fill the complex YouTube Video Package form. Empty optional fields are fine - the model will omit missing sources, links, production assets, promotions, jurisdiction details, and privacy constraints instead of inventing them."
      quickStart={[
        "Fill Video topic or offer, Primary goal, Target audience, Main viewer takeaway, Essential facts, Video format, Script format, and Target duration.",
        "Use Output language, Tone, Channel context, and Primary call to action to make the package fit the creator and audience.",
        "Open Content & Retention when you need a specific opening, pacing, examples, source material, or must-include and must-avoid details.",
        "Use Discovery & Packaging for search intent, title angles, thumbnail direction, description links, and packaging limits.",
        "Use Channel, Brand & Production and Monetization, Safety & Final Settings for feasible production notes, disclosure, regulated topics, privacy, and final constraints.",
      ]}
      groups={youtubeVideoPackageFormGroups}
      variables={youtubeVideoPackageFormVariables}
    />
  );
}
