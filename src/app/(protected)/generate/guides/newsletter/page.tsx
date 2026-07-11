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
    "How to fill Newsletter fields — topic, takeaway, facts, structure, brand delivery, and compliance.",
};

export default async function NewsletterGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Newsletter — field guide"
      templateSlug="newsletter"
      intro="How to fill the Newsletter form (30 fields). Empty optional sections are fine — the model will not invent stats, links, personalisation, or fake urgency. Six Essentials fields are enough for a solid first issue package."
      quickStart={[
        "Fill Newsletter topic, Primary goal, Target readers, Main takeaway, Facts to include, and Output language.",
        "Add only verified facts and supplied links — leave blanks instead of guessing dates or prices.",
        "Open Message & Structure for source material, sections, opening approach, and timing.",
        "If the issue is high-stakes (health, legal, finance…), set Sensitive topic so Jurisdiction appears when needed.",
      ]}
      groups={newsletterFormGroups}
      variables={newsletterFormVariables}
    />
  );
}
