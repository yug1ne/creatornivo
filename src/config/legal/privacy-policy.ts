import { siteConfig } from "@/config/site";

import type { LegalSection } from "./types";

export type { LegalSection } from "./types";

export const privacyPolicyMeta = {
  title: "Privacy Policy",
  effectiveDate: "July 2, 2026",
  lastUpdated: "July 5, 2026",
} as const;

export const privacyPolicySections: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    paragraphs: [
      "Creatornivo is an independent software project operated by an individual based in Ukraine.",
      'Creatornivo ("Creatornivo," "we," "us," or "our") provides an AI-powered prompt toolkit and content generation platform (the "Service"). This Privacy Policy explains how the operator of Creatornivo collects, uses, discloses, and safeguards personal information when you visit our website, create an account, or use our features.',
      "Creatornivo is designed to help people generate content using structured AI prompts and templates. Because the Service relies on artificial intelligence, information included in a generation request is sent to an AI provider to return the requested result.",
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
          "Account details such as your optional name, email address, and authentication credentials, including your hashed password.",
          "Content you submit when using templates, including variable inputs, assembled prompts, AI-generated outputs, and saved prompts in your personal library.",
          "Billing-related identifiers when you subscribe to a paid plan (handled by our payment processor; we do not store full payment card numbers).",
          "Communications you send to us, including support requests and privacy inquiries.",
        ],
      },
      {
        title: "Information collected automatically",
        list: [
          "Session and authentication tokens necessary to keep you signed in.",
          "Usage records needed to operate the Service and enforce plan limits, including generation reservations and counts, model and token information, timestamps, and template references where applicable.",
          "Hosting and infrastructure providers may process basic request information, such as IP address and browser request headers, when delivering and protecting the Service under their own terms and privacy policies. Creatornivo does not currently operate a separate analytics or advertising tracking system.",
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
      "We use personal information for purposes related to operating Creatornivo:",
    ],
    list: [
      "Providing, maintaining, and securing the Service, including authentication, account management, and subscription billing.",
      "Processing your prompts through AI models and returning generated content you request.",
      "Storing your generations and saved prompts in your account so you can access, search, and reuse them.",
      "Enforcing plan limits, preventing fraud and abuse, and protecting the integrity of the platform.",
      "Responding to support requests and communicating important Service updates.",
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
      "AI processing: When you generate content, the assembled prompt and necessary context are transmitted to OpenAI strictly to fulfill your generation request. OpenAI processes data under its own terms and privacy policy.",
      "Payment processing: Payments are processed by Paddle, our payment processor and Merchant of Record. We receive subscription status, customer identifiers, and limited billing metadata — not your full card details.",
      "Database infrastructure: Supabase provides the hosted PostgreSQL database used to store account and Service data.",
      "Hosting infrastructure: Vercel hosts and delivers the Service.",
      "Email communications: Namecheap Private Email provides the email service used for support and policy-related communications.",
      "Legal and safety: We may disclose information if required by law, court order, or governmental request, or when we believe disclosure is necessary to protect the rights, property, or safety of Creatornivo, our users, or the public.",
      "Project transfers: If operation of Creatornivo or its assets is transferred to a successor operator, relevant information may be transferred as part of that transaction, subject to continued protections consistent with this policy.",
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
      "We implement technical and organizational measures designed to protect personal information against unauthorized access, alteration, disclosure, or destruction. These measures include encryption in transit (TLS/HTTPS), access controls, hashed password storage, and access limited to the operator and service providers where needed to operate the Service.",
      "No method of transmission or electronic storage is completely secure. While we strive to protect your information, we cannot guarantee absolute security. You are responsible for maintaining the confidentiality of your account credentials.",
      "If we become aware of a data breach that affects your personal information, we will notify you and relevant authorities as required by applicable law.",
    ],
  },
  {
    id: "data-retention",
    title: "Data Retention",
    paragraphs: [
      "We retain account information, generation history, generation usage records, and saved prompts while your account is active or as needed to provide the Service.",
      "You can download a machine-readable copy of your account data from Settings → Privacy & Data. Exports are provided in JSON format and may be truncated to 5,000 records per category when your history is very large; the export indicates when truncation occurred.",
      "You can delete your account from Settings → Privacy & Data. Deletion requires re-entering your password and typing DELETE to confirm. Account deletion is permanent and removes your profile, generations, saved library items, sessions, and related account data. If you have an active paid subscription (including a subscription scheduled to cancel at period end while paid access remains), you must cancel or resolve billing in the Customer Portal before deletion can proceed.",
      "Limited records may be retained where required for legal compliance, billing disputes, fraud prevention, or security. For example, anonymized billing adjustment records may remain without a link to your user account. Service providers may apply their own documented retention periods.",
      "If you cannot use self-service tools (for example, password verification is unavailable for your account type), contact support and we will help verify your identity and process your request.",
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
          "For access and data portability, use Settings → Privacy & Data → Download my data. For erasure, use Settings → Privacy & Data → Delete account (subject to the restrictions described in Data Retention). Both actions require password verification.",
          "For other rights (rectification, restriction, objection, or requests you cannot complete in the product), contact us using the details in the Contact Information section below. We will respond within the timeframe required by applicable law (typically within 30 days for GDPR requests). We may need to verify your identity before fulfilling a request.",
          "Creatornivo processes personal data on the legal bases of contract performance (providing the Service you signed up for), legitimate interests (security, product improvement, fraud prevention), legal obligation, and consent where applicable.",
        ],
      },
    ],
  },
  {
    id: "international-transfers",
    title: "International Data Transfers",
    paragraphs: [
      "Creatornivo and its service providers may process information in countries other than your own, including locations used by OpenAI, Paddle, Supabase, Vercel, and the email provider. Where applicable law requires safeguards for an international transfer, the operator will use an appropriate lawful mechanism. The specific mechanism depends on the provider and transfer involved.",
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
