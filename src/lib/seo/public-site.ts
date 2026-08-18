import { listPublicToolPagePaths } from "@/config/public-tools";
import { getPublishedGuideSlugs } from "@/lib/guides";

/** Canonical production origin for public SEO (www). */
export const PUBLIC_SITE_ORIGIN = "https://www.creatornivo.com" as const;

export function publicAbsoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${PUBLIC_SITE_ORIGIN}${normalized}`;
}

/** Static public marketing and legal paths (no auth-required app shell). */
export const PUBLIC_SITEMAP_STATIC_PATHS = [
  "/",
  "/pricing",
  "/terms",
  "/privacy",
  "/refund-policy",
  "/responsible-use",
  "/guides",
  "/tools",
] as const;

/**
 * Full list of public sitemap paths: static pages + public tool landings +
 * published guide articles. Draft / unpublished guides are excluded.
 */
export function getPublicSitemapPaths(): string[] {
  const guidePaths = getPublishedGuideSlugs().map((slug) => `/guides/${slug}`);
  return [
    ...PUBLIC_SITEMAP_STATIC_PATHS,
    ...listPublicToolPagePaths(),
    ...guidePaths,
  ];
}

/** Paths and prefixes search engines should not crawl as app/API surfaces. */
export const PUBLIC_ROBOTS_DISALLOW = [
  "/api/",
  "/admin/",
  "/dashboard",
  "/generate",
  "/library",
  "/settings",
  "/try",
  "/appsumo",
] as const;
