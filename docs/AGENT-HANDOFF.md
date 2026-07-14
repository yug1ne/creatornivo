# Creatornivo Agent Handoff

## Current project status

Creatornivo is a content-generation SaaS with 45 templates.

Recent work focused on making template generation safer and more reliable:
- optional fields handling;
- placeholder/link cleanup;
- output validation;
- QA framework;
- targeted Social Media pass;
- targeted Email pass;
- targeted Marketing pass;
- runtime validation for user-prohibited phrases;
- auto-repair pipeline behind feature flag.

## Important

Do not run broad rewrites.
Do not manually check all 45 templates one by one.
Do not spend many real OpenAI generations.
Use static QA and limited smoke tests only.

## Completed passes

### Social Media

Targeted pass completed for:
- threads-post
- tiktok-caption
- x-thread
- instagram-carousel
- linkedin-carousel
- pinterest-pin

Fixed issues:
- bait-like reply prompts;
- generic TikTok wording;
- X Thread disclosure placement;
- Instagram Carousel screenshot wording;
- LinkedIn Carousel Accessibility note: None;
- Pinterest Disclosure: None / CTA: None / repeated URL.

### Email

Targeted pass completed for:
- cold-email-outreach
- newsletter
- email-sequence

Fixed issues:
- cold email variantCount respected;
- opt-out line strengthened;
- newsletter no Pre-Publication Notes / None;
- email sequence includePlainTextVersions respected;
- missing URL wording improved;
- hype/overpromise guardrails added.

### Marketing

Targeted pass completed for:
- case-study
- landing-page-copy
- paid-ad-copy
- push-notification
- sms-campaign
- webinar-package

Fixed issues:
- fake proof/testimonials/statistics;
- fake urgency/scarcity;
- required disclosures;
- prohibited claims;
- opt-out preservation;
- webinar credentials/URLs/dates not invented.

## QA framework

Added static QA framework:
- generation-qa.ts
- generation-qa-fixtures.ts
- generation-qa-rules.ts
- template-generation-qa tests
- template-output-assertions tests
- static report scripts
- disabled-by-default smoke runner

qa-results/ is ignored.

Static QA result:
- no High risk templates found;
- mostly Low risk;
- runtime validator supports exact user-prohibited phrase as hard fail;
- marketing clichés are warnings unless explicitly prohibited.

## Runtime validator

Validator blocks:
- unresolved placeholders;
- undefined/null/[object Object];
- None/N/A/Not provided-only sections;
- fake placeholder URLs;
- ignored count controls;
- ignored includePlainTextVersions;
- Accessibility note: None when accessibility enabled;
- missing required disclosure where expected;
- exact user-prohibited phrases.

Manual production smoke showed:
Product Description generated “streamline” despite user restriction.
Validator correctly blocked:
"Output validation failed: generated content contains a phrase explicitly prohibited by the user: streamline."

## Auto-repair pipeline

Auto-repair was added but disabled by default.

Feature flag:
ENABLE_GENERATION_AUTO_REPAIR=true

Default:
disabled unless exact value is "true".

When disabled:
normal streaming path remains.

When enabled:
generation uses buffered path:
raw output -> sanitizer -> validator -> repair once if repairable -> sanitizer -> validator -> final content or Output validation failed.

Repairable failures:
- exact user-prohibited phrase;
- placeholder URL/token;
- placeholder disclosure/token;
- empty None/N/A/Not provided/Not specified/No notes-only section;
- minor notes/disclosure cleanup.

Not repairable:
- invented prices/dates/deadlines/metrics/proof/testimonials;
- unsupported commercial/timing/proof facts;
- missing required user data;
- unresolved/unrepairable validation issues;
- severe malformed output.

Quota behavior:
- repair does not create a new reservation;
- repair does not increment usage a second time;
- usage increments once after final valid content is saved/completed;
- repair call may increase OpenAI API cost, therefore feature flag is off by default.

## Changed files in last auto-repair pass

- src/app/api/ai/generate/route.ts
- src/lib/ai/provider.ts
- src/lib/templates/output-repair.ts
- tests/generation-output-repair.test.ts
- tests/template-optional-fields.test.ts

Tests reported:
- generation-output-repair.test.ts: 10/10 PASS
- relevant tests: 109/109 PASS
- ESLint changed files: PASS
- git diff --check: PASS
- TypeScript check still fails only on pre-existing unrelated tests:
  - tests/account-data-export.test.ts
  - tests/account-deletion.test.ts

## Do not change

Unless explicitly requested:
- billing/Paddle;
- auth;
- pricing;
- Prisma schema/migrations;
- .env;
- template IDs/slugs/forms/Help;
- production config.

## Next recommended step

Do not manually test all templates.

Recommended next step:
1. Review auto-repair implementation.
2. Run targeted repair tests.
3. Deploy with auto-repair still disabled.
4. On test/staging only, enable:
   ENABLE_GENERATION_AUTO_REPAIR=true
5. Run one limited smoke:
   product-description only.
6. Use restriction:
   Avoid the words: transform, effortlessly, seamless, streamline, guaranteed, boost engagement.
7. Expected result:
   Either final repaired content without these words, or Output validation failed.
   Raw invalid stream should not be shown as usable result.

## Product Description note

Product Description still needs prompt-level polishing later.
Validator catches the issue, but the prompt may still produce:
- streamline;
- transform;
- effortlessly;
- enhance;
- save time;
- engaging posts;
- impact.

Do not fix this manually until auto-repair behavior is verified.