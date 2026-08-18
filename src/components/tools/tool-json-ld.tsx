import type { PublicTool } from "@/config/public-tools";
import { getRelatedPublicTools } from "@/config/public-tools";
import {
  getPublicToolCanonicalUrl,
  PUBLIC_TOOLS_ORIGIN,
} from "@/lib/seo/public-tools";

function jsonLdScript(payload: unknown) {
  return (
    <script
      type="application/ld+json"
      // Static marketing content only — no user input.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(payload).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export function ToolsIndexJsonLd() {
  const payload = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "AI Content Templates & Generators",
        url: getPublicToolCanonicalUrl(),
        isPartOf: {
          "@type": "WebSite",
          name: "CreatorNivo",
          url: PUBLIC_TOOLS_ORIGIN,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: PUBLIC_TOOLS_ORIGIN,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Tools",
            item: getPublicToolCanonicalUrl(),
          },
        ],
      },
    ],
  };

  return jsonLdScript(payload);
}

export function ToolPageJsonLd({ tool }: { tool: PublicTool }) {
  const canonical = getPublicToolCanonicalUrl(tool.slug);
  const related = getRelatedPublicTools(tool);

  const payload = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: tool.h1,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: canonical,
        description: tool.metaDescription,
        isAccessibleForFree: tool.requiredPlan === "free",
        publisher: {
          "@type": "Organization",
          name: "CreatorNivo",
          url: PUBLIC_TOOLS_ORIGIN,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: PUBLIC_TOOLS_ORIGIN,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Tools",
            item: getPublicToolCanonicalUrl(),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: tool.h1,
            item: canonical,
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: tool.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
      ...(related.length > 0
        ? [
            {
              "@type": "ItemList",
              name: "Related templates",
              itemListElement: related.map((item, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: item.h1,
                url: getPublicToolCanonicalUrl(item.slug),
              })),
            },
          ]
        : []),
    ],
  };

  return jsonLdScript(payload);
}
