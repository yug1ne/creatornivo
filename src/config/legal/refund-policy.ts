import { siteConfig } from "@/config/site";

import type { LegalSection } from "./types";

export const refundPolicyMeta = {
  title: "Refund Policy",
  effectiveDate: "July 2, 2026",
  lastUpdated: "July 22, 2026",
} as const;

export const refundPolicySections: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    paragraphs: [
      `This Refund Policy explains how refund requests for paid ${siteConfig.name} subscriptions are handled if and when a paid purchase exists through our designated payment provider.`,
      "Self-serve paid checkout is currently unavailable while we finalize our payment provider. Early Access and paid access requests are handled via support, as described on the Pricing page. This policy applies when a paid purchase has been completed through the designated payment provider acting as Merchant of Record.",
      "This policy supplements our Terms of Service. It does not replace the payment provider’s buyer terms, checkout terms, or refund policies where they apply to your purchase.",
      "We aim to handle billing concerns fairly. We do not promise automatic refunds for every purchase or every situation.",
    ],
  },
  {
    id: "how-to-request",
    title: "How to Request a Refund",
    paragraphs: [
      "If you completed a paid purchase and want to request a refund, contact support by email. Please include:",
    ],
    list: [
      "The email address on your Creatornivo account.",
      "Approximate purchase date or other order details you have.",
      "A short description of the issue (optional but helpful).",
    ],
    subsections: [
      {
        title: "Contact",
        paragraphs: [
          `Email: ${siteConfig.legal.billingEmail}`,
          "Use a clear subject such as “Refund request” so we can route the message correctly.",
        ],
      },
    ],
  },
  {
    id: "review",
    title: "Case-by-Case Review",
    paragraphs: [
      "Refund requests are reviewed individually. Outcomes may depend on factors such as:",
    ],
    list: [
      "How recently the purchase was made.",
      "How the subscription has been used (for example, generation volume or patterns that suggest abuse).",
      "Evidence of fraud, chargeback misuse, policy violations, or Terms of Service violations.",
      "Applicable consumer law in your location.",
      "The payment provider’s rules and processes as Merchant of Record for the transaction, when a paid purchase exists.",
    ],
    subsections: [
      {
        title: "No automatic guarantee",
        paragraphs: [
          "Creatornivo does not advertise or guarantee automatic refunds on demand. Approval is discretionary except where mandatory law requires a specific remedy.",
        ],
      },
    ],
  },
  {
    id: "payment-provider",
    title: "Payment Provider / Merchant of Record",
    paragraphs: [
      "When paid checkout is available, paid subscriptions will be processed by our designated third-party payment provider acting as Merchant of Record. That provider may handle order support, invoices, taxes, and refund processing for purchases made through its checkout.",
      "If a refund is approved for a paid purchase, it is typically returned to the original payment method through the payment provider. Timing depends on the provider, the payment method, and your financial institution.",
      "You may also be able to contact the payment provider about an order using the channels that provider makes available to buyers. This policy is not intended to conflict with the provider’s refund policy or buyer protections; where the provider’s rules apply to the payment, those rules govern the payment relationship.",
    ],
  },
  {
    id: "cancellation-vs-refund",
    title: "Cancellation Is Not a Refund",
    paragraphs: [
      "When paid subscriptions are available, canceling a subscription stops future renewals according to the billing portal and subscription status. Cancellation does not automatically refund amounts paid for a completed purchase, if any.",
      "After cancellation, access to paid features may continue until the end of the paid period shown in your account, depending on subscription status.",
    ],
  },
  {
    id: "after-refund",
    title: "After a Refund",
    paragraphs: [
      "If a refund is approved for a paid purchase, it is processed through the designated payment provider, and account access may be adjusted after the refund is confirmed.",
      "After a refund is confirmed, account access may be adjusted, limited, or ended according to the subscription status, the reason for the refund, and applicable provider rules.",
    ],
  },
  {
    id: "chargebacks",
    title: "Chargebacks",
    paragraphs: [
      "Please contact support before filing a chargeback so we can review the billing concern.",
      "Chargebacks filed without prior contact may lead to account review or suspension pending resolution, to the extent permitted by law and provider rules.",
    ],
  },
  {
    id: "legal-rights",
    title: "Statutory Rights",
    paragraphs: [
      "Nothing in this policy limits mandatory consumer rights under applicable law. Where local law requires a refund or other remedy, we will follow those requirements.",
    ],
  },
  {
    id: "changes",
    title: "Changes to This Policy",
    paragraphs: [
      'We may update this Refund Policy from time to time. Changes will be posted on this page with an updated "Last updated" date.',
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: ["Refund and billing questions:"],
    list: [
      `Email: ${siteConfig.legal.billingEmail}`,
      `Product: ${siteConfig.name}`,
      "Website: https://www.creatornivo.com/refund-policy",
      "Pricing page: https://www.creatornivo.com/pricing",
    ],
  },
];
