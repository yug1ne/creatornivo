import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  emailSequenceFormGroups,
  emailSequenceFormVariables,
} from "@/config/template-forms/email-sequence";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Email Sequence field guide",
  description:
    "How to fill the Email Sequence form - sequence type, audience, goal, permission context, offer details, proof, brand delivery, and compliance fields.",
};

export default async function EmailSequenceGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Email Sequence - field guide"
      templateSlug="email-sequence"
      intro="How to fill the complex Email Sequence form. The required fields are enough for a valid sequence; optional fields refine the audience journey, proof, cadence, delivery style, and compliance constraints without forcing the model to invent missing facts."
      quickStart={[
        "Fill Sequence name, Sequence type, Primary goal, Business or brand, Offer or topic, Target audience, Key message, Output language, and Contact permission.",
        "Use Number of emails, Sequence depth, Sender name, Primary CTA, and CTA destination URL to control the basic shape and implementation path.",
        "Open Audience & Journey when the sequence depends on awareness level, relationship stage, objections, a trigger event, or approved personalization data.",
        "Use Offer, Proof & Conversion for benefits, pricing, terms, evidence, quotes, deadlines, and fair comparison context.",
        "Use Brand & Delivery and Compliance & Output for tone, cadence, formatting, regulated-topic notes, restrictions, output mode, and plain-text versions.",
      ]}
      groups={emailSequenceFormGroups}
      variables={emailSequenceFormVariables}
    />
  );
}
