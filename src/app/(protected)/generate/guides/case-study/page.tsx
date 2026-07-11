import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  caseStudyFormGroups,
  caseStudyFormVariables,
} from "@/config/template-forms/case-study";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Case Study field guide",
  description:
    "How to fill Case Study fields — challenge, implementation, measurable results, privacy, and CTA controls.",
};

export default async function CaseStudyGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Case Study — field guide"
      templateSlug="case-study"
      intro="How to fill the Case Study form (47 fields). Empty optional sections are fine — the model will not invent metrics, quotes, baselines, or client identities. Eight Essentials fields are enough for a solid first draft when you have real evidence."
      quickStart={[
        "Fill Subject, Goal, Audience, Client name, Challenge, Solution, Results summary, and Output language.",
        "Paste only approved facts and results — qualitative outcomes are fine when numbers are unavailable.",
        "Set Privacy mode carefully; anonymization instructions appear when names must be generalized.",
        "CTA link and wording appear only when Call-to-action goal is not No CTA.",
      ]}
      groups={caseStudyFormGroups}
      variables={caseStudyFormVariables}
    />
  );
}
