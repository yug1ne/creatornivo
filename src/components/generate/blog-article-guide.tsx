import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  blogArticleFormGroups,
  blogArticleFormVariables,
} from "@/config/template-forms/blog-article";

export function BlogArticleGuide() {
  return (
    <TemplateFieldGuide
      title="Blog Article — field guide"
      templateSlug="blog-article"
      intro="How to fill the Blog Article form (42 fields). Empty optional sections are fine — the model will not invent sources, quotes, credentials, or performance guarantees. Seven Essentials fields are enough for a solid first draft."
      quickStart={[
        "Fill Article topic, Primary goal, Article format, Target audience, Reader outcome, Required key points, and Output language.",
        "Paste approved facts into Source notes when you have them; leave blank instead of guessing.",
        "Open SEO, Facts, or Output only when you need keywords, high-stakes handling, FAQ, or a CTA.",
        "Conditional fields appear only when relevant (Other language, Custom length, high-stakes jurisdiction, FAQ count, CTA destination).",
      ]}
      groups={blogArticleFormGroups}
      variables={blogArticleFormVariables}
    />
  );
}
