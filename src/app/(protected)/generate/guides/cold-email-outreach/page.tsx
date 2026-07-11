import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  coldEmailOutreachFormGroups,
  coldEmailOutreachFormVariables,
} from "@/config/template-forms/cold-email-outreach";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Cold Email Outreach field guide",
  description:
    "How to fill every Cold Email Outreach parameter — legitimate B2B outreach, data quality, and compliance fields.",
};

export default async function ColdEmailOutreachGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Cold Email Outreach — field guide"
      templateSlug="cold-email-outreach"
      intro="How to fill the Cold Email Outreach form. Empty optional fields are fine — the model will not invent prospect facts, referrals, pricing, or legal compliance. Fill only what you can verify before sending."
      quickStart={[
        "Fill Primary offer, Desired action, Job title, Company name, Problem addressed, Tone, and Language.",
        "Add a real sender name/role and only verified prospect details.",
        "Leave personalization blank unless you have a sourced observation.",
        "Expand Legal, Suppression, and Deliverability only when you have real answers — never invent compliance.",
      ]}
      groups={coldEmailOutreachFormGroups}
      variables={coldEmailOutreachFormVariables}
    />
  );
}
