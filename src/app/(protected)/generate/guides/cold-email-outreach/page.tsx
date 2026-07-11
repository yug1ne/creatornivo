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
    "How to fill Cold Email Outreach fields — relevance, proof, personalization limits, and compliance safeguards.",
};

export default async function ColdEmailOutreachGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Cold Email Outreach — field guide"
      templateSlug="cold-email-outreach"
      intro="How to fill the Cold Email Outreach form (34 fields). Empty optional sections are fine — the model will not invent prospect research, referrals, metrics, or legal compliance. Six Essentials fields are enough for a truthful first draft."
      quickStart={[
        "Fill Sender identity, Offer and outcome, Outreach goal, Target recipient, Why it is relevant, and Approved facts.",
        "Pick an email package (initial only or with follow-ups) and a low-friction CTA preference.",
        "Add personalization only from verifiable public details — never fabricate familiarity.",
        "Conditional fields appear for referrals and regulated topics; leave compliance blanks empty instead of inventing addresses or disclaimers.",
      ]}
      groups={coldEmailOutreachFormGroups}
      variables={coldEmailOutreachFormVariables}
    />
  );
}
