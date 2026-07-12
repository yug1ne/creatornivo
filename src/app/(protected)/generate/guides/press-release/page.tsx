import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  pressReleaseFormGroups,
  pressReleaseFormVariables,
} from "@/config/template-forms/press-release";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Press Release field guide",
  description:
    "How to fill the Press Release form - announcement, facts, date, dateline, evidence, quotes, boilerplate, media contact, distribution settings, embargo, and claim review.",
};

export default async function PressReleaseGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Press Release - field guide"
      templateSlug="press-release"
      intro="How to fill the Press Release form. The required fields define the announcement, issuing organization, public facts, audience, release date, and dateline; optional fields add evidence, quotes, company boilerplate, media contact, destination requirements, embargo handling, and final claim-safety constraints."
      quickStart={[
        "Fill Announcement type, Company or organization, What are you announcing?, Primary audience, Essential facts, Release date, and Dateline location first.",
        "Use Message & Evidence for benefits, source material, timing, reader action, sensitive claims, and background context.",
        "Turn Include quotations on only when authorized speakers and approved quote material are available.",
        "Use Distribution Settings to adapt the release for newsroom, newswire, media outreach, trade, local, or stakeholder use.",
        "Use Compliance & Final Details for embargoes, time zones, jurisdiction-sensitive wording, and other publication requirements.",
      ]}
      groups={pressReleaseFormGroups}
      variables={pressReleaseFormVariables}
    />
  );
}
