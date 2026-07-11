import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  threadsPostFormGroups,
  threadsPostFormVariables,
} from "@/config/template-forms/threads-post";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Threads Post field guide",
  description:
    "How to fill the Threads Post form — topic, goal, audience, voice, format, links, disclosures, and restrictions.",
};

export default async function ThreadsPostGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Threads Post — field guide"
      templateSlug="threads-post"
      intro="How to fill the compact Threads Post form. Empty optional fields are fine — the model will omit missing links, disclosures, source material, and extra constraints instead of inventing them."
      quickStart={[
        "Fill Topic or subject, Primary goal, Target audience, Core message, and Output language.",
        "Use Post format, Tone, Desired reader action, and Number of versions to shape the result without over-directing it.",
        "Open Voice & Positioning when the post needs a specific account perspective, backstory, or wording preference.",
        "Use Facts & Restrictions for verified claims, commercial relationships, disclosure wording, and must-follow constraints.",
      ]}
      groups={threadsPostFormGroups}
      variables={threadsPostFormVariables}
    />
  );
}
