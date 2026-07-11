import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  youtubeScriptFormGroups,
  youtubeScriptFormVariables,
} from "@/config/template-forms/youtube-script";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "YouTube Script field guide",
  description:
    "How to fill YouTube Script fields — topic, structure, production, discovery assets, and accuracy controls.",
};

export default async function YouTubeScriptGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="YouTube Script — field guide"
      templateSlug="youtube-script"
      intro="How to fill the YouTube Script form (40 fields). Empty optional sections are fine — the model will not invent stats, testimonials, footage, or first-hand stories. Seven Essentials fields are enough for a solid first long-form script package."
      quickStart={[
        "Fill Video topic, Primary goal, Target audience, Main viewer promise, Essential points, Video format, and Output language.",
        "Set target duration when you know it; otherwise keep the default (~10 minutes).",
        "List available visuals you can actually shoot so production notes stay practical.",
        "Commercial offer and disclosure fields appear only when a commercial relationship is selected.",
      ]}
      groups={youtubeScriptFormGroups}
      variables={youtubeScriptFormVariables}
    />
  );
}
