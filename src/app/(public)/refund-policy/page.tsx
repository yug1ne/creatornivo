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
    "Creatornivo refund policy: how to contact support about Pro subscription refunds, case-by-case review, and Paddle’s role as payment provider.",
};

export default function RefundPolicyPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <LegalDocument
        title={refundPolicyMeta.title}
        description={`This Refund Policy explains how to request a refund for paid Creatornivo subscriptions, how requests are reviewed, and Paddle’s role as Merchant of Record.`}
        effectiveDate={refundPolicyMeta.effectiveDate}
        lastUpdated={refundPolicyMeta.lastUpdated}
        sections={refundPolicySections}
        contactEmail={siteConfig.legal.billingEmail}
      />
    </section>
  );
}