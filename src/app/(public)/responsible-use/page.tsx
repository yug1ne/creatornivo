import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/legal-document";
import {
  responsibleUseMeta,
  responsibleUseSections,
} from "@/config/legal/responsible-use";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Responsible Use | ${siteConfig.name}`,
  description:
    "How Creatornivo is meant to be used: AI-assisted text drafting with templates, human review required, and prohibited uses.",
};

export default function ResponsibleUsePage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <LegalDocument
        title={responsibleUseMeta.title}
        description={`${siteConfig.name} is an AI-assisted text drafting SaaS that uses predefined business templates. Users must review, edit, and verify all outputs before use. This page describes intended use and prohibited activities.`}
        effectiveDate={responsibleUseMeta.effectiveDate}
        lastUpdated={responsibleUseMeta.lastUpdated}
        sections={responsibleUseSections}
        contactEmail={siteConfig.legal.legalEmail}
      />
    </section>
  );
}
