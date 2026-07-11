import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  paidAdCopyFormGroups,
  paidAdCopyFormVariables,
} from "@/config/template-forms/paid-ad-copy";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Paid Ad Copy field guide",
  description:
    "How to fill Paid Ad Copy fields — platform, offer, audience, proof, creative context, and compliance.",
};

export default async function PaidAdCopyGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Paid Ad Copy — field guide"
      templateSlug="paid-ad-copy"
      intro="How to fill the Paid Ad Copy form (30 fields). Empty optional sections are fine — the model will not invent proof, prices, urgency, or platform approval. Six Essentials fields are enough for a solid first ad package."
      quickStart={[
        "Fill Ad platform, Product or offer, Campaign goal, Target audience, Core value proposition, and Output language.",
        "Add only verified offer terms and proof — leave blanks instead of inventing results.",
        "Search keywords, video opening, and carousel cards appear only for the matching platform/format.",
        "If the category is regulated, set Regulated category so mandatory disclosures can be filled.",
      ]}
      groups={paidAdCopyFormGroups}
      variables={paidAdCopyFormVariables}
    />
  );
}
