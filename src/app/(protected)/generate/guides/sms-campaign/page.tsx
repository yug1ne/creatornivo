import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  smsCampaignFormGroups,
  smsCampaignFormVariables,
} from "@/config/template-forms/sms-campaign";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "SMS Campaign field guide",
  description:
    "How to fill the SMS Campaign form - campaign subject, sender, objective, audience, permission basis, CTA link, sequence settings, brand voice, opt-out handling, and message length.",
};

export default async function SmsCampaignGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="SMS Campaign - field guide"
      templateSlug="sms-campaign"
      intro="How to fill the SMS Campaign form. The required fields are enough to generate a concise, consent-aware SMS campaign; optional fields add links, sequencing, timing, personalization, offer terms, exact wording, restrictions, opt-out handling, and conservative length guidance without inventing facts."
      quickStart={[
        "Fill Campaign Subject, Sender Name, Campaign Objective, Target Audience, Essential Message Details, and Recipient Relationship first.",
        "Use Destination URL only when the CTA has a real final link.",
        "Use Campaign Setup for sequences, offer details, dates, timing, and supported personalization fields.",
        "Use Brand & Message for voice notes, exact wording, claims to avoid, and emoji preference.",
        "Use Compliance & Delivery for recipient region, opt-out handling, custom opt-out wording, and message-length target.",
      ]}
      groups={smsCampaignFormGroups}
      variables={smsCampaignFormVariables}
    />
  );
}
