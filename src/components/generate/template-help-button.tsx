"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { BLOG_ARTICLE_GUIDE_PATH } from "@/config/template-forms/blog-article";
import { CASE_STUDY_GUIDE_PATH } from "@/config/template-forms/case-study";
import { COLD_EMAIL_OUTREACH_GUIDE_PATH } from "@/config/template-forms/cold-email-outreach";
import { EMAIL_SEQUENCE_GUIDE_PATH } from "@/config/template-forms/email-sequence";
import { FACEBOOK_POST_GUIDE_PATH } from "@/config/template-forms/facebook-post";
import { FAQ_PAGE_GUIDE_PATH } from "@/config/template-forms/faq-page";
import { GOOGLE_BUSINESS_PROFILE_POST_GUIDE_PATH } from "@/config/template-forms/google-business-profile-post";
import { INSTAGRAM_CAROUSEL_GUIDE_PATH } from "@/config/template-forms/instagram-carousel";
import { INSTAGRAM_POST_GUIDE_PATH } from "@/config/template-forms/instagram-post";
import { LANDING_PAGE_COPY_GUIDE_PATH } from "@/config/template-forms/landing-page-copy";
import { LINKEDIN_CAROUSEL_GUIDE_PATH } from "@/config/template-forms/linkedin-carousel";
import { LINKEDIN_POST_GUIDE_PATH } from "@/config/template-forms/linkedin-post";
import { NEWSLETTER_GUIDE_PATH } from "@/config/template-forms/newsletter";
import { PAID_AD_COPY_GUIDE_PATH } from "@/config/template-forms/paid-ad-copy";
import { PINTEREST_PIN_GUIDE_PATH } from "@/config/template-forms/pinterest-pin";
import { PRODUCT_DESCRIPTION_GUIDE_PATH } from "@/config/template-forms/product-description";
import { REDDIT_POST_GUIDE_PATH } from "@/config/template-forms/reddit-post";
import { SEO_META_TAGS_GUIDE_PATH } from "@/config/template-forms/seo-meta-tags";
import { SHORT_FORM_VIDEO_GUIDE_PATH } from "@/config/template-forms/short-form-video";
import { THREADS_POST_GUIDE_PATH } from "@/config/template-forms/threads-post";
import { TIKTOK_CAPTION_GUIDE_PATH } from "@/config/template-forms/tiktok-caption";
import { X_THREAD_GUIDE_PATH } from "@/config/template-forms/x-thread";
import { YOUTUBE_VIDEO_PACKAGE_GUIDE_PATH } from "@/config/template-forms/youtube-video-package";
import { YOUTUBE_SCRIPT_GUIDE_PATH } from "@/config/template-forms/youtube-script";
import { cn } from "@/lib/utils/cn";

const GUIDE_PATH_BY_SLUG: Record<string, string> = {
  "blog-article": BLOG_ARTICLE_GUIDE_PATH,
  "case-study": CASE_STUDY_GUIDE_PATH,
  "cold-email-outreach": COLD_EMAIL_OUTREACH_GUIDE_PATH,
  "email-sequence": EMAIL_SEQUENCE_GUIDE_PATH,
  "facebook-post": FACEBOOK_POST_GUIDE_PATH,
  "faq-page": FAQ_PAGE_GUIDE_PATH,
  "google-business-profile-post": GOOGLE_BUSINESS_PROFILE_POST_GUIDE_PATH,
  "instagram-carousel": INSTAGRAM_CAROUSEL_GUIDE_PATH,
  "instagram-post": INSTAGRAM_POST_GUIDE_PATH,
  "landing-page-copy": LANDING_PAGE_COPY_GUIDE_PATH,
  "linkedin-carousel": LINKEDIN_CAROUSEL_GUIDE_PATH,
  "linkedin-post": LINKEDIN_POST_GUIDE_PATH,
  newsletter: NEWSLETTER_GUIDE_PATH,
  "paid-ad-copy": PAID_AD_COPY_GUIDE_PATH,
  "pinterest-pin": PINTEREST_PIN_GUIDE_PATH,
  "product-description": PRODUCT_DESCRIPTION_GUIDE_PATH,
  "reddit-post": REDDIT_POST_GUIDE_PATH,
  "seo-meta-tags": SEO_META_TAGS_GUIDE_PATH,
  "short-form-video": SHORT_FORM_VIDEO_GUIDE_PATH,
  "threads-post": THREADS_POST_GUIDE_PATH,
  "tiktok-caption": TIKTOK_CAPTION_GUIDE_PATH,
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
