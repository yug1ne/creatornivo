# Creatornivo template migration status

Last updated: 2026-07-13

This file tracks the migration from short catalog-only forms to full
prompt-driven runtime prompts, form schemas, Help articles, Help mappings, and
template regression coverage.

## Status

Template migration: **Completed**.

Automated template acceptance: **Passed**.

Manual UI smoke: **Pending**.

Overall project release readiness: **In progress**.

Final template audit date: **2026-07-13**.

The template migration and automated acceptance checks are complete. This does
not mean the overall project is production-ready; project-level gates are tracked
separately below.

Final template audit results:

- Total templates: 45
- Free / Pro: 15 / 30
- Prompt source files: 45 / 45
- Form schemas: 45 / 45
- Help guide routes: 45 / 45
- Help button mappings: 45 / 45
- Prompt variable to form field parity: 45 / 45
- Runtime catalog prompt matches prompt source file: 45 / 45
- Template-specific open issues: 0
- Template-related tests: 203 / 203 passing
- Full local test suite: 431 / 431 passing
- System acceptance test: `tests/template-system-acceptance.test.ts`

## Remaining project-level tasks

| Severity | Area | File(s) | Issue | Next step |
|---|---|---|---|---|
| High | TypeScript | `tests/account-data-export.test.ts`, `tests/account-deletion.test.ts` | `tsc --noEmit` fails on existing non-template test typing errors: nullable `template`, implicit `any`, and `string \| undefined` passed to bcrypt compare. | Fix these unrelated account/privacy test type errors, then rerun TypeScript. |
| High | ESLint | `src/components/auth/sign-out-button.tsx`, `src/components/generate/generation-result.tsx`, `src/components/providers/theme-provider.tsx`, `src/components/ui/input.tsx`, `src/components/ui/textarea.tsx` | Full ESLint fails on existing non-template React hook / empty interface errors. | Fix unrelated lint errors, then rerun full ESLint. |
| Medium | ESLint warnings | `scripts/build-faq-page-form.mjs`, `src/app/api/admin/templates/route.ts`, `src/components/library/library-grid.tsx` | Full ESLint reports existing unused-variable warnings. | Clean up warnings when addressing lint gate. |
| Medium | Local tooling | Global npm installation | `npm run build` cannot start because `C:\Users\yugin\AppData\Roaming\npm\node_modules\npm\bin\npm-cli.js` is missing. | Repair local npm installation separately or run local binaries directly. |
| Medium | Production build | `src/app/layout.tsx` via `next/font/google` | Direct `next build` reaches production build but fails fetching Google Fonts (`Geist`, `Geist Mono`) in the restricted local environment. | Re-run build with network access or switch to self-hosted fonts in a separate task. |
| Medium | Manual UI smoke | `/generate`, `/templates`, `/generate/guides/*` | Automated tests verify prompt preview mapping, form metadata, Help mapping, counts, and access metadata, but a browser smoke pass opening every template on desktop/mobile was not completed in this local run. | After build/dev environment is available, run manual smoke for all template opening, search/filter, Help, desktop/mobile layout, and template switching. |

## Audit evidence

Commands run on 2026-07-13:

| Check | Result |
|---|---|
| `node --test --import tsx tests\template-system-acceptance.test.ts` | PASS, 7 / 7 |
| `node --test --import tsx tests\*-template.test.ts tests\template-system-acceptance.test.ts` | PASS, 203 / 203 |
| `node --test --import tsx tests\*.test.ts` | PASS, 431 / 431 |
| `eslint tests\template-system-acceptance.test.ts` | PASS |
| Full ESLint | FAIL on non-template files listed above |
| `node node_modules\typescript\bin\tsc --noEmit` | FAIL on non-template account/privacy tests listed above |
| `prisma generate` via local binary | PASS |
| `next build` via local binary | FAIL on external Google Fonts fetch |

## Inventory by plan and category

| Category | Count |
|---|---:|
| `app_ux` | 3 |
| `blog` | 1 |
| `community` | 6 |
| `ecommerce` | 3 |
| `email` | 2 |
| `facebook_post` | 1 |
| `google_business` | 1 |
| `instagram_post` | 2 |
| `linkedin_post` | 2 |
| `marketing` | 6 |
| `newsletter` | 1 |
| `pinterest` | 1 |
| `product` | 1 |
| `product_launch` | 2 |
| `reddit` | 1 |
| `sales` | 3 |
| `seo` | 2 |
| `threads_post` | 1 |
| `tiktok` | 1 |
| `x_thread` | 1 |
| `youtube` | 4 |

## Template status table

| Name | Slug | Category | Plan | Prompt ready | Form ready | Help ready | Help integration ready | Status | What remains |
|---|---|---:|---|---|---|---|---|---|---|
| Blog Article | `blog-article` | `blog` | free | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Cold Email Outreach | `cold-email-outreach` | `email` | free | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Facebook Post | `facebook-post` | `facebook_post` | free | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| FAQ Page | `faq-page` | `seo` | free | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Google Business Profile Post | `google-business-profile-post` | `google_business` | free | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Instagram Post | `instagram-post` | `instagram_post` | free | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| LinkedIn Post | `linkedin-post` | `linkedin_post` | free | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Newsletter | `newsletter` | `newsletter` | free | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Product Description | `product-description` | `product` | free | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Reddit Post | `reddit-post` | `reddit` | free | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| SEO Meta Tags | `seo-meta-tags` | `seo` | free | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Short-Form Video Script | `short-form-video` | `youtube` | free | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Threads Post | `threads-post` | `threads_post` | free | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| TikTok Caption | `tiktok-caption` | `tiktok` | free | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| X Thread | `x-thread` | `x_thread` | free | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Amazon Listing | `amazon-listing` | `ecommerce` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| App Store Listing | `app-store-listing` | `ecommerce` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Case Study | `case-study` | `marketing` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Discord Announcement | `discord-announcement` | `community` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Email Sequence | `email-sequence` | `email` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Etsy Listing | `etsy-listing` | `ecommerce` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| GitHub README | `github-readme` | `app_ux` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| In-App UX Copy | `in-app-ux-copy` | `app_ux` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Indie Hackers Post | `indie-hackers-post` | `community` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Instagram Carousel | `instagram-carousel` | `instagram_post` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Kickstarter Campaign | `kickstarter-campaign` | `product_launch` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Landing Page Copy | `landing-page-copy` | `marketing` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| LinkedIn Carousel | `linkedin-carousel` | `linkedin_post` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Paid Ad Copy | `paid-ad-copy` | `marketing` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Pinterest Pin | `pinterest-pin` | `pinterest` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Podcast Script | `podcast-script` | `youtube` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Press Release | `press-release` | `sales` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Product Hunt Launch | `product-hunt-launch` | `product_launch` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Push Notification | `push-notification` | `marketing` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Quora Answer | `quora-answer` | `community` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Review Response | `review-response` | `sales` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Sales Proposal | `sales-proposal` | `sales` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| SMS Campaign | `sms-campaign` | `marketing` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Substack Post | `substack-post` | `community` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Telegram Post | `telegram-post` | `community` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Webinar Package | `webinar-package` | `marketing` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| Website Popup | `website-popup` | `app_ux` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| WhatsApp Broadcast | `whatsapp-broadcast` | `community` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| YouTube Script | `youtube-script` | `youtube` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |
| YouTube Video Package | `youtube-video-package` | `youtube` | pro | Yes | Yes | Yes | Yes | Complete | No template-specific issue. |

## Current reference templates

Use these as implementation references for future template work:

- `facebook-post` for compact social-post architecture and tests.
- `blog-article` for a custom guide component that still delegates to `TemplateFieldGuide`.
- `sales-proposal`, `email-sequence`, and `kickstarter-campaign` for larger forms with grouped optional sections.

## Notes

- File-level stable IDs are not stored in `prisma/templates-catalog.json`; database
  `Template.id` values are generated by Prisma and preserved by `seed.ts` through
  `upsert({ where: { slug } })`. Slug stability is therefore the file-level
  invariant checked by the audit.
- The final audit did not change Prisma schema, migrations, auth, Paddle,
  pricing, environment variables, OpenAI provider, billing, or unrelated UI.
