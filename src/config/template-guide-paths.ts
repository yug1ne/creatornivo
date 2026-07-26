/**
 * Paths-only Help guide URLs for each generation template.
 *
 * This module is deliberately free of form schema / Help JSON imports so
 * client components (e.g. TemplateHelpButton) can resolve guide links without
 * pulling field schemas into the /generate JavaScript bundle.
 */
export const TEMPLATE_GUIDE_PATHS = {
  "amazon-listing": "/generate/guides/amazon-listing",
  "app-store-listing": "/generate/guides/app-store-listing",
  "blog-article": "/generate/guides/blog-article",
  "case-study": "/generate/guides/case-study",
  "cold-email-outreach": "/generate/guides/cold-email-outreach",
  "discord-announcement": "/generate/guides/discord-announcement",
  "email-sequence": "/generate/guides/email-sequence",
  "etsy-listing": "/generate/guides/etsy-listing",
  "facebook-post": "/generate/guides/facebook-post",
  "faq-page": "/generate/guides/faq-page",
  "github-readme": "/generate/guides/github-readme",
  "google-business-profile-post": "/generate/guides/google-business-profile-post",
  "in-app-ux-copy": "/generate/guides/in-app-ux-copy",
  "indie-hackers-post": "/generate/guides/indie-hackers-post",
  "instagram-carousel": "/generate/guides/instagram-carousel",
  "instagram-post": "/generate/guides/instagram-post",
  "kickstarter-campaign": "/generate/guides/kickstarter-campaign",
  "landing-page-copy": "/generate/guides/landing-page-copy",
  "linkedin-carousel": "/generate/guides/linkedin-carousel",
  "linkedin-post": "/generate/guides/linkedin-post",
  newsletter: "/generate/guides/newsletter",
  "paid-ad-copy": "/generate/guides/paid-ad-copy",
  "pinterest-pin": "/generate/guides/pinterest-pin",
  "podcast-script": "/generate/guides/podcast-script",
  "press-release": "/generate/guides/press-release",
  "product-description": "/generate/guides/product-description",
  "product-hunt-launch": "/generate/guides/product-hunt-launch",
  "push-notification": "/generate/guides/push-notification",
  "quora-answer": "/generate/guides/quora-answer",
  "reddit-post": "/generate/guides/reddit-post",
  "review-response": "/generate/guides/review-response",
  "sales-proposal": "/generate/guides/sales-proposal",
  "seo-meta-tags": "/generate/guides/seo-meta-tags",
  "short-form-video": "/generate/guides/short-form-video",
  "sms-campaign": "/generate/guides/sms-campaign",
  "substack-post": "/generate/guides/substack-post",
  "telegram-post": "/generate/guides/telegram-post",
  "threads-post": "/generate/guides/threads-post",
  "tiktok-caption": "/generate/guides/tiktok-caption",
  "webinar-package": "/generate/guides/webinar-package",
  "website-popup": "/generate/guides/website-popup",
  "whatsapp-broadcast": "/generate/guides/whatsapp-broadcast",
  "x-thread": "/generate/guides/x-thread",
  "youtube-script": "/generate/guides/youtube-script",
  "youtube-video-package": "/generate/guides/youtube-video-package",
} as const;

export type TemplateGuideSlug = keyof typeof TEMPLATE_GUIDE_PATHS;

export function getTemplateGuidePath(slug: string): string | undefined {
  return TEMPLATE_GUIDE_PATHS[slug as TemplateGuideSlug];
}
