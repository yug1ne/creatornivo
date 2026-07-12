import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  quoraAnswerFormGroups,
  quoraAnswerFormVariables,
} from "@/config/template-forms/quora-answer";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Quora Answer field guide",
  description:
    "How to fill the Quora Answer form - question, answer goal, reader, evidence, experience, disclosure, link, structure, and verification notes.",
};

export default async function QuoraAnswerGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Quora Answer - field guide"
      templateSlug="quora-answer"
      intro="How to fill the Quora Answer form. The required fields are enough for a direct, useful answer; optional fields refine evidence, experience, credentials, affiliation disclosure, link handling, structure, opening style, reading level, and source notes without inventing unsupported facts."
      quickStart={[
        "Fill Quora question, Answer goal, Main answer, Key points, Author perspective, and Output language first.",
        "Use Target reader, Tone, Answer length, and Question context to shape depth and framing.",
        "Open Evidence & Credibility when sources, examples, first-hand experience, credentials, or limitations affect accuracy.",
        "Use Promotion & Disclosure for material relationships, affiliated entities, relevant links, and proportional reader actions.",
        "Use Style & Output for structure, opening, reading level, verification notes, and special requirements.",
      ]}
      groups={quoraAnswerFormGroups}
      variables={quoraAnswerFormVariables}
    />
  );
}
