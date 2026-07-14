import type { TemplateCategory } from "@/types/template";

export type TemplateQaCategory =
  | "Social Media"
  | "Email"
  | "Marketing"
  | "Content Creation"
  | "SEO"
  | "Video & Audio"
  | "Ecommerce"
  | "Community"
  | "Product Launch"
  | "App, Sales & Support";

export interface TemplateQaRuleSet {
  category: TemplateQaCategory;
  templateCategories: TemplateCategory[];
  hardFailRules: string[];
  warningRules: string[];
  countControls: string[];
  expectedSections: string[];
  commonFakeClaimRisks: string[];
  expectations: string[];
}

export const GENERIC_MARKETING_CLICHES = [
  "effortlessly",
  "seamless",
  "seamlessly",
  "streamline",
  "game-changing",
  "transform",
  "boost",
  "enhance",
  "in minutes",
  "quick and easy",
  "never run out",
  "guaranteed",
  "drive engagement",
  "increase sales",
  "unlock",
  "say goodbye",
  "no more",
] as const;

export const SHARED_HARD_FAIL_RULES = [
  "unresolved placeholders",
  "unsafe tokens",
  "None-only sections",
  "fake placeholder URLs",
  "ignored count controls",
  "ignored plain-text output option",
  "missing required disclosure",
  "exact user-prohibited phrase",
] as const;

export const CATEGORY_QA_RULE_SETS: TemplateQaRuleSet[] = [
  {
    category: "Social Media",
    templateCategories: [
      "facebook_post",
      "google_business",
      "instagram_post",
      "linkedin_post",
      "pinterest",
      "reddit",
      "threads_post",
      "tiktok",
      "x_thread",
    ],
    hardFailRules: [...SHARED_HARD_FAIL_RULES],
    warningRules: ["generic hype", "unsupported audience growth claims"],
    countControls: ["variantCount", "numberOfVariants", "slide count", "thread length"],
    expectedSections: ["platform-native copy", "posting/publishing notes when useful"],
    commonFakeClaimRisks: ["fake engagement", "fake urgency", "fake social proof"],
    expectations: ["URLs and disclosures must appear only when supplied or required."],
  },
  {
    category: "Email",
    templateCategories: ["email", "newsletter"],
    hardFailRules: [...SHARED_HARD_FAIL_RULES],
    warningRules: ["generic hype", "overpromising outcomes"],
    countControls: ["variantCount", "emailCount", "includePlainTextVersions"],
    expectedSections: ["subject options", "preview text when applicable", "email body"],
    commonFakeClaimRisks: ["fake recipient pain", "fake unsubscribe URL", "fake results"],
    expectations: ["Opt-out and disclosure language must not be invented."],
  },
  {
    category: "Marketing",
    templateCategories: ["marketing"],
    hardFailRules: [...SHARED_HARD_FAIL_RULES],
    warningRules: ["generic hype", "unsupported conversion claims"],
    countControls: ["numberOfVariants", "headlineOptions"],
    expectedSections: ["core copy", "CTA", "verification notes when needed"],
    commonFakeClaimRisks: ["fake scarcity", "fake testimonials", "fake performance claims"],
    expectations: ["Claims, prices, deadlines, and proof must come from supplied inputs."],
  },
  {
    category: "Content Creation",
    templateCategories: ["blog", "product"],
    hardFailRules: [...SHARED_HARD_FAIL_RULES],
    warningRules: ["generic filler", "unsupported expertise claims"],
    countControls: ["headlineOptions", "FAQ count", "section count"],
    expectedSections: ["content body", "metadata or notes when requested"],
    commonFakeClaimRisks: ["fake sources", "fake quotes", "unsupported research"],
    expectations: ["Source, citation, and quote fields must be respected exactly."],
  },
  {
    category: "SEO",
    templateCategories: ["seo"],
    hardFailRules: [...SHARED_HARD_FAIL_RULES],
    warningRules: ["ranking promises", "traffic promises"],
    countControls: ["variant count", "metadata count"],
    expectedSections: ["SEO title", "meta description"],
    commonFakeClaimRisks: ["guaranteed rankings", "unsupported search volume"],
    expectations: ["Do not promise ranking, clicks, leads, or traffic."],
  },
  {
    category: "Video & Audio",
    templateCategories: ["youtube"],
    hardFailRules: [...SHARED_HARD_FAIL_RULES],
    warningRules: ["viral promises", "generic engagement hype"],
    countControls: ["hook count", "segment count", "variant count"],
    expectedSections: ["script or package", "CTA", "production notes when useful"],
    commonFakeClaimRisks: ["fake views", "fake audience retention", "fake platform rules"],
    expectations: ["Visual/audio references must not claim unavailable assets."],
  },
  {
    category: "Ecommerce",
    templateCategories: ["ecommerce"],
    hardFailRules: [...SHARED_HARD_FAIL_RULES],
    warningRules: ["unsupported superiority claims", "generic urgency"],
    countControls: ["title options", "bullet count"],
    expectedSections: ["listing copy", "purchase information when supplied"],
    commonFakeClaimRisks: ["fake discounts", "fake reviews", "fake availability"],
    expectations: ["Prices, offers, delivery, warranty, and return terms must be supplied."],
  },
  {
    category: "Community",
    templateCategories: ["community"],
    hardFailRules: [...SHARED_HARD_FAIL_RULES],
    warningRules: ["fake community participation", "generic hype"],
    countControls: ["variant count", "message count"],
    expectedSections: ["community-native copy", "moderation or posting notes when useful"],
    commonFakeClaimRisks: ["fake members", "fake testimonials", "fake event details"],
    expectations: ["Do not imply community rules, attendance, or relationships not supplied."],
  },
  {
    category: "Product Launch",
    templateCategories: ["product_launch"],
    hardFailRules: [...SHARED_HARD_FAIL_RULES],
    warningRules: ["fake launch urgency", "unsupported traction claims"],
    countControls: ["variant count", "asset count"],
    expectedSections: ["launch copy", "CTA", "verification notes when needed"],
    commonFakeClaimRisks: ["fake scarcity", "fake launch metrics", "fake endorsements"],
    expectations: ["Deadlines, availability, and proof must be supplied explicitly."],
  },
  {
    category: "App, Sales & Support",
    templateCategories: ["app_ux", "sales"],
    hardFailRules: [...SHARED_HARD_FAIL_RULES],
    warningRules: ["unsupported business outcomes", "generic sales hype"],
    countControls: ["variant count", "step count", "email count"],
    expectedSections: ["recommended copy", "implementation notes when needed"],
    commonFakeClaimRisks: ["fake ROI", "fake customer proof", "unsupported compliance"],
    expectations: ["UX, sales, and support copy must preserve supplied constraints."],
  },
];

export function getQaRuleSetForTemplateCategory(
  category: TemplateCategory,
): TemplateQaRuleSet {
  return (
    CATEGORY_QA_RULE_SETS.find((ruleSet) =>
      ruleSet.templateCategories.includes(category),
    ) ?? CATEGORY_QA_RULE_SETS[2]
  );
}
