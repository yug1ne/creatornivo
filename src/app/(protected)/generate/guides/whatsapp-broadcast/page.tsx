import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  whatsappBroadcastFormGroups,
  whatsappBroadcastFormVariables,
} from "@/config/template-forms/whatsapp-broadcast";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "WhatsApp Broadcast field guide",
  description:
    "How to fill the WhatsApp Broadcast form - sender identity, consent, audience, personalization, CTA, timing, opt-out wording, and compliance details.",
};

export default async function WhatsAppBroadcastGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="WhatsApp Broadcast - field guide"
      templateSlug="whatsapp-broadcast"
      intro="How to fill the WhatsApp Broadcast form. The required fields define sender identity, audience, message facts, objective, and consent; optional fields control personalization, timing, tone, offer terms, opt-out wording, sensitive categories, and output quantity."
      quickStart={[
        "Fill Sender or Business Name, What Is This About, Primary Goal, Target Audience, Key Message and Facts, and Recipient Consent Confirmed first.",
        "Use Audience & Personalization only for real recipient relationships and supported merge tokens.",
        "Use Message Style & Timing for supporting facts, tone, length, emoji level, and exact dates or deadlines.",
        "Use Compliance & Output for offer terms, opt-out behavior, sensitive categories, variant count, and must-follow requirements.",
        "Leave optional fields blank when they are not confirmed; the broadcast should omit unsupported details instead of guessing.",
      ]}
      groups={whatsappBroadcastFormGroups}
      variables={whatsappBroadcastFormVariables}
    />
  );
}
