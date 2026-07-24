import type { Metadata } from "next";

import { GuideCard } from "@/components/guides/guide-card";
import {
  getGuideCanonicalUrl,
  listPublishedGuides,
} from "@/lib/guides";

const indexTitle = "Guides";
const indexDescription =
  "Educational guides on CreatorNivo: AI-assisted text drafting with predefined templates, structured inputs, and human review before use.";

export const metadata: Metadata = {
  title: indexTitle,
  description: indexDescription,
  alternates: {
    canonical: getGuideCanonicalUrl(),
  },
  openGraph: {
    title: `${indexTitle} | CreatorNivo`,
    description: indexDescription,
    type: "website",
    url: getGuideCanonicalUrl(),
  },
  twitter: {
    card: "summary_large_image",
    title: `${indexTitle} | CreatorNivo`,
    description: indexDescription,
  },
};

export default function GuidesIndexPage() {
  const guides = listPublishedGuides();

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium text-primary">Guides</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Learn the CreatorNivo workflow
        </h1>
        <p className="mt-4 text-muted-foreground">
          Short product guides on template-based AI-assisted drafting, structured
          inputs, and reviewing drafts before you use them. English only.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
        {guides.map((guide) => (
          <GuideCard key={guide.slug} guide={guide} />
        ))}
      </div>
    </section>
  );
}
