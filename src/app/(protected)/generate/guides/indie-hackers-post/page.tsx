import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  indieHackersPostFormGroups,
  indieHackersPostFormVariables,
} from "@/config/template-forms/indie-hackers-post";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Indie Hackers Post field guide",
  description:
    "How to fill the Indie Hackers Post form - post type, project context, founder story, evidence, tone, community fit, promotion level, and safeguards.",
};

export default async function IndieHackersPostGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Indie Hackers Post - field guide"
      templateSlug="indie-hackers-post"
      intro="How to fill the Indie Hackers Post form. The required fields are enough to create a useful founder-community post; optional fields add background, evidence, metrics, voice, formatting, promotion controls, and safeguards without inventing traction or turning the post into an ad."
      quickStart={[
        "Fill Post Type, Project or Topic, Project Summary, Goal of this Post, Who Should Read It, and Main Story or Message first.",
        "Use Story & Evidence for founder context, timeline, challenges, lessons, metrics, and approved references.",
        "Use Voice & Community Fit to tune tone, transparency, title angle, formatting, and one focused community question.",
        "Use Promotion & Safeguards to decide whether the project is only mentioned, linked softly, or included for direct feedback.",
        "Add Project URL only when promotion level allows a link; otherwise the post should stand on its own.",
      ]}
      groups={indieHackersPostFormGroups}
      variables={indieHackersPostFormVariables}
    />
  );
}
