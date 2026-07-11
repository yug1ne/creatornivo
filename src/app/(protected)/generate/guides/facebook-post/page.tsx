import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  facebookPostFormGroups,
  facebookPostFormVariables,
} from "@/config/template-forms/facebook-post";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Facebook Post field guide",
  description:
    "How to fill the Facebook Post form — subject, goal, audience, facts, link guidance, disclosure, variants, and visual concept.",
};

export default async function FacebookPostGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Facebook Post — field guide"
      templateSlug="facebook-post"
      intro="How to fill the compact Facebook Post form. Empty optional fields are fine — the model will omit missing link, offer, proof, timing, disclosure, and visual details instead of inventing them."
      quickStart={[
        "Fill What is the post about?, Primary goal, Target audience, Main message, Essential facts, and Output language.",
        "Use Post type, Publishing context, Tone, and Desired reader action to shape the Facebook-native structure.",
        "Open Message & Conversion only when you have a real link, offer, proof point, or date to include.",
        "Use Trust & Restrictions for commercial relationships, sensitive topics, and must-follow wording.",
      ]}
      groups={facebookPostFormGroups}
      variables={facebookPostFormVariables}
    />
  );
}
