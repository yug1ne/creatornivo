import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  pinterestPinFormGroups,
  pinterestPinFormVariables,
} from "@/config/template-forms/pinterest-pin";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Pinterest Pin field guide",
  description:
    "How to fill the Pinterest Pin form — subject, goal, audience, destination, search keywords, visual direction, CTA, and disclosure.",
};

export default async function PinterestPinGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Pinterest Pin — field guide"
      templateSlug="pinterest-pin"
      intro="How to fill the Pinterest Pin form for search-aware titles, descriptions, overlay copy, visual direction, and destination-aligned variants. Empty optional fields are fine — the model will make conservative Pinterest-appropriate choices or omit irrelevant elements instead of inventing facts."
      quickStart={[
        "Fill Pin topic or offer, Primary goal, Target audience, Key message and facts, and Output language.",
        "Use Pin format, Destination URL, Destination page summary, Tone, and Number of variants to shape the first usable package.",
        "Open Search & Content when you have priority keywords, a preferred angle, required details, or timing context.",
        "Use Brand & Visual Direction for real assets and style guidance; use Conversion & Requirements for CTA, offer, disclosure, and constraints.",
      ]}
      groups={pinterestPinFormGroups}
      variables={pinterestPinFormVariables}
    />
  );
}
