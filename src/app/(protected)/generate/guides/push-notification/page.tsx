import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  pushNotificationFormGroups,
  pushNotificationFormVariables,
} from "@/config/template-forms/push-notification";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Push Notification field guide",
  description:
    "How to fill the Push Notification form - subject, goal, audience, key message, tap destination, timing, title mode, urgency, brand voice, personalization, and claim-safety settings.",
};

export default async function PushNotificationGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Push Notification - field guide"
      templateSlug="push-notification"
      intro="How to fill the Push Notification form. The required fields are enough to create concise, action-focused mobile or web push notifications; optional fields refine timing, title/body structure, urgency, brand voice, personalization tokens, sensitive-category handling, and claim restrictions without inventing facts."
      quickStart={[
        "Fill Campaign Subject, Primary Goal, Target Audience, Key Message and Facts, and Tap Destination first.",
        "Use Notification Type, Urgency Level, Output Language, and Number of Variants to control the basic output shape.",
        "Use Message & Delivery for timing, expiration, title/body structure, tone, and emoji choices.",
        "Use Brand & Personalization for sender context, voice, supported tokens, and CTA preferences.",
        "Use Compliance & Restrictions for sensitive categories, jurisdiction, required disclosures, claim restrictions, and final requirements.",
      ]}
      groups={pushNotificationFormGroups}
      variables={pushNotificationFormVariables}
    />
  );
}
