# DB hardening migration plan — 2026-07-17

**Status:** Prepared, **not applied**, not committed until approved.  
**Migration folder:** `prisma/migrations/20260717100000_revoke_data_api_grants_enable_rls/`

| File | Purpose |
|------|---------|
| `migration.sql` | Forward migration (Prisma `migrate deploy`) |
| `rollback.sql` | Manual undo only (not Prisma-managed) |
| `verify.sql` | Read-only post-checks |
| `optional_default_privileges.sql` | Manual only: `FOR ROLE postgres/supabase_admin` defaults |

---

## What it does

1. **REVOKE ALL** table privileges on `public` from `anon` and `authenticated` (if roles exist).  
2. **REVOKE ALL** sequence privileges on `public` from those roles.  
3. Explicit **REVOKE** on `_prisma_migrations` for those roles.  
4. **ENABLE ROW LEVEL SECURITY** on every `public` base table **except** `_prisma_migrations`.  
5. Does **not** `FORCE ROW LEVEL SECURITY`.  
6. Does **not** create any policies (`USING (true)` forbidden).  
7. **ALTER DEFAULT PRIVILEGES** for the **current migrate role only** (no `FOR ROLE postgres` / `supabase_admin` in main migration).  
8. Optional manual: `optional_default_privileges.sql` for those owner roles after main migration is green.  
9. Does **not** touch `auth`, `storage`, `realtime`, `graphql_public`.

### Preflight (passed)

- `DATABASE_URL` session: `current_user` / `session_user` = `postgres`  
- Public tables owned by `postgres`  
- `postgres.rolbypassrls = true` → Prisma continues after RLS enable without FORCE  
- Data API disabled; Prisma-only app

---

## Will server-side Prisma still work?

**Yes — expected**, for the normal Supabase + Prisma setup:

| Actor | After migration |
|-------|-----------------|
| Prisma app (`DATABASE_URL` role, usually table owner / privileged) | Continues full CRUD. **Owners bypass RLS** unless `FORCE` is set (we do not force). |
| Prisma migrate (`DIRECT_URL` / same owner) | Continues; `_prisma_migrations` has no RLS; privileges for owner unchanged. |
| `anon` / `authenticated` via Data API | **No table privileges** + RLS on with **zero policies** → cannot read/write app data even if Data API is re-enabled by mistake. |
| Browser | Still never talks to Postgres; only Next.js + Prisma. |

### Residual risk to test on staging

- If `DATABASE_URL` used a **non-owner** role without `BYPASSRLS`, enabling RLS with no policies would block that role. Creatornivo’s typical Supabase connection is **not** that pattern; still **verify on staging** with health + login + one library/generate call.  
- Local Postgres without `anon`/`authenticated` roles: migration **no-ops** revoke sections safely.

---

## Apply order (when approved)

1. **Staging / preview DB only** first.  
2. Backup already exists (R2 daily); optional extra snapshot before prod.  
3. `npx prisma migrate deploy` (uses `DIRECT_URL` when set).  
4. Run `verify.sql` in SQL editor.  
5. Smoke: `/api/health`, login, open library, one generate.  
6. Confirm Data API still **disabled** in dashboard.  
7. Production only after staging green.

**Do not** enable Data API as part of this work.

---

## Verification expectations

| Check | Expected |
|-------|----------|
| Query A/B (`anon` / `authenticated` table grants on public) | **0 rows** |
| Sequences to API roles | **0 rows** |
| `_prisma_migrations` API grants | **0 rows** |
| App tables `rls_enabled` | **true** |
| `rls_forced` | **false** |
| `_prisma_migrations` RLS | **false** (intentional) |
| `pg_policies` on public | **0** |
| Data API dashboard | Still disabled |

---

## Rollback

Only if migration must be undone: run `rollback.sql` manually (re-opens broad grants — **not recommended**). Prefer leave hardening applied.

---

## Out of scope

- Secret rotation  
- Prisma schema/model changes  
- Auth/billing/app code  
- Permissive RLS policies  
- Production apply without explicit approval  

---

## Approval gate

Reply with approval to:

1. Commit migration files only, and/or  
2. Apply on staging, and/or  
3. Apply on production  

until then: **files only, no deploy, no migrate.**
