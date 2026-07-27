import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/legal-document";
import {
  refundPolicyMeta,
  refundPolicySections,
} from "@/config/legal/refund-policy";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Refund Policy | ${siteConfig.name}`,
  description:
    "Creatornivo refund policy: 7-day money-back guarantee for unresolved product/access issues, consumptive AI draft usage, how to contact support, and Freemius as Merchant of Record.",
};

export default function RefundPolicyPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <LegalDocument
        title={refundPolicyMeta.title}
        description={`This Refund Policy explains Creatornivo’s 7-day money-back guarantee for eligible Freemius purchases, how consumptive AI-assisted drafts affect refund eligibility, how to request a refund, case-by-case limitations, and Freemius’s role as Merchant of Record.`}
        effectiveDate={refundPolicyMeta.effectiveDate}
        lastUpdated={refundPolicyMeta.lastUpdated}
        sections={refundPolicySections}
        contactEmail={siteConfig.legal.billingEmail}
      />
    </section>
  );
}