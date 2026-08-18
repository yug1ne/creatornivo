import type { Metadata } from "next";

import { ToolsIndex } from "@/components/tools/tools-index";
import { publicToolsIndex } from "@/config/public-tools";
import { getPublicToolCanonicalUrl } from "@/lib/seo/public-tools";

const canonical = getPublicToolCanonicalUrl();

export const metadata: Metadata = {
  title: publicToolsIndex.metaTitle,
  description: publicToolsIndex.metaDescription,
  alternates: {
    canonical,
  },
  openGraph: {
    title: publicToolsIndex.ogTitle,
    description: publicToolsIndex.ogDescription,
    type: "website",
    url: canonical,
  },
  twitter: {
    card: "summary_large_image",
    title: publicToolsIndex.ogTitle,
    description: publicToolsIndex.ogDescription,
  },
};

export default function ToolsIndexPage() {
  return <ToolsIndex />;
}
