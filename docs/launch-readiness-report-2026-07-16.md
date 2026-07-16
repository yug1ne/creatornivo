# Creatornivo launch-readiness report — 2026-07-16

**Status:** Template smoke + quota-consistency gate closed for Early Access QA.  
**Not done in this report:** push, deploy, further real generations.

---

## Executive summary

| Area | Result |
|------|--------|
| Normal template smoke | **45 / 45 PASS** |
| Quota source mismatch | **Fixed and confirmed live** (85/100 → **86/100** after successful generate) |
| Current test-account quota | **86 / 100** (Pro monthly, UserUsage) |
| Local commits (not pushed) | 2 commits on `main` ahead of `origin/main` |
| Production deploy of fix | Operator action (not performed by this session) |

Early Access trust baseline for **generation templates + quota honesty** is in good shape. Live payment/legal/auth-incident blockers remain outside this report (see roadmap).

---

## Template smoke (normal goal)

| Metric | Value |
|--------|--------|
| Goal | `normal` (everyday usable output; no exact ban-list injection) |
| Result | **45 / 45 PASS** |
| Runner | Local `scripts/template-smoke` (aliases, fixtures, scrape/classification) |
| Real generation burn for exhaustion | Deferred (optional; see below) |

Runner-only helpers used during the campaign (not product feature surface):

- Slug aliases: `short-form-video-script` → `short-form-video`, `ux-copy` → `in-app-ux-copy`
- Conditional fixtures (e.g. Google Business Profile Offer flow)
- Result body scrape / status classification
- Normal vs safety smoke goals
- Model refusal detection
- Quota statuses including `QUOTA_SOURCE_MISMATCH` / `QUOTA_BLOCKED`

---

## Quota consistency (critical QA finding + fix)

### Incident

During `quota-exhaustion`, API returned **429 `quota_exceeded`** (“all 100”) while the **visible banner stayed 85/100**.

### Root cause

| Layer | Source | Bug |
|-------|--------|-----|
| UI / pre-check | `UserUsage.count` | Correct — success only |
| Reservation gate | `countUsed` | Counted **failed** rows with `startedAt` forever |
| 429 payload | forced `remaining: 0` | Masked the mismatch |

### Fix (committed)

`fix(quota): align reservation gate with completed usage`

- Permanent period quota = **completed** reservations only (aligns with UserUsage)
- In-flight: **completed + active non-expired** for concurrency safety
- Honest 429: do not force `remaining: 0` when UserUsage still has headroom

### Live confirmation (user-reported)

| Step | Result |
|------|--------|
| Visible quota before | **85 / 100** |
| After successful generation | **86 / 100** |
| Interpretation | Gate allows generation again; failed historical reservations no longer block; success increments UserUsage |

**No database row deletes** were required or performed.

---

## Commits included (local only)

| SHA (short) | Message |
|-------------|---------|
| `a3fc3f9` | **fix(quota): align reservation gate with completed usage** |
| `a217e09` | **chore(smoke): add template smoke runner and QA docs** |

Branch: `main` **ahead 2** of `origin/main` (as of commit creation).  
**Push / deploy:** not performed until explicit approval.

### Commit 1 contents (quota)

- `src/lib/generation/usage-service.ts`
- `src/app/api/ai/generate/route.ts`
- `tests/generation-limits.test.ts`
- `tests/generation-auto-repair-integration.test.ts`
- `AGENTS.md` (quota product wording only)

### Commit 2 contents (smoke tooling + docs)

- `scripts/template-smoke/**`
- `docs/final-template-smoke-qa-2026-07-16.md`
- `docs/quota-source-mismatch-diagnosis-2026-07-16.md`
- `.gitignore` (`smoke-reports/`, smoke auth cache)
- `package.json` / `package-lock.json` (smoke scripts + Playwright **dev** dependency)

---

## Scope guarantees

**Not changed** in these commits:

| Area | Confirmed clean |
|------|-----------------|
| Template forms / prompts | Yes |
| Prisma schema / migrations | Yes |
| Seed data | Yes |
| Auth | Yes |
| Billing / plans / Paddle / Stripe | Yes |
| AI provider / model selection | Yes |
| Production env / secrets files | Yes |

Related diagnosis doc: `docs/quota-source-mismatch-diagnosis-2026-07-16.md`.

---

## Environment / Production policy

| Item | Policy |
|------|--------|
| `E2E_BASE_URL`, `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD` | **Local / CI only** — never Production Vercel |
| `ENABLE_GENERATION_AUTO_REPAIR` | Remains **off** in Production unless separately approved (`true` only for limited Preview/staging experiments) |
| Smoke reports / `.auth` | Gitignored; not committed |

---

## Offline verification already run

| Suite | Result |
|-------|--------|
| `npx tsx --test tests/generation-limits.test.ts` | 51 pass |
| `npx tsx --test tests/generation-auto-repair-integration.test.ts` | 12 pass |
| `node scripts/template-smoke/detect.test.mjs` | 21 pass |
| `node scripts/template-smoke/fixtures.test.mjs` | 14 pass |
| ESLint on quota route + usage-service | pass |
| Full-repo `tsc --noEmit` | Known **pre-existing** failures in unrelated account/template tests (not introduced by quota commits) |

---

## Remaining recommended optional checks

1. **One safety smoke** (single template, e.g. `landing-page-copy`):  
   `node scripts/template-smoke/run.mjs --mode batch-smoke --smoke-goal safety --templates landing-page-copy --confirm-real-generations`  
   Accept `SAFETY_PASS_MODEL_COMPLIANT` or `SAFETY_PASS_VALIDATION_BLOCKED`.

2. **Quota exhaustion later** (when intentional): from current **86/100**, run focused burn (14 gens) to **100/100**, then one extra attempt expecting consistent **`QUOTA_BLOCKED`** (visible + API both exhausted). Prefer dedicated test account; costs OpenAI.

3. **Full `tsc` cleanup later** — fix pre-existing errors in `account-data-export`, `account-deletion`, and select template tests so CI typecheck is green; not a launch blocker for the quota fix itself.

### Outside this smoke/quota track (roadmap blockers)

- Auth incident monitoring / legal review  
- Paddle Live + controlled purchase/refund  
- Global OpenAI budget breaker (if still pending)  
- Branded 404/error polish (partial)

---

## Operator checklist before go-live messaging

1. [ ] Push `a3fc3f9` + `a217e09` when approved  
2. [ ] Deploy Production (includes quota gate fix)  
3. [ ] Spot-check: banner and generate agree; no 429 while remaining &gt; 0  
4. [ ] Optional safety smoke + later exhaustion  
5. [ ] Keep auto-repair off; keep E2E secrets out of Production Vercel  

---

## Bottom line

**Generation catalog smoke is green (45/45).**  
**Quota UI/API honesty is fixed and live-confirmed at 86/100.**  
**Ready for push/deploy when you approve** — not pushed or deployed by this session.

*Report prepared 2026-07-16. No additional real generations run for this document.*
