import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  kickstarterCampaignFormGroups,
  kickstarterCampaignFormVariables,
} from "@/config/template-forms/kickstarter-campaign";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Kickstarter Campaign field guide",
  description:
    "How to fill the Kickstarter Campaign form - project, audience, funding, rewards, story, production, risks, media, and claim-safety settings.",
};

export default async function KickstarterCampaignGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Kickstarter Campaign - field guide"
      templateSlug="kickstarter-campaign"
      intro="How to fill the Kickstarter Campaign form. The required fields are enough to create a credible first campaign draft; optional fields improve story depth, reward clarity, funding transparency, production planning, fulfillment detail, media direction, and claim-safety review without inventing facts."
      quickStart={[
        "Fill Project Name, Project Category, Project Summary, Primary Backers, Funding Goal, Funding Currency, Funding Purpose, and Reward Tiers first.",
        "Use Story & Positioning when you have origin, differentiation, progress, creator credibility, or approved validation details.",
        "Use Rewards & Funding for reward format, limited rewards, shipping, budget, stretch goals, duration, and launch timing.",
        "Use Delivery & Risk to explain production, milestones, fulfillment, partners, risks, mitigation, and prototype evidence.",
        "Use Voice, Media & Compliance for tone, narrative voice, media assets, video output, source material, sensitive claims, and restrictions.",
      ]}
      groups={kickstarterCampaignFormGroups}
      variables={kickstarterCampaignFormVariables}
    />
  );
}
