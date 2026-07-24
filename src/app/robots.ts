import type { MetadataRoute } from "next";

import {
  PUBLIC_ROBOTS_DISALLOW,
  PUBLIC_SITE_ORIGIN,
} from "@/lib/seo/public-site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...PUBLIC_ROBOTS_DISALLOW],
    },
    sitemap: `${PUBLIC_SITE_ORIGIN}/sitemap.xml`,
    host: PUBLIC_SITE_ORIGIN,
  };
}
