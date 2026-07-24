import type { MetadataRoute } from "next";

import {
  PUBLIC_SITE_ORIGIN,
  getPublicSitemapPaths,
  publicAbsoluteUrl,
} from "@/lib/seo/public-site";
import { getPublishedGuideBySlug } from "@/lib/guides";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = getPublicSitemapPaths();

  return paths.map((path) => {
    const guideMatch = path.match(/^\/guides\/([^/]+)$/);
    const guide = guideMatch
      ? getPublishedGuideBySlug(guideMatch[1])
      : null;

    const lastModified = guide
      ? new Date(`${guide.updatedAt}T00:00:00.000Z`)
      : new Date();

    return {
      url: publicAbsoluteUrl(path),
      lastModified,
      changeFrequency:
        path === "/" || path === "/guides" || path === "/pricing"
          ? "weekly"
          : "monthly",
      priority:
        path === "/"
          ? 1
          : path === "/guides" || path === "/pricing"
            ? 0.8
            : path.startsWith("/guides/")
              ? 0.7
              : 0.5,
    };
  });
}

/** Exported for tests — origin must stay on www. */
export const SITEMAP_ORIGIN = PUBLIC_SITE_ORIGIN;
