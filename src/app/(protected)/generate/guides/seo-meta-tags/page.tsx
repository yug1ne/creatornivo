import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  seoMetaTagsFormGroups,
  seoMetaTagsFormVariables,
} from "@/config/template-forms/seo-meta-tags";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "SEO Meta Tags field guide",
  description:
    "How to fill SEO Meta Tags fields — page facts, keywords, technical tags, and social previews.",
};

export default async function SeoMetaTagsGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="SEO Meta Tags — field guide"
      templateSlug="seo-meta-tags"
      intro="How to fill the SEO Meta Tags form (24 fields). Empty optional sections are fine — the model will not invent page features, rankings, prices, or social image URLs. Five Essentials fields are enough for a solid first metadata package."
      quickStart={[
        "Fill Page topic, Page type, Target audience, Primary keyword, and Essential page facts.",
        "Only include facts that are actually on the page — metadata must not overclaim.",
        "Open Technical Settings for slug preference, canonical URL, and indexing notes.",
        "Turn on Include social metadata only when you have real preview image URLs and need Open Graph or X Cards.",
      ]}
      groups={seoMetaTagsFormGroups}
      variables={seoMetaTagsFormVariables}
    />
  );
}
