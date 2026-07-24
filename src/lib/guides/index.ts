import { guideArticles } from "@/config/guides/articles";
import type { GuideArticle, GuideListItem } from "@/config/guides/types";

/**
 * Canonical public origin for guide SEO (always www).
 * Local/dev NEXT_PUBLIC_APP_URL must not rewrite production canonical tags.
 */
export function getGuidesSiteOrigin(): string {
  return "https://www.creatornivo.com";
}

export function getGuideCanonicalPath(slug?: string): string {
  return slug ? `/guides/${slug}` : "/guides";
}

export function getGuideCanonicalUrl(slug?: string): string {
  return `${getGuidesSiteOrigin()}${getGuideCanonicalPath(slug)}`;
}

function isPublished(article: GuideArticle): boolean {
  return article.draft !== true;
}

/** Published guides for the public index (drafts excluded). */
export function listPublishedGuides(): GuideListItem[] {
  return guideArticles.filter(isPublished).map((article) => ({
    slug: article.slug,
    title: article.title,
    description: article.description,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    category: article.category,
  }));
}

/** Published article by slug, or null if missing/draft. */
export function getPublishedGuideBySlug(slug: string): GuideArticle | null {
  const article = guideArticles.find((item) => item.slug === slug);
  if (!article || !isPublished(article)) return null;
  return article;
}

/** Slugs for generateStaticParams (published only). */
export function getPublishedGuideSlugs(): string[] {
  return listPublishedGuides().map((item) => item.slug);
}

export function getRelatedGuides(
  article: GuideArticle,
): GuideListItem[] {
  const related = article.relatedSlugs ?? [];
  if (related.length === 0) return [];

  const bySlug = new Map(
    listPublishedGuides().map((item) => [item.slug, item]),
  );

  return related
    .map((slug) => bySlug.get(slug))
    .filter((item): item is GuideListItem => Boolean(item));
}

/** Flatten published guide body text for copy tests and audits. */
export function getAllPublishedGuidePlainText(): string {
  return guideArticles
    .filter(isPublished)
    .map((article) => {
      const parts = [article.title, article.description];
      for (const section of article.sections) {
        if (section.heading) parts.push(section.heading);
        parts.push(...section.paragraphs);
        if (section.list) parts.push(...section.list);
      }
      return parts.join("\n");
    })
    .join("\n");
}
