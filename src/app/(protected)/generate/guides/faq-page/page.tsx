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
    "How to fill FAQ Page fields — questions, confirmed facts, SEO notes, structured data, and accuracy controls.",
};

export default async function FaqPageGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="FAQ Page — field guide"
      templateSlug="faq-page"
      intro="How to fill the FAQ Page form (42 fields). Empty optional sections are fine — the model will not invent prices, policies, reviews, or rich-result guarantees. Seven Essentials fields are enough for a solid first draft."
      quickStart={[
        "Fill FAQ subject, Brand, Page type, Primary goal, Target audience, Must-answer questions, and Confirmed facts.",
        "Paste only approved answer notes — leave blanks instead of guessing limits or policies.",
        "Open Question Architecture for real support questions, categories, and journey stages (one option per line).",
        "Conditional fields appear for CTA wording/destination, JSON-LD URL, regulated jurisdiction, and support escalation.",
      ]}
      groups={faqPageFormGroups}
      variables={faqPageFormVariables}
    />
  );
}
