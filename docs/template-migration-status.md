# Creatornivo template migration status

Last updated: 2026-07-11

This file tracks the migration from short catalog-only forms to full
prompt-driven forms and Help articles.

Readiness definitions:

- Prompt ready: `prisma/template-prompts/<slug>.txt` exists and is the source of truth.
- Form ready: every prompt `{{variable}}` has a matching form field, and no extra
  field exists without review.
- Help ready: a template-specific guide page exists.
- Help integration ready: the Help button maps the template slug to the correct
  guide route.

Summary:

- Total templates: 45
- Complete: 17
- Needs full migration: 28
- Reference templates: `linkedin-post`, `x-thread`, `blog-article`,
  `youtube-script`, `case-study`
- UX review recommended before using as examples: `facebook-post`,
  `google-business-profile-post`

| Name | Slug | Category | Prompt ready | Form ready | Help ready | Help integration ready | Status | What remains | Future batch |
|---|---|---:|---|---|---|---|---|---|---:|
| Blog Article | `blog-article` | `blog` | Yes | Yes | Yes | Yes | Complete | Keep as reference. | - |
| Cold Email Outreach | `cold-email-outreach` | `email` | Yes | Yes | Yes | Yes | Complete | Minor review only. | - |
| Facebook Post | `facebook-post` | `facebook_post` | Yes | Yes | Yes | Yes | Complete; UX review recommended | Technically complete, but 376 fields need usability review before using as a standard. | - |
| FAQ Page | `faq-page` | `seo` | Yes | Yes | Yes | Yes | Complete | Minor review only. | - |
| Google Business Profile Post | `google-business-profile-post` | `google_business` | Yes | Yes | Yes | Yes | Complete; UX review recommended | Technically complete, but 423 fields need usability review before using as a standard. | - |
| Instagram Post | `instagram-post` | `instagram_post` | Yes | Yes | Yes | Yes | Complete | Minor review only. | - |
| LinkedIn Post | `linkedin-post` | `linkedin_post` | Yes | Yes | Yes | Yes | Complete | Use as reference. | - |
| Newsletter | `newsletter` | `newsletter` | Yes | Yes | Yes | Yes | Complete | Minor review only. | - |
| Product Description | `product-description` | `product` | Yes | Yes | Yes | Yes | Complete | Minor review only. | - |
| SEO Meta Tags | `seo-meta-tags` | `seo` | Yes | Yes | Yes | Yes | Complete | Minor review only. | - |
| Short-Form Video Script | `short-form-video` | `youtube` | Yes | Yes | Yes | Yes | Complete | Minor review only. | - |
| X Thread | `x-thread` | `x_thread` | Yes | Yes | Yes | Yes | Complete | Use as reference. | - |
| Case Study | `case-study` | `marketing` | Yes | Yes | Yes | Yes | Complete | Use as reference. | - |
| Landing Page Copy | `landing-page-copy` | `marketing` | Yes | Yes | Yes | Yes | Complete | Minor review only. | - |
| LinkedIn Carousel | `linkedin-carousel` | `linkedin_post` | Yes | Yes | Yes | Yes | Complete | Minor review only. | - |
| Paid Ad Copy | `paid-ad-copy` | `marketing` | Yes | Yes | Yes | Yes | Complete | Minor review only. | - |
| YouTube Script | `youtube-script` | `youtube` | Yes | Yes | Yes | Yes | Complete | Use as reference. | - |
| Threads Post | `threads-post` | `threads_post` | Yes | No | No | No | Needs full migration | Add 1 missing prompt variable to the form; create Help article; wire Help button. | 1 |
| Instagram Carousel | `instagram-carousel` | `instagram_post` | Yes | No | No | No | Needs full migration | Add 6 missing prompt variables to the form; create Help article; wire Help button. | 1 |
| TikTok Caption | `tiktok-caption` | `tiktok` | Yes | No | No | No | Needs full migration | Add 7 missing prompt variables to the form; create Help article; wire Help button. | 1 |
| Pinterest Pin | `pinterest-pin` | `pinterest` | Yes | No | No | No | Needs full migration | Add 10 missing prompt variables to the form; create Help article; wire Help button. | 1 |
| Reddit Post | `reddit-post` | `reddit` | Yes | No | No | No | Needs full migration | Add 14 missing prompt variables to the form; create Help article; wire Help button. | 1 |
| YouTube Video Package | `youtube-video-package` | `youtube` | Yes | No | No | No | Needs full migration | Add 27 missing prompt variables to the form; create Help article; wire Help button. | 2 |
| Telegram Post | `telegram-post` | `community` | Yes | No | No | No | Needs full migration | Add 27 missing prompt variables to the form; create Help article; wire Help button. | 2 |
| Email Sequence | `email-sequence` | `email` | Yes | No | No | No | Needs full migration | Add 33 missing prompt variables to the form; create Help article; wire Help button. | 2 |
| Product Hunt Launch | `product-hunt-launch` | `product_launch` | Yes | No | No | No | Needs full migration | Add 35 missing prompt variables to the form; create Help article; wire Help button. | 2 |
| App Store Listing | `app-store-listing` | `ecommerce` | Yes | No | No | No | Needs full migration; extra field review | Add 34 missing prompt variables; review extra catalog field `tone`; create Help article; wire Help button. | 2 |
| Amazon Listing | `amazon-listing` | `ecommerce` | Yes | No | No | No | Needs full migration | Add 38 missing prompt variables to the form; create Help article; wire Help button. | 3 |
| Etsy Listing | `etsy-listing` | `ecommerce` | Yes | No | No | No | Needs full migration | Add 121 missing prompt variables to the form; create Help article; wire Help button. | 3 |
| Quora Answer | `quora-answer` | `community` | Yes | No | No | No | Needs full migration | Add 23 missing prompt variables to the form; create Help article; wire Help button. | 3 |
| Substack Post | `substack-post` | `community` | Yes | No | No | No | Needs full migration | Add 46 missing prompt variables to the form; create Help article; wire Help button. | 3 |
| Podcast Script | `podcast-script` | `youtube` | Yes | No | No | No | Needs full migration | Add 75 missing prompt variables to the form; create Help article; wire Help button. | 3 |
| SMS Campaign | `sms-campaign` | `marketing` | Yes | No | No | No | Needs full migration | Add 108 missing prompt variables to the form; create Help article; wire Help button. | 4 |
| Push Notification | `push-notification` | `marketing` | Yes | No | No | No | Needs full migration | Add 133 missing prompt variables to the form; create Help article; wire Help button. | 4 |
| Webinar Package | `webinar-package` | `marketing` | Yes | No | No | No | Needs full migration | Add 97 missing prompt variables to the form; create Help article; wire Help button. | 4 |
| Review Response | `review-response` | `sales` | Yes | No | No | No | Needs full migration | Add 123 missing prompt variables to the form; create Help article; wire Help button. | 4 |
| In-App UX Copy | `in-app-ux-copy` | `app_ux` | Yes | No | No | No | Needs full migration | Add 256 missing prompt variables to the form; create Help article; wire Help button. | 4 |
| Discord Announcement | `discord-announcement` | `community` | Yes | No | No | No | Needs full migration | Add 172 missing prompt variables to the form; create Help article; wire Help button. | 5 |
| Indie Hackers Post | `indie-hackers-post` | `community` | Yes | No | No | No | Needs full migration | Add 131 missing prompt variables to the form; create Help article; wire Help button. | 5 |
| Website Popup | `website-popup` | `app_ux` | Yes | No | No | No | Needs full migration | Add 232 missing prompt variables to the form; create Help article; wire Help button. | 5 |
| GitHub README | `github-readme` | `app_ux` | Yes | No | No | No | Needs full migration | Add 294 missing prompt variables to the form; create Help article; wire Help button. | 6 |
| Kickstarter Campaign | `kickstarter-campaign` | `product_launch` | Yes | No | No | No | Needs full migration | Add 247 missing prompt variables to the form; create Help article; wire Help button. | 6 |
| Press Release | `press-release` | `sales` | Yes | No | No | No | Needs full migration | Add 313 missing prompt variables to the form; create Help article; wire Help button. | 6 |
| Sales Proposal | `sales-proposal` | `sales` | Yes | No | No | No | Needs full migration | Add 499 missing prompt variables to the form; create Help article; wire Help button. | 6 |
| WhatsApp Broadcast | `whatsapp-broadcast` | `community` | Yes | No | No | No | Needs full migration; technical placeholder review | Add 226 missing prompt variables, but first decide how to preserve literal WhatsApp examples `{{1}}`, `{{2}}`, `{{3}}` without treating them as user fields. Create Help article; wire Help button. | 6 |

## Batch notes

Batch 1 is intentionally small and high-impact. It focuses on social/community
templates with the lowest number of missing variables.

Later batches are provisional. Reorder them if product priority changes, but
keep each batch to 3-5 templates and do not mix template migration with Prisma,
auth, Paddle, checkout, webhook, pricing, or environment work.
