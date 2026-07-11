import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  newsletterFormGroups,
  newsletterFormVariables,
} from "@/config/template-forms/newsletter";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Newsletter field guide",
  description:
    "How to fill every Newsletter parameter — goal, type, message, CTA, and accuracy rules.",
};

export default async function NewsletterGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Newsletter — field guide"
      templateSlug="newsletter"
      intro="How to fill the Newsletter form. Empty optional fields are fine — the model will not invent statistics, testimonials, product features, or fake urgency. Only fill what you can verify before sending."
      quickStart={[
        "Fill Topic, Goal, Target audience, Newsletter type, Brand name, Tone, and Language.",
        "Add one main message and key points you can stand behind — leave blanks instead of inventing facts.",
        "Set one primary CTA and a real link (or leave the link empty for a placeholder).",
        "Use Additional context for restrictions: no fake scarcity, claims to avoid, must-include wording.",
      ]}
      groups={newsletterFormGroups}
      variables={newsletterFormVariables}
    />
  );
}
