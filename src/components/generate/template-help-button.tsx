"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { AMAZON_LISTING_GUIDE_PATH } from "@/config/template-forms/amazon-listing";
import { APP_STORE_LISTING_GUIDE_PATH } from "@/config/template-forms/app-store-listing";
import { BLOG_ARTICLE_GUIDE_PATH } from "@/config/template-forms/blog-article";
import { CASE_STUDY_GUIDE_PATH } from "@/config/template-forms/case-study";
import { COLD_EMAIL_OUTREACH_GUIDE_PATH } from "@/config/template-forms/cold-email-outreach";
import { DISCORD_ANNOUNCEMENT_GUIDE_PATH } from "@/config/template-forms/discord-announcement";
import { EMAIL_SEQUENCE_GUIDE_PATH } from "@/config/template-forms/email-sequence";
import { ETSY_LISTING_GUIDE_PATH } from "@/config/template-forms/etsy-listing";
import { FACEBOOK_POST_GUIDE_PATH } from "@/config/template-forms/facebook-post";
import { FAQ_PAGE_GUIDE_PATH } from "@/config/template-forms/faq-page";
import { GITHUB_README_GUIDE_PATH } from "@/config/template-forms/github-readme";
import { GOOGLE_BUSINESS_PROFILE_POST_GUIDE_PATH } from "@/config/template-forms/google-business-profile-post";
import { IN_APP_UX_COPY_GUIDE_PATH } from "@/config/template-forms/in-app-ux-copy";
import { INDIE_HACKERS_POST_GUIDE_PATH } from "@/config/template-forms/indie-hackers-post";
import { INSTAGRAM_CAROUSEL_GUIDE_PATH } from "@/config/template-forms/instagram-carousel";
import { INSTAGRAM_POST_GUIDE_PATH } from "@/config/template-forms/instagram-post";
import { KICKSTARTER_CAMPAIGN_GUIDE_PATH } from "@/config/template-forms/kickstarter-campaign";
import { LANDING_PAGE_COPY_GUIDE_PATH } from "@/config/template-forms/landing-page-copy";
import { LINKEDIN_CAROUSEL_GUIDE_PATH } from "@/config/template-forms/linkedin-carousel";
import { LINKEDIN_POST_GUIDE_PATH } from "@/config/template-forms/linkedin-post";
import { NEWSLETTER_GUIDE_PATH } from "@/config/template-forms/newsletter";
import { PAID_AD_COPY_GUIDE_PATH } from "@/config/template-forms/paid-ad-copy";
import { PINTEREST_PIN_GUIDE_PATH } from "@/config/template-forms/pinterest-pin";
import { PODCAST_SCRIPT_GUIDE_PATH } from "@/config/template-forms/podcast-script";
import { PRESS_RELEASE_GUIDE_PATH } from "@/config/template-forms/press-release";
import { PRODUCT_DESCRIPTION_GUIDE_PATH } from "@/config/template-forms/product-description";
import { PRODUCT_HUNT_LAUNCH_GUIDE_PATH } from "@/config/template-forms/product-hunt-launch";
import { PUSH_NOTIFICATION_GUIDE_PATH } from "@/config/template-forms/push-notification";
import { QUORA_ANSWER_GUIDE_PATH } from "@/config/template-forms/quora-answer";
import { REDDIT_POST_GUIDE_PATH } from "@/config/template-forms/reddit-post";
import { REVIEW_RESPONSE_GUIDE_PATH } from "@/config/template-forms/review-response";
import { SALES_PROPOSAL_GUIDE_PATH } from "@/config/template-forms/sales-proposal";
import { SEO_META_TAGS_GUIDE_PATH } from "@/config/template-forms/seo-meta-tags";
import { SHORT_FORM_VIDEO_GUIDE_PATH } from "@/config/template-forms/short-form-video";
import { SMS_CAMPAIGN_GUIDE_PATH } from "@/config/template-forms/sms-campaign";
import { SUBSTACK_POST_GUIDE_PATH } from "@/config/template-forms/substack-post";
import { TELEGRAM_POST_GUIDE_PATH } from "@/config/template-forms/telegram-post";
import { THREADS_POST_GUIDE_PATH } from "@/config/template-forms/threads-post";
import { TIKTOK_CAPTION_GUIDE_PATH } from "@/config/template-forms/tiktok-caption";
import { WEBINAR_PACKAGE_GUIDE_PATH } from "@/config/template-forms/webinar-package";
import { WEBSITE_POPUP_GUIDE_PATH } from "@/config/template-forms/website-popup";
import { WHATSAPP_BROADCAST_GUIDE_PATH } from "@/config/template-forms/whatsapp-broadcast";
import { X_THREAD_GUIDE_PATH } from "@/config/template-forms/x-thread";
import { YOUTUBE_VIDEO_PACKAGE_GUIDE_PATH } from "@/config/template-forms/youtube-video-package";
import { YOUTUBE_SCRIPT_GUIDE_PATH } from "@/config/template-forms/youtube-script";
import { cn } from "@/lib/utils/cn";

const GUIDE_PATH_BY_SLUG: Record<string, string> = {
  "amazon-listing": AMAZON_LISTING_GUIDE_PATH,
  "app-store-listing": APP_STORE_LISTING_GUIDE_PATH,
  "blog-article": BLOG_ARTICLE_GUIDE_PATH,
  "case-study": CASE_STUDY_GUIDE_PATH,
  "cold-email-outreach": COLD_EMAIL_OUTREACH_GUIDE_PATH,
  "discord-announcement": DISCORD_ANNOUNCEMENT_GUIDE_PATH,
  "email-sequence": EMAIL_SEQUENCE_GUIDE_PATH,
  "etsy-listing": ETSY_LISTING_GUIDE_PATH,
  "facebook-post": FACEBOOK_POST_GUIDE_PATH,
  "faq-page": FAQ_PAGE_GUIDE_PATH,
  "github-readme": GITHUB_README_GUIDE_PATH,
  "google-business-profile-post": GOOGLE_BUSINESS_PROFILE_POST_GUIDE_PATH,
  "in-app-ux-copy": IN_APP_UX_COPY_GUIDE_PATH,
  "indie-hackers-post": INDIE_HACKERS_POST_GUIDE_PATH,
  "instagram-carousel": INSTAGRAM_CAROUSEL_GUIDE_PATH,
  "instagram-post": INSTAGRAM_POST_GUIDE_PATH,
  "kickstarter-campaign": KICKSTARTER_CAMPAIGN_GUIDE_PATH,
  "landing-page-copy": LANDING_PAGE_COPY_GUIDE_PATH,
  "linkedin-carousel": LINKEDIN_CAROUSEL_GUIDE_PATH,
  "linkedin-post": LINKEDIN_POST_GUIDE_PATH,
  newsletter: NEWSLETTER_GUIDE_PATH,
  "paid-ad-copy": PAID_AD_COPY_GUIDE_PATH,
  "pinterest-pin": PINTEREST_PIN_GUIDE_PATH,
  "podcast-script": PODCAST_SCRIPT_GUIDE_PATH,
  "press-release": PRESS_RELEASE_GUIDE_PATH,
  "product-description": PRODUCT_DESCRIPTION_GUIDE_PATH,
  "product-hunt-launch": PRODUCT_HUNT_LAUNCH_GUIDE_PATH,
  "push-notification": PUSH_NOTIFICATION_GUIDE_PATH,
  "quora-answer": QUORA_ANSWER_GUIDE_PATH,
  "reddit-post": REDDIT_POST_GUIDE_PATH,
  "review-response": REVIEW_RESPONSE_GUIDE_PATH,
  "sales-proposal": SALES_PROPOSAL_GUIDE_PATH,
  "seo-meta-tags": SEO_META_TAGS_GUIDE_PATH,
  "short-form-video": SHORT_FORM_VIDEO_GUIDE_PATH,
  "sms-campaign": SMS_CAMPAIGN_GUIDE_PATH,
  "substack-post": SUBSTACK_POST_GUIDE_PATH,
  "telegram-post": TELEGRAM_POST_GUIDE_PATH,
  "threads-post": THREADS_POST_GUIDE_PATH,
  "tiktok-caption": TIKTOK_CAPTION_GUIDE_PATH,
  "webinar-package": WEBINAR_PACKAGE_GUIDE_PATH,
  "website-popup": WEBSITE_POPUP_GUIDE_PATH,
  "whatsapp-broadcast": WHATSAPP_BROADCAST_GUIDE_PATH,
  "x-thread": X_THREAD_GUIDE_PATH,
  "youtube-video-package": YOUTUBE_VIDEO_PACKAGE_GUIDE_PATH,
  "youtube-script": YOUTUBE_SCRIPT_GUIDE_PATH,
};

interface TemplateHelpButtonProps {
  templateSlug: string;
  className?: string;
}

export function TemplateHelpButton({
  templateSlug,
  className,
}: TemplateHelpButtonProps) {
  const href = GUIDE_PATH_BY_SLUG[templateSlug];
  if (!href) return null;

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "gap-1.5",
        className,
      )}
      title="Open field guide in a new tab"
    >
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs font-semibold"
        aria-hidden
      >
        ?
      </span>
      Help
    </Link>
  );
}
