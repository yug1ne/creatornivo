import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  xThreadFormGroups,
  xThreadFormVariables,
} from "@/config/template-forms/x-thread";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "X Thread field guide",
  description:
    "How to fill X Thread fields — topic, structure, CTA, disclosure, and claim limits.",
};

export default async function XThreadGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="X Thread — field guide"
      templateSlug="x-thread"
      intro="How to fill the X Thread form (24 fields). Empty optional sections are fine — the model will not invent facts, engagement bait, or destinations. Five Essentials fields are enough for a solid first thread."
      quickStart={[
        "Fill Topic and angle, Primary goal, Target audience, Key points and facts, and Output language.",
        "Paste source material when claims depend on research or product details.",
        "Set thread type and length when you know them; otherwise keep defaults.",
        "CTA details and URL appear only when needed; disclosure appears when a commercial relationship is selected.",
      ]}
      groups={xThreadFormGroups}
      variables={xThreadFormVariables}
    />
  );
}
