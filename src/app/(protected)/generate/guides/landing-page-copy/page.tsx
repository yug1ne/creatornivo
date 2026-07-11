import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  landingPageCopyFormGroups,
  landingPageCopyFormVariables,
} from "@/config/template-forms/landing-page-copy";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Landing Page Copy field guide",
  description:
    "How to fill Landing Page Copy fields — offer, audience, benefits, proof, CTA, and claim limits.",
};

export default async function LandingPageCopyGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Landing Page Copy — field guide"
      templateSlug="landing-page-copy"
      intro="How to fill the Landing Page Copy form (36 fields). Empty optional sections are fine — the model will not invent pricing, proof, urgency, or privacy claims. Seven Essentials fields are enough for a solid first draft."
      quickStart={[
        "Fill Brand, Offer name, Offer type, Primary goal, Target audience, Core problem, and Main value proposition.",
        "Set Primary CTA and destination URL when you know the conversion action.",
        "Enable Time-sensitive offer or Proof available only when you have real deadlines or approved proof to paste.",
        "Privacy notes appear for conversion paths that collect data; jurisdiction appears for regulated topics.",
      ]}
      groups={landingPageCopyFormGroups}
      variables={landingPageCopyFormVariables}
    />
  );
}
