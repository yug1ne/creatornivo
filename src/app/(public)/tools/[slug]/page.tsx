import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ToolLanding } from "@/components/tools/tool-landing";
import {
  getPublicToolBySlug,
  listPublicTools,
} from "@/config/public-tools";
import { getPublicToolCanonicalUrl } from "@/lib/seo/public-tools";

interface ToolPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return listPublicTools().map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({
  params,
}: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getPublicToolBySlug(slug);

  if (!tool) {
    return {
      title: "Tool not found",
      robots: { index: false, follow: false },
    };
  }

  const canonical = getPublicToolCanonicalUrl(tool.slug);

  return {
    title: tool.metaTitle,
    description: tool.metaDescription,
    alternates: {
      canonical,
    },
    openGraph: {
      title: tool.ogTitle,
      description: tool.ogDescription,
      type: "website",
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: tool.ogTitle,
      description: tool.ogDescription,
    },
  };
}

export default async function PublicToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = getPublicToolBySlug(slug);

  if (!tool) {
    notFound();
  }

  return <ToolLanding tool={tool} />;
}
