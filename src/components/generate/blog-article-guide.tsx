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
      intro="How to fill the Blog Article form. Empty optional fields are fine — the model will not invent missing facts, sources, or credentials. Only the four required fields must be filled to generate."
      quickStart={[
        "Fill Topic, Primary keyword, Audience, and Language.",
        "Add Article type, Search intent, and the reader’s main question when you know them.",
        "Paste only approved sources and facts you can stand behind. Leave blanks instead of guessing.",
        "Expand advanced sections (SEO, monetization, YMYL) only when relevant.",
      ]}
      groups={blogArticleFormGroups}
      variables={blogArticleFormVariables}
    />
  );
}
