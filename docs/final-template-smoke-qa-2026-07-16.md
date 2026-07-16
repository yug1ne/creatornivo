# Final template smoke QA summary — 2026-07-16

**Status:** Normal template smoke **complete** (user-reported).  
**Scope of this document:** Close-out QA notes, quota-exhaustion runbook, runner-only fixes inventory, Vercel/env checklist.  
**Not done in this session:** real generations, commit, push, deploy.

---

## 1. Normal smoke result

| Metric | Value |
|--------|------:|
| Templates | **45 / 45 PASS** |
| Smoke goal | `normal` |
| Current test-account quota | **85 / 100** used (Pro monthly) |
| Remaining before exhaustion burn | **15** |

All catalog templates completed normal-goal smoke successfully after runner-side fixes (aliases, fixtures, scrape/classification). App runtime, prompts, Prisma, seed, billing, auth, and provider/model were **not** changed for smoke completion.

**Commit / push / deploy:** not performed; **not approved** unless the user explicitly authorizes later.

---

## 2. Runner-only fixes inventory

These live under `scripts/template-smoke/` (and docs/README). They do **not** alter app generation behavior.

| Fix | What it does |
|-----|----------------|
| **Slug alias** `short-form-video-script` → `short-form-video` | Title-derived batch slug → catalog schema + `?template=` |
| **Slug alias** `ux-copy` → `in-app-ux-copy` | Shortened batch slug → catalog schema + `?template=` |
| **Conditional fields** (`google-business-profile-post`) | Fixture/plan reveals Offer/Event required fields via `showWhen` |
| **Result body scrape / classification** | Chrome strip; `RESULT_DETECTION_FAIL` vs `PASS`; header-only not treated as success |
| **Normal vs safety smoke goals** | Orthogonal goals; normal does not hard-fail style phrases; safety accepts validator block |
| **Model refusal detection** | `MODEL_REFUSAL_FAIL` for non-content refusals (not scrape false negative) |
| **Report alias fields** | `requestedTemplate`, `canonicalTemplate`, `aliasApplied` (+ legacy `template` / `canonicalSlug` / `aliased`) |
| **Quota exhaustion statuses** | `QUOTA_BLOCKED` / `QUOTA_EXHAUSTED` / `QUOTA_LEAK` (not `UNKNOWN_FAIL`) |
| **Quota exhaustion flow** | Burn default **15** once, then **one** block check; no 120× cycle |

Offline verification (no browser / no OpenAI):

```bash
node scripts/template-smoke/detect.test.mjs
node scripts/template-smoke/fixtures.test.mjs
```

---

## 3. Safest 15 generations (85 → 100)

Use this focused list only (already the runner default for `--mode quota-exhaustion`):

1. `landing-page-copy`  
2. `app-store-listing`  
3. `blog-article`  
4. `product-description`  
5. `paid-ad-copy`  
6. `google-business-profile-post`  
7. `short-form-video` *(canonical; not `short-form-video-script`)*  
8. `in-app-ux-copy` *(canonical; not `ux-copy`)*  
9. `webinar-package`  
10. `sales-proposal`  
11. `amazon-listing`  
12. `kickstarter-campaign`  
13. `press-release`  
14. `youtube-video-package`  
15. `seo-meta-tags`  

**Why these:** already green in normal smoke; cover commercial / long-form / marketplace / video / UX surfaces; use **canonical** slugs only so schema load and navigation stay reliable.

**Do not** re-run all 45 for exhaustion.

---

## 4. Quota-exhaustion command flow (user runs locally)

Requires E2E credentials on the **test account** currently at 85/100.  
**Do not** point this at a personal production account you care about for monthly budget.

### 4.1 Recommended command

```powershell
$env:E2E_BASE_URL="https://www.creatornivo.com"   # or Preview URL
$env:E2E_TEST_EMAIL="dedicated-test@..."
$env:E2E_TEST_PASSWORD="***"

node scripts/template-smoke/run.mjs `
  --mode quota-exhaustion `
  --smoke-goal normal `
  --confirm-real-generations
```

Default templates = the 15 above. Optional explicit list:

```powershell
node scripts/template-smoke/run.mjs `
  --mode quota-exhaustion `
  --smoke-goal normal `
  --templates landing-page-copy,app-store-listing,blog-article,product-description,paid-ad-copy,google-business-profile-post,short-form-video,in-app-ux-copy,webinar-package,sales-proposal,amazon-listing,kickstarter-campaign,press-release,youtube-video-package,seo-meta-tags `
  --confirm-real-generations
```

### 4.2 Expected behavior

| Phase | Expectation |
|-------|-------------|
| Burn (15 gens) | Mostly `PASS`; quota steps 85→100 (or stops early if already at limit) |
| After 100/100 | One extra attempt on `landing-page-copy` (`…#quota-block-check`) |
| Extra attempt | Generate **disabled** and/or API **429** / UI quota message |
| UserUsage | Must **not** go above **100/100** |
| Content | No saved/exportable **successful** body for the blocked attempt |
| Report status | **`QUOTA_BLOCKED`** or **`QUOTA_EXHAUSTED`** (success for this check) |
| Failures to watch | `QUOTA_LEAK` (usage past limit or exportable content), `UNKNOWN_FAIL`, unexpected `PASS` on block check |

### 4.3 Runner guarantees (after 2026-07-16 hardening)

- Burns the list **once** (not a 120-iteration cycle).  
- Stops burn early when remaining hits 0.  
- Runs **exactly one** post-exhaust block check, then stops.  
- Classifies quota walls as `QUOTA_BLOCKED` / `QUOTA_EXHAUSTED`, not generic `UNKNOWN_FAIL`.  
- Still requires `--confirm-real-generations`.

### 4.4 Cost / risk

- Up to **15** real OpenAI generations + optional failed/blocked attempt.  
- Prefer **Preview/Staging** or a dedicated test user on Production only if that is intentional QA.  
- Stop immediately if two consecutive `UNKNOWN_FAIL` or if `QUOTA_LEAK` appears.

---

## 5. Vercel / environment checklist

### 5.1 Runtime app vars (Vercel Production / Preview as needed)

From `.env.example` and app usage — **not** exhaustive for every optional OAuth key:

| Variable | Role | Notes |
|----------|------|--------|
| `DATABASE_URL` | Prisma / Postgres | Production secret |
| `AUTH_SECRET` | Auth.js | Required |
| `AUTH_URL` / `NEXTAUTH_URL` | Canonical URLs / emails | Match host |
| `NEXT_PUBLIC_APP_URL` | Public site URL | `https://www.creatornivo.com` |
| `OPENAI_API_KEY` | Generations | Cost-sensitive |
| `RESEND_API_KEY` / `EMAIL_FROM` | Transactional email | |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Auth rate limits | Required in prod |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Monitoring | Optional locally |
| `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` | Source maps (build) | CI/build only |
| Paddle: `NEXT_PUBLIC_PADDLE_*`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, price IDs | Billing | Sandbox vs Live never mixed |
| Stripe (legacy): `STRIPE_*`, `NEXT_PUBLIC_STRIPE_*` | Optional fallback | |
| `ADMIN_EMAILS` | Admin gate | Optional |
| `ENABLE_GENERATION_AUTO_REPAIR` | Auto-repair path | See §5.3 |

**Backup / CI-only (not Vercel app runtime):**  
`BACKUP_DATABASE_URL`, `BACKUP_AGE_PUBLIC_KEY`, R2 keys, age **private** key (never in Vercel/GitHub if private).

### 5.2 Local / smoke-only vars (do **not** put on Production Vercel)

| Variable | Role |
|----------|------|
| `E2E_BASE_URL` | Playwright target (prod/preview/local) |
| `E2E_TEST_EMAIL` | Dedicated smoke account |
| `E2E_TEST_PASSWORD` | **Never** in Production Vercel env |

Use local shell, `.env.local` (gitignored), or a **dedicated CI/test** project if automated later.  
Do **not** store the E2E password in Production project env “for convenience.”

### 5.3 `ENABLE_GENERATION_AUTO_REPAIR`

| Environment | Recommendation |
|-------------|----------------|
| **Local / Preview / Staging** | Optional `true` for limited repair smoke only |
| **Production** | **Keep unset / not `"true"`** until intentional rollout |

Default in code: disabled unless exact value `"true"`.  
When enabled: extra OpenAI repair call (cost); does not double UserUsage for a single generation.  
Post-deploy recommendation remains: Production off → enable on Preview → single-template safety/repair smoke → then decide Production.

---

## 6. Deploy readiness (parallel blockers — not smoke)

From project roadmap / AGENTS.md (not cleared by 45/45 smoke alone):

| Item | Status note |
|------|-------------|
| Auth incident monitoring | Ongoing |
| Legal owner review | Pending |
| Paddle Live onboarding | Blocker for Live payments |
| Controlled Live purchase + refund | Blocker |
| Global OpenAI budget breaker | Partial / pending |
| Branded 404/error | Partial UX |

Template smoke green **does not** replace Live payment or legal blockers.

---

## 7. Quota source mismatch (found during exhaustion)

See **`docs/quota-source-mismatch-diagnosis-2026-07-16.md`**.

| | |
|--|--|
| Symptom | UI **85/100**, API **429 remaining:0 “all 100”** |
| Cause | Reservation `countUsed` counted failed `startedAt` rows; 429 forced `remaining:0` |
| Fix | Completed-only permanent quota + `completed + active` gate; honest 429; smoke `QUOTA_SOURCE_MISMATCH` |
| Data | No delete required after deploy |

## 8. Explicit non-actions (this close-out)

- No real generations from automation agent shell for diagnosis write-up  
- Quota consistency fix is in app reservation/generate path only (not prompts/billing/auth)  
- **No commit / push / deploy** until user explicitly approves  
- **No production data delete/reset** unless separately approved

---

## 9. User next steps (checklist)

1. [ ] Offline: `npx tsx --test tests/generation-limits.test.ts`  
2. [ ] Offline: `node scripts/template-smoke/detect.test.mjs`  
3. [ ] Optional SQL diagnostics in quota-source-mismatch doc (read-only)  
4. [ ] Deploy quota fix (after commit approval)  
5. [ ] Confirm one generation works at 85/100  
6. [ ] Then optional `quota-exhaustion` to 100/100 + block check  
7. [ ] Review Vercel env; E2E_* local/CI only; auto-repair off in Production  
8. [ ] Explicit approve before commit/push/deploy

---

*Generated as final QA close-out notes after 45/45 normal template smoke. Quota exhaustion and deploy are operator-run steps.*
