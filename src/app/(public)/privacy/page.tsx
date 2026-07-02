import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/legal-document";
import {
  privacyPolicyMeta,
  privacyPolicySections,
} from "@/config/legal/privacy-policy";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Privacy Policy | ${siteConfig.name}`,
  description:
    "Learn how Creatornivo collects, uses, and protects your data. We do not sell personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <LegalDocument
        title={privacyPolicyMeta.title}
        description={`This Privacy Policy describes how ${siteConfig.name} collects, uses, and protects your information when you use our AI prompt toolkit and content generation platform.`}
        effectiveDate={privacyPolicyMeta.effectiveDate}
        lastUpdated={privacyPolicyMeta.lastUpdated}
        sections={privacyPolicySections}
        contactEmail={siteConfig.legal.privacyEmail}
      />
    </section>
  );
}