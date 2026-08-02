import { generationPolicies, type Plan } from "@/config/plans";

/**
 * Server-owned output token ceilings by generation profile.
 * These are maxOutputTokens ceilings (not guaranteed usage).
 * Public generation quotas (Free 5/day, Pro 100/period) are unchanged.
 */
export const OUTPUT_TOKEN_PROFILES = {
  compact: 1000,
  short: 2000,
  medium: 4000,
  long: 6000,
  xl: 8000,
  xxl: 10000,
} as const;

export type OutputTokenProfile = keyof typeof OUTPUT_TOKEN_PROFILES;

/**
 * Exact reviewed slug → profile map for all active CreatorNivo templates.
 * Unknown slugs fall back to the caller's plan maxOutputTokens (not "short").
 */
export const TEMPLATE_OUTPUT_PROFILES = {
  // compact (1000)
  "discord-announcement": "compact",
  "linkedin-post": "compact",
  "push-notification": "compact",
  "review-response": "compact",
  "seo-meta-tags": "compact",
  "sms-campaign": "compact",
  "telegram-post": "compact",
  "tiktok-caption": "compact",

  // short (2000)
  "cold-email-outreach": "short",
  "facebook-post": "short",
  "google-business-profile-post": "short",
  "instagram-post": "short",
  "pinterest-pin": "short",
  "short-form-video": "short",
  "threads-post": "short",
  "website-popup": "short",
  "whatsapp-broadcast": "short",
  "x-thread": "short",

  // medium (4000)
  "amazon-listing": "medium",
  "app-store-listing": "medium",
  "etsy-listing": "medium",
  "in-app-ux-copy": "medium",
  "indie-hackers-post": "medium",
  "instagram-carousel": "medium",
  "linkedin-carousel": "medium",
  "paid-ad-copy": "medium",
  "press-release": "medium",
  "product-description": "medium",
  "product-hunt-launch": "medium",
  "quora-answer": "medium",
  "reddit-post": "medium",

  // long (6000)
  "case-study": "long",
  "email-sequence": "long",
  "github-readme": "long",
  "landing-page-copy": "long",
  newsletter: "long",
  "substack-post": "long",
  "youtube-video-package": "long",

  // xl (8000)
  "blog-article": "xl",
  "faq-page": "xl",
  "kickstarter-campaign": "xl",
  "sales-proposal": "xl",

  // xxl (10000)
  "podcast-script": "xxl",
  "webinar-package": "xxl",
  "youtube-script": "xxl",
} as const satisfies Record<string, OutputTokenProfile>;

export type MappedTemplateSlug = keyof typeof TEMPLATE_OUTPUT_PROFILES;

/** All slugs with an explicit profile (exactly the audited active set). */
export const MAPPED_TEMPLATE_OUTPUT_SLUGS = Object.freeze(
  Object.keys(TEMPLATE_OUTPUT_PROFILES) as MappedTemplateSlug[],
);

export function isMappedTemplateSlug(
  slug: string | null | undefined,
): slug is MappedTemplateSlug {
  return (
    typeof slug === "string" &&
    Object.prototype.hasOwnProperty.call(TEMPLATE_OUTPUT_PROFILES, slug)
  );
}

/**
 * Resolve maxOutputTokens for a generation.
 *
 * - Known slug → profile ceiling from the audited map
 * - Unknown / missing slug → plan fallback (Free 1000, Pro 2000)
 * - Never defaults unknown templates to the "short" profile
 */
export function getTemplateMaxOutputTokens(
  templateSlug: string | null | undefined,
  plan: Plan,
): number {
  if (isMappedTemplateSlug(templateSlug)) {
    const profile = TEMPLATE_OUTPUT_PROFILES[templateSlug];
    return OUTPUT_TOKEN_PROFILES[profile];
  }

  return generationPolicies[plan].maxOutputTokens;
}

export function getTemplateOutputProfile(
  templateSlug: string | null | undefined,
): OutputTokenProfile | null {
  if (!isMappedTemplateSlug(templateSlug)) {
    return null;
  }
  return TEMPLATE_OUTPUT_PROFILES[templateSlug];
}
