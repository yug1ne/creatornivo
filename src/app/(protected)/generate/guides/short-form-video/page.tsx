import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  shortFormVideoFormGroups,
  shortFormVideoFormVariables,
} from "@/config/template-forms/short-form-video";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Short-Form Video Script field guide",
  description:
    "How to fill Short-Form Video Script fields — topic, platform, production, caption, and accuracy controls.",
};

export default async function ShortFormVideoGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Short-Form Video Script — field guide"
      templateSlug="short-form-video"
      intro="How to fill the Short-Form Video Script form (24 fields). Empty optional sections are fine — the model will not invent stats, offers, testimonials, or footage you cannot shoot. Six Essentials fields are enough for a solid first script package."
      quickStart={[
        "Fill Video topic, Primary goal, Target audience, Main takeaway, Facts to include, and Output language.",
        "Pick platform and duration when you know them; otherwise keep Auto defaults.",
        "Offer details appears only for Promote or sell; custom platform appears only for Other.",
        "List available visuals you can actually shoot (one per line) so directions stay practical.",
      ]}
      groups={shortFormVideoFormGroups}
      variables={shortFormVideoFormVariables}
    />
  );
}
