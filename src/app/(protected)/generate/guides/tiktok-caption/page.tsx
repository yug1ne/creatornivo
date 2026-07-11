import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  tiktokCaptionFormGroups,
  tiktokCaptionFormVariables,
} from "@/config/template-forms/tiktok-caption";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "TikTok Caption field guide",
  description:
    "How to fill the TikTok Caption form - video context, goal, audience, caption length, CTA, hashtags, disclosures, and safeguards.",
};

export default async function TikTokCaptionGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="TikTok Caption - field guide"
      templateSlug="tiktok-caption"
      intro="How to fill the compact TikTok Caption form. Empty optional fields are fine - the model will infer neutral choices or omit CTA, offer, disclosure, hashtag, hook, claim, and privacy details instead of inventing them."
      quickStart={[
        "Fill Video topic, What happens in the video?, Primary goal, Target audience, and Key message.",
        "Use Video format, Output language, Caption length, Number of variants, and Post relationship to shape the basic result.",
        "Open Voice & Conversion when you need a specific tone, opening style, CTA, emoji level, offer detail, or disclosure wording.",
        "Use Discovery & Safeguards for the on-screen hook, hashtag handling, approved claims, privacy limits, and final requirements.",
      ]}
      groups={tiktokCaptionFormGroups}
      variables={tiktokCaptionFormVariables}
    />
  );
}
