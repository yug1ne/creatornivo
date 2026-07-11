"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { BLOG_ARTICLE_GUIDE_PATH } from "@/config/template-forms/blog-article";
import { COLD_EMAIL_OUTREACH_GUIDE_PATH } from "@/config/template-forms/cold-email-outreach";
import { FACEBOOK_POST_GUIDE_PATH } from "@/config/template-forms/facebook-post";
import { FAQ_PAGE_GUIDE_PATH } from "@/config/template-forms/faq-page";
import { GOOGLE_BUSINESS_PROFILE_POST_GUIDE_PATH } from "@/config/template-forms/google-business-profile-post";
import { INSTAGRAM_POST_GUIDE_PATH } from "@/config/template-forms/instagram-post";
import { LINKEDIN_POST_GUIDE_PATH } from "@/config/template-forms/linkedin-post";
import { NEWSLETTER_GUIDE_PATH } from "@/config/template-forms/newsletter";
import { cn } from "@/lib/utils/cn";

const GUIDE_PATH_BY_SLUG: Record<string, string> = {
  "blog-article": BLOG_ARTICLE_GUIDE_PATH,
  "cold-email-outreach": COLD_EMAIL_OUTREACH_GUIDE_PATH,
  "facebook-post": FACEBOOK_POST_GUIDE_PATH,
  "faq-page": FAQ_PAGE_GUIDE_PATH,
  "google-business-profile-post": GOOGLE_BUSINESS_PROFILE_POST_GUIDE_PATH,
  "instagram-post": INSTAGRAM_POST_GUIDE_PATH,
  "linkedin-post": LINKEDIN_POST_GUIDE_PATH,
  newsletter: NEWSLETTER_GUIDE_PATH,
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
