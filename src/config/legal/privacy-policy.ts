import { siteConfig } from "@/config/site";

import type { LegalSection } from "./types";

export type { LegalSection } from "./types";

export const privacyPolicyMeta = {
  title: "Privacy Policy",
  effectiveDate: "July 2, 2026",
  lastUpdated: "July 3, 2026",
} as const;

export const privacyPolicySections: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    paragraphs: [
      'Creatornivo ("Creatornivo," "we," "us," or "our") operates an AI-powered prompt toolkit and content generation platform (the "Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard personal information when you visit our website, create an account, or use our features.',
      "Creatornivo is designed to help creators, marketers, and teams generate content using structured AI prompts and templates. Because the Service relies on artificial intelligence, some information you provide is processed by third-party AI providers solely to deliver generation results.",
      "We do not sell your personal information. We do not share your data with advertisers for targeted advertising. Wherever practical, preferences and non-essential settings are stored locally in your browser rather than on our servers.",
    ],
  },
  {
    id: "information-we-collect",
    title: "Information We Collect",
    paragraphs: [
      "We collect information in three ways: information you provide directly, information generated through your use of the Service, and limited technical information collected automatically.",
    ],
    subsections: [
      {
        title: "Information you provide",
        list: [
          "Account details such as your name, email address, and authentication credentials (including passwords or OAuth sign-in data from providers you choose, such as Google or GitHub).",
          "Profile information you optionally add, including an avatar image.",
          "Content you submit when using templates, including variable inputs, assembled prompts, AI-generated outputs, and saved prompts in your personal library.",
          "Billing-related identifiers when you subscribe to a paid plan (handled by our payment processor; we do not store full payment card numbers).",
          "Communications you send to us, including support requests and privacy inquiries.",
        ],
      },
      {
        title: "Information collected automatically",
        list: [
          "Session and authentication tokens necessary to keep you signed in.",
          "Usage data such as generation counts, template selections, and feature interactions needed to operate the Service and enforce plan limits.",
          "Device and log data, including IP address, browser type, operating system, referring URLs, and timestamps — collected in server logs for security, debugging, and abuse prevention.",
        ],
      },
      {
        title: "Information stored locally on your device",
        paragraphs: [
          "Where possible, we store non-essential preferences in your browser's local storage instead of our databases. This currently includes theme preferences (light, dark, or system) and certain onboarding UI state. Data stored locally remains on your device and is not transmitted to us unless you take an action that requires server synchronization.",
        ],
      },
    ],
  },
  {
    id: "how-we-use-information",
    title: "How We Use Information",
    paragraphs: [
      "We use personal information only for legitimate business purposes related to operating and improving Creatornivo:",
    ],
    list: [
      "Providing, maintaining, and securing the Service, including authentication, account management, and subscription billing.",
      "Processing your prompts through AI models and returning generated content you request.",
      "Storing your generations and saved prompts in your account so you can access, search, and reuse them.",
      "Enforcing plan limits, preventing fraud and abuse, and protecting the integrity of the platform.",
      "Responding to support requests and communicating important Service updates.",
      "Analyzing aggregated, de-identified usage patterns to improve templates, performance, and product experience.",
      "Complying with legal obligations and enforcing our terms of service.",
    ],
  },
  {
    id: "data-sharing",
    title: "Data Sharing",
    paragraphs: [
      "We do not sell, rent, or trade your personal information. We share information only in the limited circumstances described below:",
    ],
    list: [
      "AI processing providers: When you generate content, the assembled prompt and necessary context are transmitted to third-party AI infrastructure providers (such as OpenAI or comparable model providers) strictly to fulfill your generation request. These providers process data under their own terms and privacy policies and are not permitted to use your content to train models on your behalf unless you separately opt in with that provider.",
      "Payment processing: Payments are processed by Paddle, our payment processor and Merchant of Record. We receive subscription status, customer identifiers, and limited billing metadata — not your full card details.",
      "Infrastructure providers: We use cloud hosting, database, and email delivery vendors that process data on our behalf under data processing agreements and only as instructed by us.",
      "Legal and safety: We may disclose information if required by law, court order, or governmental request, or when we believe disclosure is necessary to protect the rights, property, or safety of Creatornivo, our users, or the public.",
      "Business transfers: If we are involved in a merger, acquisition, or asset sale, your information may be transferred as part of that transaction, subject to continued protections consistent with this policy.",
    ],
    subsections: [
      {
        title: "No sale of personal information",
        paragraphs: [
          "We do not share your personal information with third parties for their independent marketing purposes.",
        ],
      },
    ],
  },
  {
    id: "cookies-and-tracking",
    title: "Cookies and Tracking",
    paragraphs: [
      "Creatornivo uses a minimal approach to cookies and similar technologies. We do not use third-party advertising cookies or cross-site tracking pixels.",
    ],
    subsections: [
      {
        title: "Essential cookies and storage",
        list: [
          "Authentication session cookies required to keep you signed in securely.",
          "Security-related tokens that protect against cross-site request forgery and unauthorized access.",
        ],
      },
      {
        title: "Local storage",
        list: [
          "Theme preference (light, dark, or system) stored in your browser via localStorage.",
          "Onboarding progress stored locally where applicable, with optional synchronization to your account.",
        ],
      },
      {
        title: "Analytics",
        paragraphs: [
          "If we deploy privacy-respecting analytics in the future, we will update this policy and, where required by law, request your consent before using non-essential tracking technologies.",
        ],
      },
    ],
  },
  {
    id: "data-security",
    title: "Data Security",
    paragraphs: [
      "We implement technical and organizational measures designed to protect personal information against unauthorized access, alteration, disclosure, or destruction. These measures include encryption in transit (TLS/HTTPS), access controls, hashed password storage, and restricted internal access on a need-to-know basis.",
      "No method of transmission or electronic storage is completely secure. While we strive to protect your information, we cannot guarantee absolute security. You are responsible for maintaining the confidentiality of your account credentials.",
      "If we become aware of a data breach that affects your personal information, we will notify you and relevant authorities as required by applicable law.",
    ],
  },
  {
    id: "data-retention",
    title: "Data Retention",
    paragraphs: [
      "We retain account information for as long as your account is active or as needed to provide the Service. Generation history and saved prompts are retained until you delete them or close your account, unless a longer retention period is required by law.",
      "You may request deletion of your account and associated data at any time by contacting us. Some information may be retained in anonymized or backup form for a limited period where necessary for legal compliance, dispute resolution, or security.",
    ],
  },
  {
    id: "user-rights",
    title: "User Rights (GDPR & Similar Laws)",
    paragraphs: [
      "If you are located in the European Economic Area (EEA), United Kingdom, or another jurisdiction with comparable data protection laws, you have the following rights regarding your personal information. Residents of other regions may have similar rights under local law.",
    ],
    list: [
      "Right of access — request a copy of the personal information we hold about you.",
      "Right to rectification — request correction of inaccurate or incomplete information.",
      "Right to erasure — request deletion of your personal information, subject to legal exceptions.",
      "Right to restriction — request that we limit how we process your information in certain circumstances.",
      "Right to data portability — receive your information in a structured, commonly used, machine-readable format where technically feasible.",
      "Right to object — object to processing based on legitimate interests, including profiling.",
      "Right to withdraw consent — where processing is based on consent, you may withdraw it at any time without affecting the lawfulness of prior processing.",
      "Right to lodge a complaint — file a complaint with your local data protection supervisory authority.",
    ],
    subsections: [
      {
        title: "How to exercise your rights",
        paragraphs: [
          "To exercise any of these rights, contact us using the details in the Contact Information section below. We will respond within the timeframe required by applicable law (typically within 30 days for GDPR requests). We may need to verify your identity before fulfilling a request.",
          "Creatornivo processes personal data on the legal bases of contract performance (providing the Service you signed up for), legitimate interests (security, product improvement, fraud prevention), legal obligation, and consent where applicable.",
        ],
      },
    ],
  },
  {
    id: "international-transfers",
    title: "International Data Transfers",
    paragraphs: [
      "Creatornivo may process and store information in countries other than your own, including the United States, where our infrastructure and service providers operate. When we transfer personal information internationally, we implement appropriate safeguards such as Standard Contractual Clauses or equivalent mechanisms as required by applicable law.",
    ],
  },
  {
    id: "children",
    title: "Children's Privacy",
    paragraphs: [
      "The Service is not directed to individuals under 16 years of age, and we do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we will promptly delete it.",
    ],
  },
  {
    id: "changes",
    title: "Changes to This Policy",
    paragraphs: [
      'We may update this Privacy Policy from time to time. When we make material changes, we will post the updated policy on this page and revise the "Last updated" date. Where required by law, we will provide additional notice (such as email notification). Your continued use of the Service after changes become effective constitutes acceptance of the revised policy.',
    ],
  },
  {
    id: "contact",
    title: "Contact Information",
    paragraphs: [
      "If you have questions about this Privacy Policy, wish to exercise your privacy rights, or need to report a security concern, please contact us:",
    ],
    list: [
      `Email: ${siteConfig.legal.privacyEmail}`,
      `Product: ${siteConfig.name} — AI Prompt Toolkit`,
      "Website: https://www.creatornivo.com/privacy",
    ],
  },
];
