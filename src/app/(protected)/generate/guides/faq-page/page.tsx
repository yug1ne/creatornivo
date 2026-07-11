import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  faqPageFormGroups,
  faqPageFormVariables,
} from "@/config/template-forms/faq-page";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "FAQ Page field guide",
  description:
    "How to fill every FAQ Page parameter — product facts, real questions, policies, and support routes.",
};

export default async function FaqPageGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="FAQ Page — field guide"
      templateSlug="faq-page"
      intro="How to fill the FAQ Page form. Empty optional fields are fine — the model will not invent prices, refunds, features, or “frequently asked” questions without evidence. Prefer support tickets and real user wording over keyword bait."
      quickStart={[
        "Fill Product name, Product type, Product description, Audience, Language, and Tone.",
        "Add FAQ page type and primary purpose so answers match the right context (billing vs product vs privacy).",
        "Paste real questions from tickets/search when you have them — never invent frequency claims.",
        "Expand Approved facts with only verified policy and product details; leave blanks instead of guessing.",
      ]}
      groups={faqPageFormGroups}
      variables={faqPageFormVariables}
    />
  );
}
