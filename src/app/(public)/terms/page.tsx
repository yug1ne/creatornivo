import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/legal-document";
import {
  termsOfServiceMeta,
  termsOfServiceSections,
} from "@/config/legal/terms-of-service";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Terms of Service | ${siteConfig.name}`,
  description:
    "Terms governing your use of Creatornivo, an AI-powered prompt generation platform.",
};

export default function TermsOfServicePage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <LegalDocument
        title={termsOfServiceMeta.title}
        description={`These Terms of Service govern your access to and use of ${siteConfig.name}, including AI prompt templates, content generation, and related features.`}
        effectiveDate={termsOfServiceMeta.effectiveDate}
        lastUpdated={termsOfServiceMeta.lastUpdated}
        sections={termsOfServiceSections}
        contactEmail={siteConfig.legal.legalEmail}
      />
    </section>
  );
}