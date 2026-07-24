import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GuideArticleView } from "@/components/guides/guide-article";
import {
  getGuideCanonicalUrl,
  getPublishedGuideBySlug,
  getPublishedGuideSlugs,
  getRelatedGuides,
  getGuidesSiteOrigin,
} from "@/lib/guides";

interface GuidePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getPublishedGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getPublishedGuideBySlug(slug);

  if (!article) {
    return {
      title: "Guide not found",
      robots: { index: false, follow: false },
    };
  }

  const canonical = getGuideCanonicalUrl(article.slug);

  return {
    title: article.title,
    description: article.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: article.title,
      description: article.description,
      type: "article",
      url: canonical,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
    },
  };
}

function GuideJsonLd({
  title,
  description,
  slug,
  publishedAt,
  updatedAt,
}: {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  updatedAt: string;
}) {
  const origin = getGuidesSiteOrigin();
  const payload = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    datePublished: publishedAt,
    dateModified: updatedAt,
    inLanguage: "en",
    author: {
      "@type": "Organization",
      name: "CreatorNivo",
      url: origin,
    },
    publisher: {
      "@type": "Organization",
      name: "CreatorNivo",
      url: origin,
    },
    mainEntityOfPage: getGuideCanonicalUrl(slug),
  };

  return (
    <script
      type="application/ld+json"
      // Static guide content only — no user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}

export default async function GuideArticlePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const article = getPublishedGuideBySlug(slug);

  if (!article) {
    notFound();
  }

  const related = getRelatedGuides(article);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <GuideJsonLd
        title={article.title}
        description={article.description}
        slug={article.slug}
        publishedAt={article.publishedAt}
        updatedAt={article.updatedAt}
      />
      <GuideArticleView article={article} related={related} />
    </section>
  );
}
