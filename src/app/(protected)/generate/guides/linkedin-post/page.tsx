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
    "How to fill LinkedIn Post fields — goal, message, facts, perspective, voice, and evidence limits.",
};

export default async function LinkedInPostGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="LinkedIn Post — field guide"
      templateSlug="linkedin-post"
      intro="How to fill the LinkedIn Post form (24 fields). Empty optional sections are fine — the model will not invent credentials, personal stories, client results, or engagement bait. Five Essentials fields are enough for a solid first draft."
      quickStart={[
        "Fill Subject, Primary goal, Target audience, Core message, and Facts and key details.",
        "For facts, list only verified details — or write “No external claims” when the post is pure perspective.",
        "Set Post format, Reader action, and Publishing perspective when you know them; otherwise leave Auto defaults.",
        "Open Evidence & Restrictions for sources, links, affiliation disclosure, and privacy bans.",
      ]}
      groups={linkedinPostFormGroups}
      variables={linkedinPostFormVariables}
    />
  );
}
