import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  inAppUxCopyFormGroups,
  inAppUxCopyFormVariables,
} from "@/config/template-forms/in-app-ux-copy";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "In-App UX Copy field guide",
  description:
    "How to fill the In-App UX Copy form - product context, interface state, UX elements, facts, flow behavior, terminology, accessibility, and constraints.",
};

export default async function InAppUxCopyGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="In-App UX Copy - field guide"
      templateSlug="in-app-ux-copy"
      intro="How to fill the In-App UX Copy form. The required fields define the product or feature, exact interface context, user goal, target users, requested UX elements, and confirmed facts; optional fields control rewrite mode, flow behavior, voice, terminology, accessibility, sensitive domains, and delivery constraints."
      quickStart={[
        "Fill Product or Feature, Screen or Interface Context, User Goal, Target Users, UX Copy Needed, and Required Facts and Details first.",
        "Use Copy Task and Current Interface Copy when rewriting or auditing existing copy.",
        "Use Flow & Behavior for user state, next action, recovery options, and device or flow variations.",
        "Use Voice & Accessibility for brand voice, required terminology, reading level, and accessibility priorities.",
        "Use Constraints & Delivery for length, variants, prohibited wording, sensitive-domain controls, compliance notes, and final context.",
      ]}
      groups={inAppUxCopyFormGroups}
      variables={inAppUxCopyFormVariables}
    />
  );
}
