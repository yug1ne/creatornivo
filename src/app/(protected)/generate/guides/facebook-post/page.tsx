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
    "How to fill every Facebook Post parameter — destination, facts, offers, media, and community rules.",
};

export default async function FacebookPostGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Facebook Post — field guide"
      templateSlug="facebook-post"
      intro="How to fill the Facebook Post form. Empty optional fields are fine — the model will not invent facts, testimonials, discounts, or personal stories. Only fill what you can verify before publishing on Facebook."
      quickStart={[
        "Fill Topic, Post type, Audience, Tone, and Language.",
        "Set Publishing destination (Page, Group, Event, profile) so the copy fits that surface.",
        "Add one main message and one desired action — avoid stacking several unrelated goals.",
        "Expand Offer, Event, Story, or Partnership sections only when those details are real and approved.",
      ]}
      groups={facebookPostFormGroups}
      variables={facebookPostFormVariables}
    />
  );
}
