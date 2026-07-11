import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  linkedinPostFormGroups,
  linkedinPostFormVariables,
} from "@/config/template-forms/linkedin-post";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "LinkedIn Post field guide",
  description:
    "How to fill every LinkedIn Post parameter — account type, facts, format, CTA, and professional community rules.",
};

export default async function LinkedInPostGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="LinkedIn Post — field guide"
      templateSlug="linkedin-post"
      intro="How to fill the LinkedIn Post form. Empty optional fields are fine — the model will not invent credentials, personal stories, customer results, revenue, or engagement bait. Only fill what you can verify before publishing on LinkedIn."
      quickStart={[
        "Fill Topic, Post type, Audience, Tone, and Language.",
        "Set Account type and Post format so the package matches a profile vs company Page and text vs document/video.",
        "Add one main message and one desired action — avoid stacking several unrelated goals.",
        "Expand Facts, Author, Product, Hiring, or Media sections only when those details are real and approved.",
      ]}
      groups={linkedinPostFormGroups}
      variables={linkedinPostFormVariables}
    />
  );
}
