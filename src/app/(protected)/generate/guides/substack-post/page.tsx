import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  substackPostFormGroups,
  substackPostFormVariables,
} from "@/config/template-forms/substack-post";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Substack Post field guide",
  description:
    "How to fill the Substack Post form - topic, goal, thesis, key points, editorial shape, author voice, access model, sources, links, disclosure, and safety context.",
};

export default async function SubstackPostGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Substack Post - field guide"
      templateSlug="substack-post"
      intro="How to fill the Substack Post form. The required fields define the reader, topic, thesis, key substance, and output language; optional groups refine editorial shape, author voice, access model, email packaging, evidence, links, disclosures, and sensitive-topic handling without inventing facts or paid benefits."
      quickStart={[
        "Fill Post topic, Primary goal, Target readers, Central message, Key points, and Output language first.",
        "Use Source material when the post depends on notes, research, drafts, interviews, or references.",
        "Open Editorial Shape to control format, reader familiarity, opening, structure, depth, counterpoints, and ending style.",
        "Use Voice & Author Context to guide tone, point of view, writing sample, public author context, and terms to avoid.",
        "Use Publishing & Monetization to set the access model, preview boundary, paid subscriber value, email subject style, URL slug, and tags.",
        "Use Facts, Sources & Restrictions for claims, quotes, approved links, disclosures, sensitive context, and final requirements.",
      ]}
      groups={substackPostFormGroups}
      variables={substackPostFormVariables}
    />
  );
}
