import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  webinarPackageFormGroups,
  webinarPackageFormVariables,
} from "@/config/template-forms/webinar-package";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Webinar Package field guide",
  description:
    "How to fill the Webinar Package form - webinar topic, audience, promise, agenda, event setup, engagement, offer, CTA, replay, and follow-up email.",
};

export default async function WebinarPackageGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Webinar Package - field guide"
      templateSlug="webinar-package"
      intro="How to fill the Webinar Package form. The required fields are enough to create a complete webinar package; optional fields add event scheduling, presenter context, source material, interaction planning, offer details, CTA links, replay policy, and follow-up settings without inventing unsupported facts."
      quickStart={[
        "Fill Webinar Topic, Primary Webinar Goal, Target Audience, Audience Problem, Core Webinar Promise, Key Takeaways, Webinar Format, and Output Language first.",
        "Use Event Setup only when the date, time, platform, registration URL, or presenter credentials are confirmed.",
        "Use Content & Engagement for source material, agenda requirements, knowledge level, interaction methods, audience questions, evidence, and compliance notes.",
        "Use Brand, Offer & Promotion to control tone, registration-page depth, offer framing, proof, objections, and visual direction.",
        "Use Follow-Up & Output Settings for CTA destination, replay policy, sender name, post-webinar resource, and script depth.",
      ]}
      groups={webinarPackageFormGroups}
      variables={webinarPackageFormVariables}
    />
  );
}
