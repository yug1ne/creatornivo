import { siteConfig } from "@/config/site";

import type { LegalSection } from "./types";

export const refundPolicyMeta = {
  title: "Refund Policy",
  effectiveDate: "July 2, 2026",
  lastUpdated: "July 3, 2026",
} as const;

/** Generations above this count during the guarantee window void eligibility. */
export const refundUsageThreshold = 100;

export const refundPolicySections: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    paragraphs: [
      `This Refund Policy explains when and how you may request a refund for paid subscriptions to ${siteConfig.name} ("Creatornivo," "we," "us," or "our"). It applies to purchases made through our website. Payments are processed by Paddle, our payment processor and Merchant of Record.`,
      "We want you to be confident when upgrading to Pro. If the Service is not a good fit, our 14-day money-back guarantee gives you a fair window to try it — while protecting against abuse of AI generation resources.",
      "This policy supplements our Terms of Service. Where they conflict on refund matters, this Refund Policy controls.",
    ],
  },
  {
    id: "money-back-guarantee",
    title: "14-Day Money-Back Guarantee",
    paragraphs: [
      "If you are a new Pro subscriber, you may request a full refund of your first Pro subscription payment within fourteen (14) calendar days of the initial charge date (the \"Guarantee Period\").",
      "This guarantee applies only to your first paid Pro subscription on Creatornivo. It does not apply to subscription renewals, add-ons, taxes, currency conversion fees charged by your bank, or purchases made after a prior refund on the same account or email address.",
      "Promotional and early-access pricing (including discounted introductory rates) is eligible for the same 14-day guarantee, subject to the usage limits described below.",
    ],
  },
  {
    id: "eligibility",
    title: "Eligibility",
    paragraphs: [
      "To qualify for a refund under the money-back guarantee, all of the following must be true at the time of your request:",
    ],
    list: [
      "Your request is submitted within 14 calendar days of your first Pro payment.",
      "This is the first paid Pro subscription associated with your Creatornivo account and email address.",
      "Your account is in good standing and has not violated our Terms of Service or Acceptable Use policy.",
      "You have not previously received a refund from Creatornivo on any account.",
      "You have not initiated a chargeback or payment dispute with your bank or card issuer before contacting us.",
    ],
  },
  {
    id: "usage-limits",
    title: "When Refunds Are Not Available",
    paragraphs: [
      `Even within the 14-day Guarantee Period, you are not eligible for a refund if you have substantially used Pro features. Specifically, refunds will be denied if any of the following apply:`,
    ],
    list: [
      `You have completed more than ${refundUsageThreshold} AI generations on your Pro plan during the Guarantee Period (including streamed or partial generations counted as completed).`,
      "You have exported more than 25 files using Pro export features during the Guarantee Period.",
      "Your account has been suspended or terminated for abuse, fraud, or violation of our Terms.",
      "You request a refund after the 14-day Guarantee Period has expired.",
      "You request a refund for a subscription renewal, partial billing period, or prorated charge after the first payment.",
      "You purchased through an unauthorized reseller or received access outside our official checkout flow.",
    ],
    subsections: [
      {
        title: "Why usage limits apply",
        paragraphs: [
          "Pro subscriptions include access to AI infrastructure with real per-generation costs. The usage thresholds above are designed to be generous for genuine evaluation while preventing refund abuse. Most users evaluating Creatornivo for content workflows will remain well below these limits during the 14-day guarantee period.",
        ],
      },
      {
        title: "Renewals and cancellation",
        paragraphs: [
          "Subscription renewals are generally non-refundable. You may cancel at any time through your account billing portal to prevent future charges. After cancellation, you retain Pro access through the end of the current paid billing period.",
          "Canceling a subscription is not the same as requesting a refund. Cancellation stops future billing; a refund returns payment for an eligible first-time purchase as described in this policy.",
        ],
      },
    ],
  },
  {
    id: "how-to-request",
    title: "How to Request a Refund",
    paragraphs: [
      "To request a refund, email us at the address below with the subject line \"Refund Request\" and include:",
    ],
    list: [
      "The email address associated with your Creatornivo account.",
      "The date of your Pro subscription payment.",
      "A brief explanation of why the Service did not meet your needs (optional but helpful).",
    ],
    subsections: [
      {
        title: "Review process",
        paragraphs: [
          "We review refund requests within 3–5 business days. We may ask clarifying questions or verify account usage. If approved, refunds are issued to the original payment method through Paddle.",
          "Depending on your financial institution, it may take an additional 5–10 business days for the refund to appear on your statement.",
        ],
      },
      {
        title: "After approval",
        paragraphs: [
          "Upon refund approval, your Pro subscription will be canceled immediately and your account will be downgraded to the Free plan. Saved content and generation history may remain accessible under Free plan limits unless you request account deletion separately.",
        ],
      },
    ],
  },
  {
    id: "chargebacks",
    title: "Chargebacks and Disputes",
    paragraphs: [
      "Please contact us before filing a chargeback or payment dispute with your bank. We are committed to resolving billing concerns fairly and promptly.",
      "If a chargeback is filed while a refund request is pending or without contacting us first, we may suspend your account pending resolution and decline future refund requests associated with that payment method or identity.",
    ],
  },
  {
    id: "legal-rights",
    title: "Statutory Rights",
    paragraphs: [
      "Nothing in this policy limits your mandatory consumer rights under applicable law. If you are located in the European Union, United Kingdom, or another jurisdiction with statutory cooling-off or withdrawal rights, you may have additional remedies independent of this voluntary guarantee.",
      "Where local law requires refunds in circumstances not covered here, we will comply with those legal obligations.",
    ],
  },
  {
    id: "changes",
    title: "Changes to This Policy",
    paragraphs: [
      'We may update this Refund Policy from time to time. Changes will be posted on this page with an updated "Last updated" date. Material changes will not retroactively reduce refund rights for payments already made under a prior version without your consent where prohibited by law.',
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [
      "Refund requests and billing questions:",
    ],
    list: [
      `Email: ${siteConfig.legal.billingEmail}`,
      `Product: ${siteConfig.name} — AI Prompt Toolkit`,
      "Website: https://www.creatornivo.com/refund-policy",
    ],
  },
];
