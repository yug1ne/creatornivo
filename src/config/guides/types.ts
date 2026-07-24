/** Public educational guides (not authenticated /generate/guides field help). */

export type GuideCategory =
  | "product"
  | "workflow"
  | "how-to"
  | "responsible-use";

export type GuideCta = "templates" | "register" | "pricing" | "responsible-use";

export interface GuideSection {
  heading?: string;
  paragraphs: string[];
  list?: string[];
}

export interface GuideArticle {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  category: GuideCategory;
  /** When true, excluded from index, sitemap lists, and [slug] static params. */
  draft?: boolean;
  relatedSlugs?: string[];
  primaryCta?: GuideCta;
  sections: GuideSection[];
}

export interface GuideListItem {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  category: GuideCategory;
}
