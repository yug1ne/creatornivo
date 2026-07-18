import { siteConfig } from "@/config/site";

import type { LegalSection } from "./types";

export const responsibleUseMeta = {
  title: "Responsible Use",
  effectiveDate: "July 18, 2026",
  lastUpdated: "July 18, 2026",
} as const;

export const responsibleUseSections: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    paragraphs: [
      `${siteConfig.name} is an AI-assisted text drafting SaaS for creators, marketers, and indie makers. Users select predefined business templates (for example LinkedIn posts, product descriptions, or email outreach), fill structured fields, and receive draft text they can save or export.`,
      "This page explains what the product is for, what users must do before using outputs, and what uses are prohibited. It supplements our Terms of Service and helps payment providers, partners, and users understand how Creatornivo is intended to be used.",
      "If this page and the Terms of Service conflict on a specific rule, the Terms of Service control.",
    ],
  },
  {
    id: "what-creatornivo-is",
    title: "What Creatornivo Is",
    paragraphs: [
      "Creatornivo helps people draft professional, business-oriented text using structured templates and third-party AI models. The product is designed for drafting assistance—not for unsupervised publication, not for synthetic media of real people, and not for regulated professional advice.",
    ],
    list: [
      "AI-assisted text drafting with predefined business templates.",
      "User-provided inputs (form fields) that shape each draft.",
      "Plan-based generation limits and optional paid (Pro) features as described in the product and on Pricing.",
      "A personal library for saved drafts and export options where available.",
    ],
  },
  {
    id: "what-creatornivo-is-not",
    title: "What Creatornivo Is Not",
    paragraphs: [
      "Creatornivo is not a marketplace for adult content, not a deepfake or impersonation tool, not a spam engine, and not a substitute for licensed professionals.",
    ],
    list: [
      "Not an image, video, voice, or face-generation product.",
      "Not a tool for creating realistic likenesses of real people.",
      "Not legal, medical, financial, investment, or tax advice.",
      "Not a guarantee of rankings, conversions, compliance, or commercial results.",
    ],
  },
  {
    id: "human-review",
    title: "Human Review Required",
    paragraphs: [
      "All outputs are drafts. AI-generated text may be inaccurate, incomplete, biased, outdated, or unsuitable for your purpose.",
      "Before you publish, send, sell, post, or rely on any output, you must review, edit, and verify it yourself. You remain solely responsible for the inputs you provide and for how you use generated content.",
      "You are also responsible for complying with platform rules (for example LinkedIn, email providers, app stores), advertising standards, privacy laws, and any other laws that apply to your use of the content.",
    ],
  },
  {
    id: "intended-use",
    title: "Intended Use",
    paragraphs: [
      "Creatornivo is intended for lawful, professional drafting of business and creator content when you supply truthful inputs and review the result.",
    ],
    list: [
      "Marketing and social drafts based on templates (for example LinkedIn, product pages, newsletters).",
      "Product and listing copy that you will fact-check against your real offer.",
      "Email and outreach drafts that comply with anti-spam and consent rules you are subject to.",
      "Internal brainstorming and first-pass writing that a human finishes before use.",
    ],
  },
  {
    id: "prohibited-use",
    title: "Prohibited Use",
    paragraphs: [
      "You must not use Creatornivo—or submit inputs intended—to create, promote, or facilitate the following. This list is illustrative, not exhaustive. We may suspend or terminate accounts that violate these rules or our Terms of Service.",
    ],
    list: [
      "Adult or sexual content, including pornography, erotic roleplay, or sexual services marketing.",
      "Deepfakes, face swaps, voice cloning, or any attempt to impersonate a real person or organization without clear authorization and lawful purpose.",
      "Scams, phishing, social engineering, malware instructions, or other deceptive or fraudulent schemes.",
      "Unsolicited spam or bulk messaging that violates applicable law or platform rules.",
      "Gambling, betting, lotteries, or similar chance-based commercial schemes (except where clearly lawful and not prohibited by our Terms or payment partners).",
      "Cryptocurrency, token, or financial trading advice, investment tips, “signals,” or get-rich schemes.",
      "Legal, medical, diagnostic, pharmaceutical, or other regulated professional advice presented as authoritative guidance.",
      "Marketing or facilitation of regulated goods or services you are not lawfully allowed to offer (for example controlled substances, weapons where restricted, unlicensed financial services).",
      "Hate, harassment, threats, or content that targets people based on protected characteristics.",
      "Political persuasion or manipulation campaigns, including coordinated inauthentic behavior, undisclosed political advertising designed to mislead, or content intended to interfere with elections.",
      "Any other illegal activity, infringement of others’ rights, or use that creates a high risk of fraud, chargebacks, or harm to users or third parties.",
    ],
  },
  {
    id: "enforcement",
    title: "Enforcement",
    paragraphs: [
      "We may review reports, refuse service, limit features, suspend accounts, or terminate access when we reasonably believe these rules or our Terms of Service have been violated. Payment partners and AI providers may also restrict certain categories of activity.",
      "If you are unsure whether a use case is allowed, contact us before generating content for that purpose.",
    ],
  },
  {
    id: "related-policies",
    title: "Related Policies",
    paragraphs: [
      "For binding legal terms, privacy practices, and refunds, see:",
    ],
    list: [
      "Terms of Service: https://www.creatornivo.com/terms",
      "Privacy Policy: https://www.creatornivo.com/privacy",
      "Refund Policy: https://www.creatornivo.com/refund-policy",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [
      "Questions about responsible use, safety, or a suspected misuse of the Service:",
    ],
    list: [
      `Email: ${siteConfig.legal.legalEmail}`,
      `Product: ${siteConfig.name}`,
      "Website: https://www.creatornivo.com/responsible-use",
    ],
  },
];
