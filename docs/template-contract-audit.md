# Creatornivo template contract audit

Final audit date: 2026-07-14

Scope: all 45 existing Creatornivo templates. This audit checks technical contract consistency only. It does not propose making templates structurally identical, and it does not treat platform-native differences as defects.

Follow-up status: the single confirmed Reddit Post prompt-level conflict has been resolved. No form, Help, registry, sanitizer, Prisma, auth, Paddle, pricing, environment, commit, push, or deployment changes were made for that fix.

## Audit principle

Only technical guarantees are standardized:

- required fields must block generation when missing;
- optional fields may be blank;
- blank optional fields must not create invented data, placeholders, or public-facing control labels;
- prompt variables and form fields must match exactly;
- conditional fields must reference real controlling fields;
- required-only and full-field rendered prompts must not contain unresolved `{{variables}}`, `undefined`, `null`, `N/A`, or `[object Object]`;
- Copy, Save, and Export must use the final sanitized/validated result.

The templates themselves remain intentionally different and platform-specific.

## Methodology

The audit used static and deterministic checks only:

- `prisma/templates-catalog.json`;
- `prisma/template-prompts/*.txt`;
- `src/config/template-forms/*-variables.json`;
- runtime helpers in `src/lib/templates/utils.ts`;
- output sanitizer/validator contract in `src/lib/templates/output-validation.ts`;
- existing template, renderer, sanitizer, and acceptance tests.

No OpenAI calls were made. No database or Supabase connection was used.

Modes checked:

- Initial: schema defaults only.
- Required-only: all required fields filled, optional values blank.
- Full-field: all fields supplied.
- Explicit absence: meaningful `None`, `Off`, `No promotion`, `No affiliation`, etc.
- Auto: `Auto` values remain meaningful and must not violate missing-data guards.

## Summary

| Metric | Result |
|---|---:|
| Total templates | 45 |
| Contract clean | 45 |
| Needs manual review | 0 |
| Needs targeted fix | 0 |
| Critical issues | 0 |
| High issues | 0 |
| Medium issues | 0 |
| Low issues | 0 |
| Conditional form controls (`showWhen`) | 147 |
| Proven skeleton conflicts | 0 |
| Prompts potentially requiring one minimal prompt-level change | 0 |
| Automated deterministic checks | PASS |

Current verdict: the template system is technically coherent. There are no remaining proven prompt-level skeleton conflicts.

## Findings requiring owner review

None.

Resolved follow-up item:

- `reddit-post` now keeps `## Posting Notes` inside a conditional branch only.
- When no concrete pre-publication action remains, the prompt instructs the model to end after the Ready-to-Post Version and omit the entire Posting Notes section.
- Runtime output cleanup remains as backup protection for sentinel-only Posting Notes sections.

## Per-template contract register

Legend:

- Fields total (R/O) = total fields, required fields, optional fields.
- Meaningful defaults = defaults that remain active technical, explicit-absence, or Auto values.
- Conditional/dependency signals = conditional UI fields and missing-data guard categories relevant to that template.

| Template | Slug | Use case | Complexity | Fields total (R/O) | Meaningful defaults | Always-output sections (summary) | Conditional/dependency signals | Conflicts / severity | Status |
|---|---|---|---|---:|---:|---|---|---|---|
| Blog Article | blog-article | blog | Complex | 42 (7/35) | 17/19 | Editorial Brief; Headline Options; Article Outline; Publication-Ready Article; SEO Metadata; CTA Recommendation; FAQ; Source and Claim Notes | showWhen 5; risk guards disclosure, proof, timing, url | None / None | Contract clean |
| Cold Email Outreach | cold-email-outreach | email | Standard | 34 (6/28) | 10/12 | Outreach Angle; Subject Line Options; Opening Line Options; Initial Email; Follow-Up Email or Emails; Personalization Guidance | showWhen 2; risk guards commercial, contact, disclosure, proof, url | None / None | Contract clean |
| Facebook Post | facebook-post | facebook_post | Compact | 24 (6/18) | 11/13 | Facebook-native post package; conditional link, visual, and verification guidance | showWhen 2; risk guards commercial, proof, timing, url, visual | None / None | Contract clean |
| FAQ Page | faq-page | seo | Complex | 42 (7/35) | 12/14 | FAQ page package; questions, answers, intro/CTA/implementation notes when relevant | showWhen 5; risk guards proof, timing, url | None / None | Contract clean |
| Google Business Profile Post | google-business-profile-post | google_business | Compact | 23 (6/17) | 5/8 | POST COPY; POST DETAILS; CTA; VISUAL SUGGESTION; PRE-PUBLISH NOTES | showWhen 6; risk guards commercial, timing, url, visual | None / None | Contract clean |
| Instagram Post | instagram-post | instagram_post | Compact | 23 (5/18) | 10/10 | Caption variants; hashtags; visual concept; alt text; verification notes | showWhen 2; risk guards commercial, disclosure, proof, visual | None / None | Contract clean |
| LinkedIn Post | linkedin-post | linkedin_post | Compact | 24 (5/19) | 8/9 | LinkedIn-native post variants and publishing guidance | showWhen 0; risk guards disclosure, proof, url | None / None | Contract clean |
| Newsletter | newsletter | newsletter | Standard | 30 (6/24) | 12/13 | Newsletter issue package with subject lines, intro/body, CTA, and notes | showWhen 1; risk guards contact, disclosure, proof, timing, url | None / None | Contract clean |
| Product Description | product-description | product | Standard | 32 (7/25) | 4/6 | Product description package adapted to product format | showWhen 4; risk guards commercial, proof | None / None | Contract clean |
| Reddit Post | reddit-post | reddit | Compact | 23 (5/18) | 8/8 | Title Options; Ready-to-Post Version; conditional Posting Notes | showWhen 3; risk guards disclosure, proof, timing, url | None / None | Contract clean |
| SEO Meta Tags | seo-meta-tags | seo | Compact | 24 (5/19) | 9/10 | SEO metadata package | showWhen 4; risk guards url, visual | None / None | Contract clean |
| Short-Form Video Script | short-form-video | youtube | Compact | 24 (6/18) | 12/14 | Video direction; Beat-by-beat script; Clean spoken script; Caption; Verification note | showWhen 3; risk guards commercial, proof, timing, visual | None / None | Contract clean |
| Threads Post | threads-post | threads_post | Compact | 24 (5/19) | 12/13 | Variant; Ready-to-post copy; Topic tag; Character check; Publishing notes; Verification notes | showWhen 3; risk guards disclosure, proof, url | None / None | Contract clean |
| TikTok Caption | tiktok-caption | tiktok | Compact | 24 (5/19) | 11/13 | TikTok-native caption package | showWhen 5; risk guards commercial, disclosure | None / None | Contract clean |
| X Thread | x-thread | x_thread | Compact | 24 (5/19) | 12/13 | X/Twitter thread package | showWhen 3; risk guards disclosure, proof, url | None / None | Contract clean |
| Amazon Listing | amazon-listing | ecommerce | Standard | 31 (5/26) | 6/6 | Listing Direction; Title Options; Recommended Title; Key Product Features; Product Description; Specifications and Purchase Information; Backend Search Terms; Variation Notes | showWhen 2; risk guards proof | None / None | Contract clean |
| App Store Listing | app-store-listing | ecommerce | Standard | 34 (7/27) | 10/11 | App store listing package | showWhen 5; risk guards commercial, proof, visual | None / None | Contract clean |
| Case Study | case-study | marketing | Complex | 47 (8/39) | 13/14 | Case-study package adapted to supplied proof and format | showWhen 4; risk guards commercial, disclosure, proof, timing, url, visual | None / None | Contract clean |
| Discord Announcement | discord-announcement | community | Compact | 23 (6/17) | 8/10 | Discord announcement package | showWhen 0; risk guards disclosure, proof, timing, url | None / None | Contract clean |
| Email Sequence | email-sequence | email | Complex | 43 (9/34) | 14/18 | Email sequence package | showWhen 4; risk guards commercial, contact, disclosure, proof, timing, url | None / None | Contract clean |
| Etsy Listing | etsy-listing | ecommerce | Standard | 36 (7/29) | 7/9 | Etsy listing package | showWhen 13; risk guards disclosure, proof, timing | None / None | Contract clean |
| GitHub README | github-readme | app_ux | Standard | 32 (6/26) | 6/8 | README package with installation and usage sections where relevant | showWhen 1; risk guards url, visual | None / None | Contract clean |
| In-App UX Copy | in-app-ux-copy | app_ux | Compact | 24 (6/18) | 10/10 | In-app UX copy package | showWhen 3; risk guards none | None / None | Contract clean |
| Indie Hackers Post | indie-hackers-post | community | Compact | 24 (6/18) | 7/11 | Indie Hackers-native founder/community post package | showWhen 1; risk guards disclosure, proof, url | None / None | Contract clean |
| Instagram Carousel | instagram-carousel | instagram_post | Standard | 34 (6/28) | 14/16 | Instagram carousel slide package | showWhen 2; risk guards commercial, disclosure, proof, url, visual | None / None | Contract clean |
| Kickstarter Campaign | kickstarter-campaign | product_launch | Complex | 43 (8/35) | 8/8 | Kickstarter campaign page package | showWhen 3; risk guards disclosure, proof, timing, visual | None / None | Contract clean |
| Landing Page Copy | landing-page-copy | marketing | Standard | 36 (7/29) | 10/10 | Landing-page copy package | showWhen 4; risk guards commercial, disclosure, proof, timing, url | None / None | Contract clean |
| LinkedIn Carousel | linkedin-carousel | linkedin_post | Standard | 36 (6/30) | 16/17 | LinkedIn carousel package | showWhen 1; risk guards commercial, disclosure, proof, timing, url | None / None | Contract clean |
| Paid Ad Copy | paid-ad-copy | marketing | Standard | 30 (6/24) | 9/9 | Campaign Snapshot; Testing Angles; Platform-Ready Ad Copy; Creative Alignment; Claim & Policy Review; Testing Notes; Implementation Notes | showWhen 4; risk guards commercial, disclosure, proof, url | None / None | Contract clean |
| Pinterest Pin | pinterest-pin | pinterest | Compact | 24 (5/19) | 9/9 | Pinterest pin package | showWhen 3; risk guards commercial, disclosure, url, visual | None / None | Contract clean |
| Podcast Script | podcast-script | youtube | Complex | 44 (8/36) | 20/22 | Podcast script package | showWhen 7; risk guards disclosure, proof, timing, url | None / None | Contract clean |
| Press Release | press-release | sales | Standard | 34 (7/27) | 11/13 | Press release package | showWhen 4; risk guards commercial, contact, proof, timing | None / None | Contract clean |
| Product Hunt Launch | product-hunt-launch | product_launch | Standard | 32 (7/25) | 8/9 | Product Hunt launch package | showWhen 2; risk guards commercial, proof, timing, url, visual | None / None | Contract clean |
| Push Notification | push-notification | marketing | Compact | 23 (5/18) | 9/10 | Push notification variants and delivery notes | showWhen 2; risk guards contact, disclosure, timing | None / None | Contract clean |
| Quora Answer | quora-answer | community | Compact | 24 (6/18) | 10/12 | Quora answer package | showWhen 2; risk guards proof, url | None / None | Contract clean |
| Review Response | review-response | sales | Compact | 21 (5/16) | 8/11 | Review response package | showWhen 2; risk guards contact | None / None | Contract clean |
| Sales Proposal | sales-proposal | sales | Complex | 42 (9/33) | 10/10 | Sales proposal package | showWhen 7; risk guards commercial, proof, timing | None / None | Contract clean |
| SMS Campaign | sms-campaign | marketing | Compact | 24 (6/18) | 8/10 | SMS campaign package | showWhen 2; risk guards commercial, timing, url | None / None | Contract clean |
| Substack Post | substack-post | community | Standard | 36 (6/30) | 13/14 | Substack post package | showWhen 2; risk guards commercial, disclosure, proof, url | None / None | Contract clean |
| Telegram Post | telegram-post | community | Compact | 22 (5/17) | 9/10 | Telegram Post; Button; Publishing Check | showWhen 1; risk guards disclosure, proof, timing, url | None / None | Contract clean |
| Webinar Package | webinar-package | marketing | Complex | 44 (8/36) | 13/15 | Webinar package | showWhen 5; risk guards commercial, contact, proof, timing, url, visual | None / None | Contract clean |
| Website Popup | website-popup | app_ux | Compact | 24 (5/19) | 8/9 | Recommended Setup; Popup Variants; Variant; Character Check; Implementation Notes; Verification Notes | showWhen 3; risk guards commercial, timing, url | None / None | Contract clean |
| WhatsApp Broadcast | whatsapp-broadcast | community | Compact | 24 (6/18) | 11/13 | WhatsApp broadcast package | showWhen 4; risk guards commercial, disclosure, timing, url | None / None | Contract clean |
| YouTube Script | youtube-script | youtube | Complex | 40 (7/33) | 20/22 | Recommended Direction; Title Options; Hook Options; Beat Map; Full Production Script; Production Notes; Verification Notes; YouTube Description | showWhen 3; risk guards commercial, disclosure, proof, timing, visual | None / None | Contract clean |
| YouTube Video Package | youtube-video-package | youtube | Complex | 40 (8/32) | 13/13 | YouTube video package | showWhen 3; risk guards disclosure, proof, timing, url, visual | None / None | Contract clean |

## Conditional sections and dependencies

The audit found 147 `showWhen` conditional form controls across the 45 templates. All referenced controlling keys exist.

Global runtime guards cover:

- blank URL/link fields;
- commercial fields such as offer, price, discount, promo code, and availability;
- proof/source/testimonial/statistics fields;
- timing/location/date fields;
- disclosure/affiliation/sponsorship fields;
- contact fields;
- visual/asset/alt-text fields.

No template was marked defective merely for having unique sections, different field counts, visual sections only in visual formats, SEO sections only in SEO-relevant formats, or platform-native output structures.

## Prompts with no remaining prompt-level contract issue

All 45 templates have no remaining proven prompt-level contract issue:

`amazon-listing`, `app-store-listing`, `blog-article`, `case-study`, `cold-email-outreach`, `discord-announcement`, `email-sequence`, `etsy-listing`, `facebook-post`, `faq-page`, `github-readme`, `google-business-profile-post`, `in-app-ux-copy`, `indie-hackers-post`, `instagram-carousel`, `instagram-post`, `kickstarter-campaign`, `landing-page-copy`, `linkedin-carousel`, `linkedin-post`, `newsletter`, `paid-ad-copy`, `pinterest-pin`, `podcast-script`, `press-release`, `product-description`, `product-hunt-launch`, `push-notification`, `quora-answer`, `reddit-post`, `review-response`, `sales-proposal`, `seo-meta-tags`, `short-form-video`, `sms-campaign`, `substack-post`, `telegram-post`, `threads-post`, `tiktok-caption`, `webinar-package`, `website-popup`, `whatsapp-broadcast`, `x-thread`, `youtube-script`, `youtube-video-package`.

## Prompt with one narrow owner-review item

None.

## Verification

Command run:

```powershell
node --test --import tsx tests/*-template.test.ts tests/template-system-acceptance.test.ts tests/template-optional-fields.test.ts
```

Result:

```text
tests 242
pass 242
fail 0
```

Additional coverage included in those tests:

- all 45 templates have prompt files, form schemas, and guide routes;
- runtime catalog prompts match source prompt files;
- every prompt variable has exactly one matching form field and catalog variable;
- all form fields have metadata, validation, groups, and valid conditional controls;
- full-field rendered prompts are safe for every template;
- required-only rendered prompts are safe for every template;
- server render guard runs before quota, reservation, OpenAI, and usage writes;
- Copy, Save, and Export paths are guarded by output validation;
- Reddit Posting Notes sentinel cleanup is shared by Result, Copy, and Export paths.
