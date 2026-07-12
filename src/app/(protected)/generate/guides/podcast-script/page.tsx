import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  podcastScriptFormGroups,
  podcastScriptFormVariables,
} from "@/config/template-forms/podcast-script";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Podcast Script field guide",
  description:
    "How to fill the Podcast Script form - episode topic, format, audience, structure, voice, guest, sponsor, publishing, discovery, and safety fields.",
};

export default async function PodcastScriptGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Podcast Script - field guide"
      templateSlug="podcast-script"
      intro="How to fill the Podcast Script form. The required fields create a recording-ready episode direction; optional groups refine structure, delivery, guest participation, sponsor handling, publishing context, show notes, discovery, and safety without inventing unsupported facts."
      quickStart={[
        "Fill Episode topic, Primary goal, Target listeners, Core message, Key points and facts, Episode format, Output language, and Target duration first.",
        "Use Host name, Podcast name, Listener action, and Sources when the introduction, closing, or factual basis needs to be specific.",
        "Open Episode Structure to control script detail, opening, segments, required sections, examples, transitions, interaction, and recurring show elements.",
        "Use Voice & Delivery for host style, pacing, energy, language complexity, humor, pronunciation, and banned phrases.",
        "Use Guests, Sponsors & Conversion only when the guest, sponsor, or CTA information is real and approved.",
        "Use Publishing, Discovery & Safety for series context, sensitive subjects, jurisdiction, show notes, keywords, resources, and final production requirements.",
      ]}
      groups={podcastScriptFormGroups}
      variables={podcastScriptFormVariables}
    />
  );
}
