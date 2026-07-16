# Security / leak / config audit — 2026-07-16

**Mode:** Read-only (no secret rotation, no DB changes, no push/deploy, no real generations).  
**Scope:** Repo/GitHub, Vercel env exposure patterns, Supabase/Postgres posture (code + SQL pack), app/API abuse surface.  
**Production context:** Smoke QA complete; quota fix live-confirmed (86→87/100); commits on main include quota gate + smoke runner.

**Secrets policy:** No raw secret values in this report. Placeholders only.

---

## 1. Executive summary

| Area | Verdict |
|------|---------|
| Tracked secrets in current tree | **No live secrets found** in tracked source; `.env*` ignored; `.env.example` placeholders only |
| GitHub Actions | Backup workflow uses GitHub Secrets; no env dump; failure issue text warns against pasting secrets |
| App data path | **Prisma + `DATABASE_URL` only** — no `supabase-js`, no `SUPABASE_SERVICE_ROLE_KEY` in codebase |
| Client / `NEXT_PUBLIC_*` | Only expected public vars; server secrets not under `NEXT_PUBLIC_` |
| Auth on generate / library | Session required; library queries scoped by `userId`; webhooks verify signatures |
| Top product/IP concern | **`/api/templates` returns full prompt text to unauthenticated callers** |
| Top infrastructure concern | **Supabase Data API / RLS posture must be verified in dashboard** (app does not use Data API; if API is open with anon grants, that is critical) |
| Supabase log spam `pg_pgrst_no_exposed_schemas` | **Likely known PostgREST noise when no schemas are exposed** — does not affect Prisma app if Data API unused |
| npm audit (prod) | **0 critical / 0 high**; 4 moderate via `next` → `postcss` |

**Overall:** No evidence of committed production secrets in the current tree. Core billing/auth/generate paths look intentionally hardened. Highest residual risks are (1) **prompt IP exposure via public templates API**, (2) **Supabase platform config not verifiable from repo alone**, (3) **missing security headers / generate cost controls beyond plan quota**.

---

## 2. Critical findings

### C1 — Supabase Data API + anon grants (conditional critical)

| Field | Detail |
|-------|--------|
| **Risk** | If Supabase **Data API (PostgREST)** is enabled and `public` tables are granted to `anon` **without RLS**, anyone with the project URL + anon key can read/write DB outside the Next.js app. |
| **Evidence (code)** | App uses Prisma only (`src/lib/db/index.ts`). **Zero** matches for `SUPABASE_*`, `service_role`, or `createClient` from supabase-js. Connection is server-side `DATABASE_URL`. |
| **Evidence (logs)** | Postgres log: `schema "pg_pgrst_no_exposed_schemas" does not exist` strongly suggests PostgREST is running with **no exposed schemas** (or a disabled/empty API surface) — often **benign noise**. |
| **Cannot confirm from repo** | Live Supabase dashboard: exposed schemas, RLS flags, storage policies, JWT settings. |
| **Recommended fix** | **Safe now (dashboard, no app code):** Confirm Data API disabled or exposed schemas empty; confirm no table grants to `anon`/`authenticated`; optionally enable RLS on all app tables as defense-in-depth. |
| **Apply now?** | **Yes — verify in Supabase UI + run SQL pack below.** Do not “fix” by enabling public schemas. |

### C2 — None confirmed from static repo scan

No tracked file currently contains a production `OPENAI_API_KEY`, `DATABASE_URL` password, private key, or webhook secret. Rotation is **not** required from this scan alone.

---

## 3. High findings

### H1 — Full template prompts returned without authentication

| Field | Detail |
|-------|--------|
| **Risk** | Business IP: finished generation prompts (competitive advantage) downloadable without login. Locked Pro templates still include `prompt` in the payload (`isLocked` only flags UI). |
| **Evidence** | `src/lib/templates/queries.ts` maps `prompt: template.prompt` for every active template. `src/app/api/templates/route.ts` calls `getTemplatesForUser(session)` with optional session (null allowed). Middleware does **not** require auth for `/api/templates` (only page routes + explicit public API prefixes). |
| **Recommended fix** | Omit `prompt` from list API for anonymous users; for authenticated Free users omit Pro prompts or return redacted stub; only return full prompt server-side at generate time (already gated by `assertTemplateAccess`). |
| **Apply now?** | **Yes if product wants prompt protection** — product decision; not a “secret leak” but **High IP exposure**. Safe code change when approved. |

### H2 — Supabase RLS may be unenforced for Prisma role (defense-in-depth)

| Field | Detail |
|-------|--------|
| **Risk** | Prisma typically connects as a privileged DB role that **bypasses RLS**. If credentials leak, RLS does not help. If a lesser role or Data API is misconfigured, missing RLS is catastrophic. |
| **Evidence** | No RLS migrations in app repo; schema is Prisma-managed; no Supabase policy files. |
| **Recommended fix** | Run SQL status queries; enable RLS + deny-by-default for `anon`/`authenticated`; keep app on restricted Prisma role if possible (later). |
| **Apply now?** | **Verify now; enable RLS carefully** (don’t break Prisma if policies are wrong for the app role). Prefer: revoke Data API access first. |

---

## 4. Medium findings

### M1 — No global HTTP security headers

| Field | Detail |
|-------|--------|
| **Risk** | Missing CSP / `X-Frame-Options` / `Referrer-Policy` / `Permissions-Policy` increases XSS clickjack residual risk. |
| **Evidence** | No matches for CSP / frame options in Next config or middleware. Theme script uses `dangerouslySetInnerHTML` only for a fixed theme init snippet (`src/app/layout.tsx`) — low risk if static. |
| **Recommended fix** | Add security headers in `next.config.ts` or middleware; start with frame deny, nosniff, referrer strict-origin. CSP later with careful Next.js allowances. |
| **Apply now?** | **Yes (headers)** when approved; CSP needs careful testing. |

### M2 — Generate has plan RPM / concurrency, not global IP abuse limits

| Field | Detail |
|-------|--------|
| **Risk** | Authenticated attacker with Pro burns OpenAI budget at policy rate (e.g. 5/min, 100/month). Free is limited to 5/day but still costs money per completion. No separate global OpenAI budget breaker (roadmap still partial). |
| **Evidence** | `reserveGeneration` enforces period quota + concurrent + RPM; auth required; model from `getGenerationPolicy(plan)` not client. No Upstash limit on `/api/ai/generate` itself. |
| **Recommended fix** | Global OpenAI spend breaker (roadmap); optional stricter generate rate limits per IP/user. |
| **Apply now?** | Later unless cost incidents. |

### M3 — Auth rate limit fail-open for most actions

| Field | Detail |
|-------|--------|
| **Risk** | If Upstash missing/down, login/forgot/export/delete limits are skipped (register fails closed in production). |
| **Evidence** | `src/lib/auth/rate-limit.ts` — only `register` fails closed when unavailable. Health reports `authRateLimit: not_configured` without failing status. |
| **Recommended fix** | Ensure Production always has Upstash; alert on `not_configured` in health monitors. |
| **Apply now?** | Config/ops verification now; code change optional. |

### M4 — Shared `paddleConfig` includes server price IDs in a module imported by client components

| Field | Detail |
|-------|--------|
| **Risk** | Code smell / future leak: `PADDLE_PRO_PRICE_ID` / `PADDLE_EARLY_ACCESS_PRICE_ID` live on same object as `NEXT_PUBLIC_*` fields. Next.js generally does **not** inline non-`NEXT_PUBLIC` env into client bundles, so values should be empty on client — but structure invites mistakes. |
| **Evidence** | `src/config/paddle.ts`; imports from `pricing/page.tsx`, `pricing-section.tsx` for environment only. |
| **Recommended fix** | Split `paddlePublicConfig` vs `getPaddleServerCheckoutConfig()` (server-only file). |
| **Apply now?** | Safe refactor when approved. |

### M5 — Public health endpoint reveals rate-limit configuration state

| Field | Detail |
|-------|--------|
| **Risk** | Low-medium reconnaissance: `checks.authRateLimit: not_configured` tells attackers limits may be off. |
| **Evidence** | `src/app/api/health/route.ts` |
| **Recommended fix** | Keep internal; or omit `authRateLimit` from public response; monitor privately. |
| **Apply now?** | Optional. |

### M6 — npm moderate dependency chain (`postcss` via `next`)

| Field | Detail |
|-------|--------|
| **Risk** | Moderate XSS in postcss stringify (GHSA-qx2v-qp2m-jg93); not directly exploitable as typical app XSS. `npm audit fix --force` suggests broken Next downgrade — **do not force**. |
| **Evidence** | `npm audit --omit=dev`: 4 moderate, 0 high/critical. |
| **Recommended fix** | Upgrade Next when a safe patch lands; do not major-downgrade. |
| **Apply now?** | **No force upgrade.** Track Next releases. |

---

## 5. Low / info findings

| ID | Finding | Notes |
|----|---------|--------|
| L1 | `.env.example` documents secret **names** with placeholders (`sk_test_...`, `pdl_sdbx_...`) | Expected; not real secrets |
| L2 | Smoke runner documents `E2E_TEST_PASSWORD` env name | Values not committed; password never logged |
| L3 | `smoke-reports/` may exist locally | **Gitignored**; must stay out of commits |
| L4 | Backup workflow logs `pg_dump --version` only | Secrets via `${{ secrets.* }}`; issue body says do not paste secrets |
| L5 | Sentry tunnel `/monitoring` public in middleware | Intentional ad-blocker bypass; ensure Sentry DSN only |
| L6 | Markdown rendering uses `react-markdown` without `rehype-raw` (no HTML-in-MD by default) | Good for XSS posture |
| L7 | Callback URL sanitizer rejects `//` and external URLs | `src/lib/auth/callback-url.ts` |
| L8 | Account delete/export require session + rate limit; export verifies password | Good |
| L9 | Library export by id: `findFirst({ where: { id, userId } })` | IDOR-resistant |
| L10 | Client cannot pick model/provider | Server policy only |
| L11 | `ENABLE_GENERATION_AUTO_REPAIR` exact `"true"` only | Keep **off** in Production |
| L12 | Build does not invoke smoke scripts | `build` = `prisma generate && next build` only |

---

## 6. Supabase log diagnosis: `pg_pgrst_no_exposed_schemas`

### What it usually means

PostgREST (Supabase Data API) is configured such that **no schema is exposed** (or a sentinel empty configuration is used). The engine then references a non-existent placeholder schema name like `pg_pgrst_no_exposed_schemas`, producing Postgres errors in logs.

### Impact on Creatornivo

| Question | Answer |
|----------|--------|
| Does the Next.js app use Data API / PostgREST? | **No** (Prisma only) |
| Does this break generate / auth / quota? | **No**, if app only uses `DATABASE_URL` pooler/direct |
| Is it necessarily a breach? | **No** — often means Data API is **disabled/empty** (good) |
| When is it bad? | If you **intended** REST access; or if API is half-enabled with bad grants |

### Recommendations

1. **Preferred for this app:** Leave Data API **disabled** / exposed schemas **empty**. Ignore or silence log spam after confirming.  
2. Do **not** “fix” logs by exposing `public` without RLS.  
3. In Supabase Dashboard → **Settings → API → Exposed schemas**: confirm empty or only intentional schemas.  
4. If spam is high-volume and noisy, open a Supabase support ticket referencing empty exposed schemas + PostgREST log noise.  
5. Optionally restrict network: allow only Vercel IPs / app roles to DB (platform feature).

---

## 7. GitHub / Vercel secret exposure status

### Repo / GitHub

| Check | Result |
|-------|--------|
| Tracked `.env` / `.env.local` | **Not tracked** (`.gitignore` has `.env*` + `!.env.example`) |
| Tracked dumps/keys/age | **Not tracked**; patterns ignored (`*.dump`, `*.age`, `*.key`, `backup-key*`) |
| `smoke-reports/`, `scripts/template-smoke/.auth/` | **Gitignored** |
| Current tree secret scan | No live OpenAI/DB/service-role keys found in tracked source |
| History deep-dive | Not exhaustively scanned every blob in full history; recommend `gitleaks`/`trufflehog` on CI if not already |
| Workflows | Only `.github/workflows/database-backup.yml` — secrets from GitHub Secrets; no `echo $SECRET`; failure issue explicitly forbids pasting secrets |
| Package scripts | Smoke scripts **not** in `build`/`start` |

### Vercel (code-level)

| Check | Result |
|-------|--------|
| Server secrets under `NEXT_PUBLIC_` | **None** — OpenAI, DB, Auth secret, webhooks, Resend, Upstash token, Sentry server DSN use non-public names |
| Expected public | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `NEXT_PUBLIC_PADDLE_ENVIRONMENT`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| `E2E_*` in Production | **Must not** — local/CI only (policy) |
| `ENABLE_GENERATION_AUTO_REPAIR` Production | **Must remain unset / not `"true"`** |
| Build logging of env | No app code dumps `process.env`; Sentry build uses `SENTRY_AUTH_TOKEN` at build time (server/CI only) |

**Cannot verify from repo:** actual Vercel Project env UI values. Operator should confirm Production env list matches §10.

---

## 8. Supabase RLS / grants status (from app design)

| Topic | Status |
|-------|--------|
| App access path | Prisma via `DATABASE_URL` (server) |
| Supabase client keys in app | **None** |
| RLS defined in repo | **No** |
| Storage usage in app | **No** Storage SDK usage found |
| Auth | **Auth.js / credentials**, not Supabase Auth redirects |

**Conclusion:** Security of Supabase project is **platform configuration**, not application code. Until SQL/dashboard verification, treat Data API + grants as **must-verify**.

---

## 9. App / API abuse findings (summary)

| Path | Auth | Notes |
|------|------|--------|
| `POST /api/ai/generate` | Session | Email verified; UserUsage + reservation; input length; template access; model server-owned; validation; no client model |
| `GET /api/ai/usage` | Session | Own snapshot |
| `GET/POST /api/library` | Session | `userId` filter on list/create |
| `GET /api/library/[id]/export` | Session + Pro export | Own prompt only |
| `POST /api/export` | Session + Pro | Content body; not IDOR |
| `POST /api/account/delete` | Session + password confirm + rate limit | Good |
| `POST /api/account/export-data` | Session + password + rate limit | Good |
| `POST /api/paddle|stripe/webhook` | Signature secret | Public prefix intentional |
| `POST /api/paddle/checkout` | Session | Price resolved server-side / allowlist |
| Admin templates API | Admin guard | OK |
| `GET /api/templates` | **Optional session** | **Full prompts returned** (H1) |
| `GET /api/health` | Public | Low data |
| `GET /api/early-access/status` | Public | Status only |
| Middleware page protection | Session for protected pages | API relies on route guards |
| Open redirect | `getSafeCallbackUrl` | Relative paths only |

---

## 10. Recommended immediate fixes

| Priority | Action | Safe now? |
|----------|--------|-----------|
| 1 | Supabase dashboard: confirm Data API off / no exposed schemas; run SQL pack; revoke any `anon` table grants | Yes (ops) |
| 2 | Confirm Production Vercel has no `E2E_*`; no `ENABLE_GENERATION_AUTO_REPAIR=true` | Yes (ops) |
| 3 | Confirm Upstash configured in Production (auth limits) | Yes (ops) |
| 4 | Product decision: redact prompts on public `/api/templates` | Yes when product approves code |
| 5 | Optional: basic security headers | Yes when approved |
| 6 | Do **not** rotate secrets solely due to this report | N/A — no leak proven |

---

## 11. Recommended later hardening

1. Split public vs server Paddle config modules.  
2. Global OpenAI budget breaker (roadmap).  
3. Generate IP/user secondary rate limits.  
4. RLS + least-privilege DB role for Prisma.  
5. Full CSP after Next.js header testing.  
6. CI secret scanning (`gitleaks` / `trufflehog`).  
7. Full-history secret scan offline.  
8. npm/Next upgrade when postcss advisory patched without force.  
9. Health endpoint: hide internal config signals.  
10. Storage audit if/when Storage is introduced.

---

## 12. Exact commands / SQL for the operator

### 12.1 Local / repo (no secrets printed)

```powershell
# Tracked sensitive paths (should be empty for .env/dumps)
git ls-files | Select-String -Pattern "\.env$|\.pem$|\.dump|\.age|backup-key|smoke-reports|\.auth/"

# Ignore rules
git check-ignore -v .env.local smoke-reports/x.json scripts/template-smoke/.auth/state.json

# Prod dependency audit
npm audit --omit=dev
```

Optional CI tool (install separately):

```bash
# Example only — run offline with your preferred scanner
gitleaks detect --source . --no-git -v
```

### 12.2 Supabase SQL (read-only)

Run in Supabase SQL editor as a privileged role. **No UPDATE/DELETE.**

```sql
-- RLS table status
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname not in ('pg_catalog', 'information_schema')
order by schemaname, tablename;

-- Policies
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
order by schemaname, tablename, policyname;

-- Grants to anon/authenticated
select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where grantee in ('anon', 'authenticated')
order by table_schema, table_name, grantee, privilege_type;

-- Storage buckets (if storage schema exists)
select id, name, public, created_at, updated_at
from storage.buckets
order by name;

-- Security definer functions
select n.nspname as schema, p.proname as function, p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname not in ('pg_catalog', 'information_schema')
  and p.prosecdef = true
order by n.nspname, p.proname;

-- Function execute grants to public-ish roles
select routine_schema, routine_name, grantee, privilege_type
from information_schema.routine_privileges
where grantee in ('anon', 'authenticated', 'public')
order by routine_schema, routine_name, grantee;
```

**Interpretation guide**

| Observation | Meaning |
|-------------|---------|
| Many tables `rowsecurity = false` | Expected for pure Prisma apps; enable only with a plan |
| **Any** grants to `anon` on app tables | **Critical** — revoke or RLS+deny |
| Empty `pg_policies` + Data API enabled | **Critical** |
| Empty exposed schemas + log spam | **Info** — match `pg_pgrst_no_exposed_schemas` diagnosis |

### 12.3 Vercel Production env checklist

**Should be present (server / production as applicable):**

- `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` / `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`, `EMAIL_FROM`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` (optional but recommended)
- Paddle: `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `NEXT_PUBLIC_PADDLE_ENVIRONMENT`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_PRO_PRICE_ID`, `PADDLE_EARLY_ACCESS_PRICE_ID`
- Stripe only if still used
- Build: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` (build-time)

**Must NOT be in Production Vercel:**

- `E2E_BASE_URL`, `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`
- `ENABLE_GENERATION_AUTO_REPAIR=true` (unless separately approved)
- Age **private** backup key
- Local smoke auth caches

**Preview / Staging:** may mirror Production minus Live payment keys; auto-repair optional for experiments only.

**CI/local:** E2E_*, backup secrets in GitHub Actions only for backup workflow.

---

## 13. Do not change yet

| Item | Reason |
|------|--------|
| Secret rotation (unless a real leak is found in dashboard/history) | No confirmed leak in tree |
| Enable Supabase Data API / expose `public` | Would increase attack surface for a Prisma-only app |
| `npm audit fix --force` | Breaks Next version |
| Auto-upgrade major dependencies | Needs explicit approval |
| Auth / billing / provider / templates / prompts | Out of scope unless approved |
| Production data delete/reset | Forbidden |
| Add `E2E_*` to Production | Forbidden |
| Enable Production auto-repair | Forbidden without approval |
| Commit this report | Only if explicitly approved |

---

## 14. Residual verification checklist (operator)

1. [ ] Supabase: Data API / exposed schemas  
2. [ ] SQL: grants to `anon` / `authenticated` empty for app data  
3. [ ] Vercel Production env vs §12.3  
4. [ ] Upstash live in Production  
5. [ ] Optional: gitleaks full history  
6. [ ] Product: prompt exposure on `/api/templates`  

---

## 15. Bottom line

- **No committed live secrets found** in the current application tree.  
- **App is Prisma-centric**; Supabase Data API is not used in code — log spam is likely **configuration noise**, not an app bug.  
- **Verify platform grants/RLS** before calling Supabase “secure by default.”  
- **Main app-level High issue:** public full **prompt** disclosure via templates API.  
- Generate/quota/billing webhooks/library ownership checks look **sound**.  
- Keep **E2E out of Production** and **auto-repair off**.

*Report generated read-only 2026-07-16. Not committed unless approved.*
