import { siteConfig } from "@/config/site";

import type { LegalSection } from "./types";

export const termsOfServiceMeta = {
  title: "Terms of Service",
  effectiveDate: "July 2, 2026",
  lastUpdated: "July 3, 2026",
} as const;

export const termsOfServiceSections: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    paragraphs: [
      `These Terms of Service ("Terms") govern your access to and use of ${siteConfig.name}, an AI-powered prompt generation and content toolkit (the "Service"), operated by ${siteConfig.legal.companyName} ("Creatornivo," "we," "us," or "our").`,
      'By creating an account, accessing, or using the Service, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, do not use the Service.',
      "These Terms constitute a legally binding agreement between you and Creatornivo. If you are using the Service on behalf of an organization, you represent that you have authority to bind that organization to these Terms.",
    ],
  },
  {
    id: "the-service",
    title: "The Service",
    paragraphs: [
      "Creatornivo provides structured AI prompt templates, content generation tools, and a personal library for saving and reusing outputs. The Service uses third-party artificial intelligence models to process prompts and return generated content based on your inputs.",
      "We may update, modify, or discontinue features at any time. We strive to provide reliable uptime but do not guarantee uninterrupted or error-free operation. Beta or experimental features may be offered without warranty.",
    ],
  },
  {
    id: "user-accounts",
    title: "User Accounts",
    paragraphs: [
      "To use most features of the Service, you must create an account. You may register with an email and password or through supported third-party authentication providers.",
    ],
    list: [
      "You must provide accurate, current, and complete registration information and keep it up to date.",
      "You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.",
      "You must notify us promptly at the contact address below if you suspect unauthorized access to your account.",
      "You must be at least 16 years old to use the Service. By creating an account, you represent that you meet this requirement.",
      "One person or legal entity may not maintain more than one free account for the purpose of circumventing plan limits. We reserve the right to merge or terminate duplicate accounts.",
    ],
    subsections: [
      {
        title: "Account security",
        paragraphs: [
          "We implement reasonable security measures, but you acknowledge that no system is completely secure. You agree not to share your login credentials or allow others to access your account except as permitted under a team or enterprise agreement we expressly authorize in writing.",
        ],
      },
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable Use",
    paragraphs: [
      "You agree to use Creatornivo only for lawful purposes and in accordance with these Terms. You are solely responsible for the content you input, generate, publish, or distribute using the Service.",
    ],
    subsections: [
      {
        title: "You may not",
        list: [
          "Use the Service to generate, store, or distribute content that is illegal, defamatory, harassing, hateful, discriminatory, sexually exploitative, or that promotes violence or self-harm.",
          "Generate spam, phishing material, malware instructions, or content intended to deceive, impersonate others, or commit fraud.",
          "Attempt to reverse engineer, scrape, crawl, or extract source code, models, prompts, or data from the Service except through documented APIs we provide.",
          "Circumvent usage limits, access controls, or billing mechanisms, including creating multiple accounts or using automated tools to abuse free-tier quotas.",
          "Upload or input personal data of third parties without a lawful basis and appropriate consent, including sensitive personal information you are not authorized to process.",
          "Use outputs in regulated contexts (such as medical, legal, or financial advice) without independent professional review and without disclosing that content was AI-generated where required by law.",
          "Resell, sublicense, or white-label the Service without our prior written consent.",
          "Interfere with or disrupt the integrity or performance of the Service or third-party providers connected to it.",
        ],
      },
      {
        title: "AI-generated content",
        paragraphs: [
          "AI outputs may be inaccurate, incomplete, outdated, or inappropriate for your use case. You are responsible for reviewing, editing, and verifying all generated content before publication or reliance. Creatornivo does not guarantee factual accuracy, originality, or fitness for a particular purpose.",
        ],
      },
    ],
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    paragraphs: [
      "The Service, including its software, design, branding, built-in templates, documentation, and underlying technology, is owned by Creatornivo and protected by intellectual property laws. Except for the limited rights expressly granted in these Terms, we reserve all rights.",
    ],
    subsections: [
      {
        title: "Your content",
        paragraphs: [
          "You retain ownership of the original inputs you provide and the outputs generated for your account, subject to third-party AI provider terms and applicable law. By using the Service, you grant Creatornivo a non-exclusive, worldwide, royalty-free license to host, process, store, and display your content solely to operate, maintain, and improve the Service — including processing prompts through AI infrastructure providers on your behalf.",
          "You represent that you have all necessary rights to submit your content and that your use of the Service does not infringe any third party's intellectual property or privacy rights.",
        ],
      },
      {
        title: "Feedback",
        paragraphs: [
          "If you submit suggestions, ideas, or feedback about the Service, you grant us a perpetual, irrevocable, royalty-free license to use that feedback without obligation or compensation to you.",
        ],
      },
      {
        title: "Trademarks",
        paragraphs: [
          `${siteConfig.name} and associated logos are trademarks of Creatornivo. You may not use our trademarks without prior written permission.`,
        ],
      },
    ],
  },
  {
    id: "payments-and-subscriptions",
    title: "Payments and Subscriptions",
    paragraphs: [
      "Creatornivo offers free and paid subscription plans. Payments are processed by Paddle, our payment processor and Merchant of Record. Paid plans (such as Pro) are billed on a recurring basis unless otherwise stated at checkout.",
    ],
    list: [
      "Prices are displayed in U.S. dollars unless otherwise noted and may change with reasonable notice. Promotional or early-access pricing applies only while explicitly offered and within stated limits.",
      "Subscriptions renew automatically at the end of each billing period unless you cancel before the renewal date through your account billing portal or by contacting support.",
      "You authorize us and our payment processor to charge your payment method for recurring fees, applicable taxes, and any agreed-upon add-ons.",
      "Refunds are governed by our Refund Policy, which includes a 14-day money-back guarantee for eligible first-time Pro purchases. Subscription renewals are generally non-refundable. If you cancel, you retain access to paid features through the end of the current billing period.",
      "We may suspend or downgrade your account if payment fails after reasonable retry attempts and notice.",
    ],
    subsections: [
      {
        title: "Free plan limits",
        paragraphs: [
          "Free accounts are subject to usage limits (such as daily generation caps and access to a subset of templates) as described on our pricing page. We may adjust free-tier limits to maintain platform quality and sustainability.",
        ],
      },
    ],
  },
  {
    id: "termination",
    title: "Termination",
    paragraphs: [
      "You may stop using the Service at any time and may request account deletion by contacting us. You may cancel a paid subscription through the billing portal provided in your account settings.",
    ],
    subsections: [
      {
        title: "Termination by Creatornivo",
        paragraphs: [
          "We may suspend or terminate your access immediately, without prior notice, if you violate these Terms, abuse the Service, fail to pay applicable fees, or if we are required to do so by law. We may also discontinue the Service or your account with reasonable notice where practicable.",
        ],
      },
      {
        title: "Effect of termination",
        list: [
          "Your right to access the Service ends upon termination.",
          "We may delete your account data after a reasonable retention period, subject to our Privacy Policy and legal obligations.",
          "Provisions that by their nature should survive termination — including intellectual property, disclaimers, limitation of liability, and governing law — will continue to apply.",
        ],
      },
    ],
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    paragraphs: [
      'THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY. TO THE FULLEST EXTENT PERMITTED BY LAW, CREATORNIVO DISCLAIMS ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.',
      "We do not warrant that AI-generated outputs will be accurate, unique, free of third-party claims, or suitable for your intended use. You assume all risk arising from your use of generated content.",
      "The Service may integrate with third-party providers (including AI and payment services). We are not responsible for third-party products, services, or policies.",
    ],
  },
  {
    id: "limitation-of-liability",
    title: "Limitation of Liability",
    paragraphs: [
      "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, CREATORNIVO AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR BUSINESS OPPORTUNITIES, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE — EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.",
      "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID TO CREATORNIVO IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS (USD $100).",
      "Some jurisdictions do not allow certain limitations of liability. In those jurisdictions, our liability is limited to the greatest extent permitted by law.",
    ],
  },
  {
    id: "indemnification",
    title: "Indemnification",
    paragraphs: [
      "You agree to defend, indemnify, and hold harmless Creatornivo and its affiliates from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or related to your use of the Service, your content, your violation of these Terms, or your violation of any third-party rights.",
    ],
  },
  {
    id: "governing-law",
    title: "Governing Law",
    paragraphs: [
      "These Terms are governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict-of-law principles.",
      "Any dispute arising out of or relating to these Terms or the Service shall be resolved exclusively in the state or federal courts located in Delaware, and you consent to the personal jurisdiction of those courts.",
      "Nothing in this section prevents either party from seeking injunctive or equitable relief in any court of competent jurisdiction to protect intellectual property or confidential information.",
    ],
  },
  {
    id: "general",
    title: "General Provisions",
    paragraphs: [
      "These Terms, together with the Privacy Policy and any plan-specific terms presented at checkout, constitute the entire agreement between you and Creatornivo regarding the Service.",
      "If any provision of these Terms is held invalid or unenforceable, the remaining provisions remain in full force and effect. Our failure to enforce any right or provision is not a waiver of that right or provision.",
      "You may not assign or transfer these Terms without our prior written consent. We may assign these Terms in connection with a merger, acquisition, or sale of assets.",
    ],
  },
  {
    id: "changes",
    title: "Changes to These Terms",
    paragraphs: [
      'We may revise these Terms from time to time. When we make material changes, we will post the updated Terms on this page and update the "Last updated" date. Where required by law or where changes materially affect your rights, we will provide additional notice (such as email notification). Continued use of the Service after changes become effective constitutes acceptance of the revised Terms.',
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [
      "Questions about these Terms, billing disputes, or account issues may be directed to:",
    ],
    list: [
      `Email: ${siteConfig.legal.legalEmail}`,
      `Product: ${siteConfig.name} — AI Prompt Toolkit`,
      "Website: https://www.creatornivo.com/terms",
    ],
  },
];
