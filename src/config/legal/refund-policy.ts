import { siteConfig } from "@/config/site";

import type { LegalSection } from "./types";

export const refundPolicyMeta = {
  title: "Refund Policy",
  effectiveDate: "July 2, 2026",
  lastUpdated: "July 27, 2026",
} as const;

export const refundPolicySections: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    paragraphs: [
      `This Refund Policy explains how refund requests for paid ${siteConfig.name} subscriptions are handled when a paid purchase exists through our authorized payment provider / Merchant of Record, Freemius (or another provider we designate if payment partners change).`,
      "This policy supplements our Terms of Service. It does not replace Freemius’s buyer terms, checkout terms, or refund policies where they apply to your purchase.",
      "We aim to handle billing concerns fairly. We do not promise automatic refunds for every purchase or every situation. Nothing here limits mandatory consumer rights under applicable law.",
    ],
  },
  {
    id: "seven-day-guarantee",
    title: "7-Day Money-Back Guarantee",
    paragraphs: [
      "For eligible self-serve Freemius purchases of Creatornivo Pro, we offer a strict money-back guarantee for seven (7) days from the date of purchase when you have a genuine unresolved product, access, or technical issue that we cannot reasonably fix.",
      "This guarantee is intended for situations where the Service cannot be used as described (for example, you cannot access Pro after confirmed payment, or a product/access/technical problem remains unresolved after reasonable support). It is not an unlimited “no questions asked” refund for any reason.",
    ],
    list: [
      "Request within 7 days of the original purchase date.",
      "Contact support with your account email, approximate purchase date, and a short description of the product, access, or technical issue.",
      "Give us a reasonable chance to help resolve access or technical problems before a refund is finalized.",
      "Approved refunds are typically processed through Freemius to the original payment method; timing depends on Freemius, the payment method, and your financial institution.",
    ],
  },
  {
    id: "consumptive-usage",
    title: "Consumptive Usage (AI-Assisted Drafts and Generations)",
    paragraphs: [
      "Creatornivo Pro includes limited AI-assisted draft generation capacity (currently one hundred completed generations per UTC calendar month in product configuration, subject to the in-app usage display and server rules).",
      "AI-assisted drafts and completed generations are consumptive usage: each completed generation consumes provider resources (including third-party AI processing) and delivers service value immediately when the draft is produced.",
      "Because that capacity is usage-based and consumed when a generation completes, refunds may be denied or limited when Pro generation capacity has been substantially or fully used during the refund window.",
      "Consumed generations (completed AI-assisted drafts) are not refundable as a separate credit or cash value, because the service has already been delivered for those generations.",
      "A refund, if approved, does not reset, restore, or re-credit consumed generation capacity for the period in which it was used.",
    ],
  },
  {
    id: "how-to-request",
    title: "How to Request a Refund",
    paragraphs: [
      "If you completed a paid purchase and want to request a refund, contact support by email, or use Freemius’s buyer/order support channels where available for purchases processed by Freemius. Please include:",
    ],
    list: [
      "The email address on your Creatornivo account.",
      "Approximate purchase date or other order details you have.",
      "A short description of the product, access, or technical issue (optional but helpful).",
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
    title: "Case-by-Case Review and Limitations",
    paragraphs: [
      "Refund requests are reviewed individually. Outside mandatory law, we may decline or limit refunds when, for example:",
    ],
    list: [
      "The request is made more than 7 days after purchase (unless mandatory law requires a different remedy).",
      "The request is only a change of mind without an unresolved product, access, or technical issue covered by this policy.",
      "There is evidence of abuse, fraud, chargeback misuse, Terms of Service violations, or Responsible Use violations.",
      "Pro generation capacity has been substantially or fully used, or usage patterns show excessive completed generations or other abuse of plan limits in a way that is inconsistent with a good-faith trial of the Service.",
      "Freemius’s rules as Merchant of Record for the transaction do not allow a refund in the circumstances presented.",
    ],
    subsections: [
      {
        title: "No open-ended automatic guarantee",
        paragraphs: [
          "Creatornivo does not advertise automatic refunds on demand for every purchase. The 7-day money-back guarantee applies as described above for unresolved product, access, or technical issues. Approval remains subject to verification, this policy (including consumptive usage limitations), Freemius’s processes, and mandatory law.",
        ],
      },
    ],
  },
  {
    id: "payment-provider",
    title: "Payment Provider / Merchant of Record (Freemius)",
    paragraphs: [
      "Paid Creatornivo subscriptions are processed by Freemius acting as Merchant of Record. Freemius may handle checkout, order support, invoices, taxes, payment methods, and refund processing for purchases made through its systems.",
      "If a refund is approved, it is typically returned to the original payment method through Freemius. Timing depends on Freemius, the payment method, and your financial institution.",
      "You may also contact Freemius about an order using the buyer channels Freemius makes available. This policy is not intended to conflict with Freemius’s refund policy or buyer protections; where Freemius’s rules apply to the payment, those rules govern the payment relationship.",
    ],
  },
  {
    id: "cancellation-vs-refund",
    title: "Cancellation Is Not a Refund",
    paragraphs: [
      "Canceling a subscription stops future renewals according to the Freemius customer billing portal and subscription status. Cancellation does not automatically refund amounts already paid for a completed purchase.",
      "After cancellation, access to paid features may continue until the end of the paid period shown in your account, depending on subscription status and provider period dates.",
    ],
  },
  {
    id: "after-refund",
    title: "After a Refund",
    paragraphs: [
      "If a refund is approved, it is processed through Freemius, and Creatornivo Pro access may be revoked or adjusted after the refund is confirmed.",
      "After a refund is confirmed, account access may be adjusted, limited, or ended according to subscription status, the reason for the refund, and applicable provider rules.",
      "A refund does not reset or restore consumed generation capacity. Completed generations that already used Pro capacity remain consumed and are not re-credited.",
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
