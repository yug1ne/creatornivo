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
    "Creatornivo refund policy including our 14-day money-back guarantee for new Pro subscribers.",
};

export default function RefundPolicyPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <LegalDocument
        title={refundPolicyMeta.title}
        description={`This Refund Policy explains Creatornivo's 14-day money-back guarantee, eligibility requirements, and how to request a refund for Pro subscriptions.`}
        effectiveDate={refundPolicyMeta.effectiveDate}
        lastUpdated={refundPolicyMeta.lastUpdated}
        sections={refundPolicySections}
        contactEmail={siteConfig.legal.billingEmail}
      />
    </section>
  );
}