import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  websitePopupFormGroups,
  websitePopupFormVariables,
} from "@/config/template-forms/website-popup";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Website Popup field guide",
  description:
    "How to fill the Website Popup form - goal, offer, audience, facts, CTA, trigger, brand voice, privacy details, and output controls.",
};

export default async function WebsitePopupGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Website Popup - field guide"
      templateSlug="website-popup"
      intro="How to fill the Website Popup form. The required fields define the goal, message, audience, essential facts, and desired visitor action; optional fields control page context, trigger, offer details, brand voice, privacy microcopy, restrictions, and variants."
      quickStart={[
        "Fill Popup Goal, Offer or Message, Target Audience, Essential Facts, and Desired Visitor Action first.",
        "Use the remaining Essentials fields to add page context, destination URL, trigger, tone, and output language.",
        "Use Offer & Conversion only for real incentives, genuine deadlines, and neutral secondary-action wording.",
        "Use Brand & Experience for brand name, voice guidance, format, and length preference.",
        "Use Privacy & Output for collected data, privacy policy URL, restrictions, variant count, and important remaining context.",
      ]}
      groups={websitePopupFormGroups}
      variables={websitePopupFormVariables}
    />
  );
}
