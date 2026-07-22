import { siteConfig } from "@/config/site";

import type { LegalSection } from "./types";

export const termsOfServiceMeta = {
  title: "Terms of Service",
  effectiveDate: "July 2, 2026",
  lastUpdated: "July 22, 2026",
} as const;

export const termsOfServiceSections: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    paragraphs: [
      "Creatornivo is an independent software project operated by an individual based in Ukraine.",
      `These Terms of Service ("Terms") govern your access to and use of ${siteConfig.name}, an AI-powered content generation service that helps creators, marketers, and indie makers draft content using structured templates (the "Service"). References to "we," "us," or "our" mean the operator of Creatornivo.`,
      "By creating an account, accessing, or using the Service, you agree to these Terms and our Privacy Policy. If you do not agree, do not use the Service.",
    ],
  },
  {
    id: "the-service",
    title: "The Service",
    paragraphs: [
      "Creatornivo provides structured content templates, AI-assisted generation, a personal library for saved outputs, and export options for eligible plans as described in the product interface.",
      "The Service uses third-party AI models to process your inputs and return generated drafts. Features, templates, and limits may change as the product evolves.",
      "We may update, modify, suspend, or discontinue parts of the Service. Availability is not guaranteed to be uninterrupted or error-free.",
    ],
  },
  {
    id: "early-access",
    title: "Early Access / Beta",
    paragraphs: [
      "Creatornivo may be offered as Early Access or beta software. Features, usage limits, availability, pricing, and integrations may change. You should keep your own copies of important content.",
      "Current plan prices and promotional Early Access pricing, when offered, are shown on the Pricing page. For example, the product may display an Early Access monthly price and a regular monthly Pro price; the amounts shown in the product control. When self-serve paid checkout is re-enabled, applicable prices and taxes will also be shown at purchase.",
    ],
  },
  {
    id: "user-accounts",
    title: "User Accounts and Subscriptions",
    paragraphs: [
      "Most features require an account with an email address and password. Free and paid (Pro) plans may be available, with different templates and generation limits as described in the product and on the Pricing page.",
    ],
    list: [
      "You must provide accurate registration information and keep it up to date.",
      "You are responsible for your credentials and for activity under your account.",
      "Notify us promptly at the contact address below if you suspect unauthorized access.",
      "You must be at least 16 years old to use the Service.",
      "Do not create multiple free accounts to circumvent plan limits.",
      "When paid checkout is available, access to paid features depends on successful payment processing and an active eligible subscription status from our designated payment provider, as well as compliance with these Terms. While self-serve paid checkout is unavailable, early access or paid access may be granted only through support as described on the Pricing page.",
    ],
  },
  {
    id: "usage-limits",
    title: "Usage Limits",
    paragraphs: [
      "Generation is subject to plan limits enforced by the Service. As of the last update of these Terms, the product is configured approximately as follows (the in-app usage display and server rules control if they differ):",
    ],
    list: [
      "Free plan: a limited number of completed generations per UTC day (currently five per day in product configuration).",
      "Pro plan: a limited number of completed generations per UTC calendar month (currently one hundred per month in product configuration).",
      "Attempting to bypass quotas, rate limits, security controls, or access controls is prohibited.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable Use",
    paragraphs: [
      "You agree to use the Service only for lawful purposes. You are solely responsible for inputs you provide and for how you use generated outputs.",
    ],
    list: [
      "Do not use the Service for illegal, harmful, harassing, hateful, fraudulent, or infringing activity.",
      "Do not generate spam, phishing material, malware instructions, or content intended to deceive or impersonate others.",
      "Do not attempt to reverse engineer, scrape, or extract system prompts, models, or non-public data beyond normal product use.",
      "Do not circumvent usage limits, authentication, or billing mechanisms.",
      "Do not submit personal data of others without a lawful basis and appropriate rights.",
      "Do not interfere with the integrity or performance of the Service or its providers.",
    ],
  },
  {
    id: "ai-disclaimer",
    title: "AI Outputs Disclaimer",
    paragraphs: [
      "AI-generated content may be inaccurate, incomplete, biased, outdated, or unsuitable for your purpose. Outputs are drafts, not professional advice.",
      "You must review, edit, and verify all generated content before publishing, sending, or relying on it. Creatornivo does not guarantee factual accuracy, originality, uniqueness, rankings, conversion results, or fitness for a particular purpose.",
      "You are responsible for compliance with platform rules, advertising standards, and laws that apply to your use of the content.",
    ],
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    paragraphs: [
      "The Service software, design, branding, and built-in templates are owned by the operator of Creatornivo, subject to third-party rights. Except for rights expressly granted, all rights are reserved.",
      "You retain rights in original inputs you provide and in outputs generated for your account, subject to third-party AI provider terms and applicable law. You grant us a limited license to host, process, and store content only as needed to operate the Service, including sending prompts to AI providers on your behalf.",
      "You represent that you have the rights needed to submit your content and that your use does not infringe others' rights.",
    ],
  },
  {
    id: "payments-and-subscriptions",
    title: "Payments and Subscriptions",
    paragraphs: [
      "Self-serve paid checkout is currently unavailable while we finalize our payment provider. Early Access and paid access requests are handled via support, as described on the Pricing page.",
      "When paid checkout is available, paid subscriptions will be processed by our designated third-party payment provider acting as Merchant of Record. Pricing, taxes, and checkout details will be presented at purchase and may include Early Access promotional pricing when available.",
    ],
    list: [
      "Prices are typically shown in U.S. dollars unless otherwise noted and may change with notice through the product or communications.",
      "When paid checkout is available, subscriptions will renew according to the plan and the payment provider’s checkout and buyer terms unless you cancel before renewal through the provider’s customer billing portal or another available cancellation path.",
      "By completing a purchase when checkout is available, you authorize charges for applicable fees and taxes through the designated payment provider.",
      "Refunds, if any, are handled as described in our Refund Policy and may involve the payment provider’s buyer and refund processes when a paid purchase exists.",
      "Access to paid features may change when subscription status is unpaid, past due, paused, canceled, or otherwise ineligible.",
    ],
  },
  {
    id: "termination",
    title: "Termination",
    paragraphs: [
      "You may stop using the Service at any time. Where available, you may delete your account from Settings → Privacy & Data by confirming your password and typing DELETE. Deletion is permanent.",
      "If you later have an active paid subscription through our payment provider, you may need to cancel or resolve billing through the provider’s customer portal or with support before deleting your account when the product requires it.",
      "We may suspend or terminate access if you violate these Terms, abuse the Service, fail to pay required fees, or if required by law. We may also discontinue the Service with notice where practicable.",
    ],
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    paragraphs: [
      'THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, TO THE FULLEST EXTENT PERMITTED BY LAW, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
      "We do not warrant uninterrupted operation, error-free generation, or that outputs will meet your expectations. Third-party services (AI, payments, hosting, email) are governed by their own terms.",
      "Nothing in these Terms excludes rights that cannot lawfully be excluded.",
    ],
  },
  {
    id: "limitation-of-liability",
    title: "Limitation of Liability",
    paragraphs: [
      "TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE OPERATOR OF CREATORNIVO SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, ARISING FROM USE OF THE SERVICE.",
      "TO THE MAXIMUM EXTENT PERMITTED BY LAW, TOTAL LIABILITY FOR CLAIMS RELATING TO THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) AMOUNTS YOU PAID TO CREATORNIVO FOR THE SERVICE IN THE TWELVE MONTHS BEFORE THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS (USD $100).",
      "Some jurisdictions do not allow certain limitations; in those cases liability is limited to the greatest extent permitted.",
    ],
  },
  {
    id: "indemnification",
    title: "Indemnification",
    paragraphs: [
      "You agree to indemnify and hold harmless the operator of Creatornivo from claims, damages, and expenses arising from your content, your use of the Service, or your violation of these Terms or third-party rights, to the extent permitted by law.",
    ],
  },
  {
    id: "governing-law",
    title: "Governing Law",
    paragraphs: [
      "These Terms are governed by the laws of Ukraine, without prejudice to mandatory consumer rights that may apply in your country of residence. Disputes shall be handled by competent courts of Ukraine unless mandatory law requires otherwise.",
    ],
  },
  {
    id: "changes",
    title: "Changes to These Terms",
    paragraphs: [
      'We may update these Terms from time to time. We will post the updated Terms on this page and update the "Last updated" date. Continued use after changes become effective constitutes acceptance where permitted by law.',
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [
      "Questions about these Terms or the Service:",
    ],
    list: [
      `Email: ${siteConfig.legal.legalEmail}`,
      `Product: ${siteConfig.name}`,
      "Website: https://www.creatornivo.com/terms",
    ],
  },
];
