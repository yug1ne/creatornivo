# Quota source mismatch — diagnosis & fix (2026-07-16)

## Observed

| Signal | Value |
|--------|------:|
| Visible UI / smoke banner | **85/100** |
| API | **429** `quota_exceeded`, message “all 100 Pro generations”, `remaining: 0` |
| UserUsage after block | still **85/100** (no increment) |
| Body / export | empty, actions off |

## Exact sources (before fix)

| Consumer | Source | What counted |
|----------|--------|--------------|
| Dashboard / generate banner / `/api/ai/usage` | `getUserUsageSnapshot` → `UserUsage.count` | Only rows incremented after **successful** `complete` + `incrementUsage` |
| Pre-generate gate in `POST /api/ai/generate` | same `getUserUsageSnapshot` | same as UI |
| Reservation gate `reserveGeneration` | `GenerationReservation.countUsed` | **`status = completed` OR `startedAt IS NOT NULL`** (included **failed** after provider start) |
| 429 body on reservation quota | `quotaExceededResponse({ ...snapshot, remaining: 0 })` | **Forced remaining to 0**, even when UserUsage still had headroom |

## Why API said 100 while UI said 85

1. Normal smoke + earlier validation/refusal/timeout runs called `markStarted` then `fail`.
2. Failed rows kept `startedAt` set → `countUsed` treated them as period usage forever.
3. UI never incremented `UserUsage` on those failures → banner stayed at 85.
4. Pre-check passed (`remaining > 0`), then `reserveGeneration` threw `quota` because reservation “used” ≈ 100.
5. Error handler overwrote the response with `remaining: 0` and “all 100” copy → looked like real UserUsage exhaustion.

**This was a bug**, not intentional product UX.

### Intended product rule (implemented)

- Permanent monthly/daily quota = **successful usable generations only** (`UserUsage` / completed reservations).
- Reservation layer = concurrency + overshoot prevention: **`completed + active(non-expired)`**.
- Failed / expired-without-complete must **not** permanently block.

## Code changes

| File | Change |
|------|--------|
| `src/lib/generation/usage-service.ts` | `countUsed` = `COMPLETED` only; gate uses `completed + active >= limit` |
| `src/app/api/ai/generate/route.ts` | Do not force `remaining: 0` when UserUsage has headroom |
| `tests/generation-limits.test.ts` | Updated + new consistency cases |
| `scripts/template-smoke/detect.mjs` | `QUOTA_SOURCE_MISMATCH` when 429 while visible remaining > 0 |

## Read-only SQL diagnostics (run manually)

Replace `:userId` with the test account id. **Do not DELETE/UPDATE without approval.**

```sql
-- 1) UserUsage monthly counter (UI source for Pro)
SELECT id, "userId", date, period, count, "updatedAt"
FROM "UserUsage"
WHERE "userId" = :userId
  AND period = 'monthly'
ORDER BY date DESC
LIMIT 5;

-- 2) Reservation breakdown for current UTC month
SELECT status,
       COUNT(*) AS n,
       COUNT(*) FILTER (WHERE "startedAt" IS NOT NULL) AS with_started
FROM "GenerationReservation"
WHERE "userId" = :userId
  AND "createdAt" >= date_trunc('month', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
  AND "createdAt" <  (date_trunc('month', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 month') AT TIME ZONE 'UTC'
GROUP BY status
ORDER BY status;

-- 3) Old gate formula vs new formula
SELECT
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_only,
  COUNT(*) FILTER (
    WHERE status = 'completed' OR "startedAt" IS NOT NULL
  ) AS old_count_used_including_started,
  COUNT(*) FILTER (
    WHERE status IN ('reserved', 'started')
      AND "expiresAt" > NOW()
  ) AS active_non_expired,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed
FROM "GenerationReservation"
WHERE "userId" = :userId
  AND "createdAt" >= date_trunc('month', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
  AND "createdAt" <  (date_trunc('month', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 month') AT TIME ZONE 'UTC';

-- 4) Sample failed rows that still have startedAt (root of 85 vs 100)
SELECT id, "requestId", status, "startedAt", "completedAt", "expiresAt", "createdAt"
FROM "GenerationReservation"
WHERE "userId" = :userId
  AND status = 'failed'
  AND "startedAt" IS NOT NULL
  AND "createdAt" >= date_trunc('month', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
ORDER BY "createdAt" DESC
LIMIT 30;
```

Expected for this incident:

- `UserUsage.count` ≈ **85**
- `completed_only` ≈ **85**
- `old_count_used_including_started` ≈ **100**
- `failed` with `startedAt` ≈ **15** (or enough to fill the gap)

After deploy of the fix, **no data deletion required** — failed rows stop counting. Optional cleanup of stale `started` past `expiresAt` can be a later ops task.

## After deploy — retest (user-run)

1. Offline: `npx tsx --test tests/generation-limits.test.ts`
2. Confirm UI still 85/100 (or current UserUsage).
3. One real generate (or dry batch-smoke of 1 template) should **succeed** if completed &lt; 100.
4. Then resume `quota-exhaustion` only if you still want 100/100 + block check.

## Final QA issue inventory

| Item | Status |
|------|--------|
| Template smoke normal | **45/45 PASS** |
| Runner alias `short-form-video-script` → `short-form-video` | Done (smoke-runner only) |
| Runner alias `ux-copy` → `in-app-ux-copy` | Done (smoke-runner only) |
| GBP conditional fields | Done (fixtures) |
| Result scrape / status classification | Done |
| Normal vs safety goals | Done |
| Model refusal detection | Done |
| Quota exhaustion mode | Hardened (15 burn + block check) |
| **Quota source mismatch** | **Diagnosed + fixed in app reservation gate** (this doc) |
| E2E_* env | Local/CI only — **not** Production Vercel |
| `ENABLE_GENERATION_AUTO_REPAIR` | Keep **off** in Production unless separately approved |
| Commit / push / deploy | **Not done** until explicit approval |
| Data delete/reset | **Not done** — not required after code fix |

## Scope notes

- No template/prompt/provider/model/billing/auth changes beyond generate quota path.
- No real generations from the agent shell for this fix.
- No production row deletes.
