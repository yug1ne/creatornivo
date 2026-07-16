import { siteConfig } from "@/config/site";

import type { LegalSection } from "./types";

export type { LegalSection } from "./types";

export const privacyPolicyMeta = {
  title: "Privacy Policy",
  effectiveDate: "July 2, 2026",
  lastUpdated: "July 16, 2026",
} as const;

export const privacyPolicySections: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    paragraphs: [
      "Creatornivo is an independent software project operated by an individual based in Ukraine.",
      `This Privacy Policy explains how the operator of ${siteConfig.name} ("Creatornivo," "we," "us," or "our") collects, uses, and safeguards personal information when you use the Service.`,
      "Creatornivo helps users create content drafts with AI templates. When you generate content, information included in your request is sent to an AI provider to produce the result.",
      "We do not sell your personal information. We do not use third-party advertising trackers for targeted ads as part of the current product.",
    ],
  },
  {
    id: "information-we-collect",
    title: "Information We Collect",
    paragraphs: [
      "We collect information you provide, information created when you use the Service, and limited technical information from hosting and security systems.",
    ],
    subsections: [
      {
        title: "Account and authentication",
        list: [
          "Optional name, email address, and hashed password (we do not store plaintext passwords).",
          "Session and authentication data needed to keep you signed in.",
          "Email verification and password-reset related tokens and timestamps where those features are used.",
        ],
      },
      {
        title: "Generation and library content",
        list: [
          "Template selections and form inputs you submit for generation.",
          "AI-generated outputs returned for your requests.",
          "Saved library items (titles, content, tags, and related metadata) when you save content.",
          "Generation usage and reservation records used to enforce plan limits (counts, plan period, status, model identifiers, token counts where recorded, and timestamps).",
        ],
      },
      {
        title: "Subscription and payment metadata",
        list: [
          "Subscription status, plan indicators, and customer or transaction identifiers received from Paddle (Merchant of Record).",
          "We do not store full payment card numbers on Creatornivo servers.",
        ],
      },
      {
        title: "Communications and operations",
        list: [
          "Messages you send to support.",
          "Transactional email delivery metadata (for example, that a welcome, verification, password-reset, or quota-related email was sent).",
          "Application error and operational logs used to keep the Service running (see Processors).",
        ],
      },
      {
        title: "Technical and device data",
        list: [
          "Basic request information processed by hosting infrastructure (such as IP address and request headers) when delivering and protecting the Service.",
          "Creatornivo does not currently operate a separate product analytics or advertising tracking system.",
        ],
      },
      {
        title: "Local device storage",
        paragraphs: [
          "Some preferences may be stored only in your browser (for example theme preference and certain onboarding UI state). Local data stays on your device unless an action requires server synchronization.",
        ],
      },
    ],
  },
  {
    id: "how-we-use-information",
    title: "How We Use Information",
    paragraphs: ["We use personal information to:"],
    list: [
      "Provide authentication, accounts, generation, library, and export features.",
      "Process generation requests through AI providers and return results.",
      "Enforce quotas, rate limits, and security controls, and prevent abuse.",
      "Process subscriptions and billing events with Paddle.",
      "Send transactional emails (verification, password reset, important account or quota notices) when those features are enabled.",
      "Respond to support requests and improve reliability.",
      "Comply with legal obligations where applicable.",
    ],
  },
  {
    id: "processors",
    title: "Service Providers (Processors)",
    paragraphs: [
      "We share information with service providers only as needed to operate the Service. Based on current product configuration, these include:",
    ],
    list: [
      "OpenAI — AI model processing for content generation (prompt and related context for the request).",
      "Paddle — payment processing and Merchant of Record for paid subscriptions.",
      "Supabase / PostgreSQL — hosted database for account and Service data.",
      "Vercel — application hosting and delivery.",
      "Resend — transactional email delivery for product emails.",
      "Sentry — error monitoring and diagnostics (configured to support reliability; we aim not to send full generation prompt bodies as intentional product telemetry).",
      "Upstash — rate-limiting infrastructure for certain authentication and abuse-prevention checks when configured.",
    ],
    subsections: [
      {
        title: "No sale of personal information",
        paragraphs: [
          "We do not sell personal information or share it with third parties for their independent marketing.",
        ],
      },
      {
        title: "Legal disclosures",
        paragraphs: [
          "We may disclose information if required by law or to protect the rights, safety, or integrity of the Service and its users.",
        ],
      },
    ],
  },
  {
    id: "cookies-and-tracking",
    title: "Cookies and Local Storage",
    paragraphs: [
      "We use essential cookies and similar technologies for authentication and security. We do not currently use third-party advertising cookies or cross-site marketing pixels.",
    ],
    list: [
      "Authentication session cookies.",
      "Security-related tokens needed for secure browsing where applicable.",
      "Browser local storage for theme and certain onboarding UI state.",
    ],
  },
  {
    id: "data-security",
    title: "Data Security",
    paragraphs: [
      "We use reasonable technical and organizational measures, including HTTPS/TLS in transit, access controls, and hashed password storage. No method of transmission or storage is completely secure.",
      "You are responsible for keeping your credentials confidential.",
    ],
  },
  {
    id: "data-retention",
    title: "Data Retention and Your Controls",
    paragraphs: [
      "We retain account, generation, usage, and library data while your account is active or as needed to provide the Service and meet legal obligations.",
      "You can download a machine-readable copy of your account data from Settings → Privacy & Data (JSON export). Large histories may be truncated (for example, up to 5,000 records per category); the export indicates when truncation occurred.",
      "You can delete your account from Settings → Privacy & Data by re-entering your password and typing DELETE. Deletion removes account profile data, generations, saved library items, sessions, and related account data subject to limited retention for legal, security, or billing dispute needs. If you have an active paid subscription, you may need to cancel or resolve billing in the Customer Portal before deletion can complete.",
      "If self-service tools are unavailable for your account type, contact support so we can verify your identity and help process your request.",
    ],
  },
  {
    id: "user-rights",
    title: "Your Rights",
    paragraphs: [
      "Depending on where you live, you may have rights to access, correct, delete, or export personal information, or to object to or restrict certain processing. You may also have the right to lodge a complaint with a supervisory authority where applicable.",
    ],
    subsections: [
      {
        title: "How to exercise rights",
        paragraphs: [
          "Use Settings → Privacy & Data → Download my data for access/export, and Settings → Privacy & Data → Delete account for erasure where available (password verification required).",
          "For other requests, email the contact address below. We may need to verify your identity. We will respond within the timeframe required by applicable law when those laws apply.",
          "This section describes rights you may have; it is not a certification of compliance with every jurisdiction’s privacy law.",
        ],
      },
    ],
  },
  {
    id: "international-transfers",
    title: "International Processing",
    paragraphs: [
      "Service providers may process data in countries other than yours (including infrastructure used by OpenAI, Paddle, Supabase, Vercel, Resend, Sentry, and Upstash). By using the Service, you understand that processing may occur internationally subject to provider practices and applicable law.",
    ],
  },
  {
    id: "children",
    title: "Children’s Privacy",
    paragraphs: [
      "The Service is not directed to individuals under 16. We do not knowingly collect personal information from children. Contact us if you believe a child has provided personal information so we can delete it.",
    ],
  },
  {
    id: "changes",
    title: "Changes to This Policy",
    paragraphs: [
      'We may update this Privacy Policy from time to time. We will post the updated policy on this page and revise the "Last updated" date. Continued use after changes become effective constitutes acceptance where permitted by law.',
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [
      "Privacy questions and data requests:",
    ],
    list: [
      `Email: ${siteConfig.legal.privacyEmail}`,
      `Product: ${siteConfig.name}`,
      "Website: https://www.creatornivo.com/privacy",
    ],
  },
];
