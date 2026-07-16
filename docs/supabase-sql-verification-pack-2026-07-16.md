# Supabase SQL verification pack — 2026-07-16

**Mode:** Read-only.  
**Purpose:** Confirm whether Supabase Data API / exposed schemas / RLS / `anon` grants are safe for Creatornivo (Prisma-only app).  
**Do not:** UPDATE, DELETE, INSERT, DROP, TRUNCATE, GRANT, REVOKE, or ALTER.  
**Do not:** paste connection strings, service-role keys, or query result dumps that include secrets into chat/issues.

**Context log:**

```text
schema "pg_pgrst_no_exposed_schemas" does not exist
```

That message usually means PostgREST (Data API) is configured with **no exposed schemas** (or an empty sentinel). It is often **benign noise** for Prisma-only apps — but you must still prove grants/RLS are not silently dangerous.

**How to run:** Supabase Dashboard → SQL Editor → paste each section (or the full pack at the bottom) → Run. Prefer a **read-only** DB role if you have one; dashboard owner role is fine for SELECT-only scripts.

**App context (from code audit):** Creatornivo uses **Prisma + `DATABASE_URL` only**. No `supabase-js`, no `SUPABASE_SERVICE_ROLE_KEY` in the app. Data API is not required for product function.

---

## Interpretation legend

| Level | Meaning |
|-------|---------|
| **SAFE** | Expected for this architecture; no immediate action for Data API exposure. |
| **WARNING** | Not an active breach by itself, but weak defense-in-depth or needs product/ops decision. |
| **CRITICAL** | Data could be reachable via PostgREST/anon (or equivalent) without going through Next.js auth. Fix before treating production as locked down. |

### How this maps to the log spam

| Situation | Log spam likely? | Verdict |
|-----------|------------------|---------|
| No/empty exposed schemas + no useful `anon` grants | Yes (`pg_pgrst_no_exposed_schemas`) | **SAFE** (noise) |
| Exposed `public` + RLS off + grants to `anon` | May or may not spam | **CRITICAL** |
| Exposed `public` + RLS on + restrictive policies | Unrelated to empty-schema spam | Review policies carefully |
| RLS off on app tables but Data API fully disabled + no `anon` grants | Often yes | **WARNING** (Prisma still privileged; API path closed) |

---

## 1. Exposed schemas / PostgREST config (if visible)

PostgREST config is often in DB roles/settings or Supabase dashboard, not always in SQL. These queries surface what is available from Postgres.

### 1a — Schemas that exist (baseline)

```sql
-- 1a. Non-system schemas present in the database
SELECT nspname AS schema_name
FROM pg_namespace
WHERE nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
  AND nspname NOT LIKE 'pg_temp_%'
  AND nspname NOT LIKE 'pg_toast_temp_%'
ORDER BY nspname;
```

| Result pattern | Level | Interpretation |
|----------------|-------|----------------|
| `public`, `auth`, `storage`, `extensions`, `realtime`, … | **SAFE** | Normal Supabase layout. |
| Unexpected custom schemas | **WARNING** | Document who uses them. |

### 1b — PostgREST / `authenticator` role settings (if present)

```sql
-- 1b. Role configuration that often holds pgrst.* settings
SELECT
  r.rolname,
  unnest(coalesce(r.rolconfig, ARRAY[]::text[])) AS config_entry
FROM pg_roles r
WHERE r.rolname IN (
  'authenticator',
  'anon',
  'authenticated',
  'service_role',
  'supabase_admin',
  'postgres'
)
ORDER BY r.rolname, config_entry;
```

Look for entries like:

- `pgrst.db_schemas=...`
- `pgrst.db_anon_role=anon`

| Result pattern | Level | Interpretation |
|----------------|-------|----------------|
| No `pgrst.*` / empty / schemas blank | **SAFE** or **WARNING** | Aligns with “no exposed schemas” log noise. Confirm in Dashboard → Settings → API. |
| `pgrst.db_schemas` includes `public` | **WARNING** → escalate with §4 | Data API can see `public`; must check grants + RLS. |
| `pgrst.db_schemas` includes app data schemas intentionally | **WARNING** | Only OK with strict RLS + minimal grants. |

### 1c — Dashboard cross-check (not SQL)

Supabase Dashboard → **Project Settings → API**:

| Setting | SAFE | CRITICAL |
|---------|------|----------|
| Exposed schemas | Empty / only non-app schemas | `public` with app tables + weak RLS |
| Data API | Disabled / unused | Enabled + broad anon access |

Also note: the literal schema name `pg_pgrst_no_exposed_schemas` is a **sentinel**, not a real app schema. It should **not** appear in §1a as a real namespace (if it does, odd config — **WARNING**).

```sql
-- 1c. Confirm the sentinel schema is NOT a real schema
SELECT EXISTS (
  SELECT 1
  FROM pg_namespace
  WHERE nspname = 'pg_pgrst_no_exposed_schemas'
) AS sentinel_schema_exists;
```

| Result | Level | Interpretation |
|--------|-------|----------------|
| `false` | **SAFE** | Matches “schema does not exist” error noise from PostgREST. |
| `true` | **WARNING** | Unexpected; investigate who created it. |

---

## 2. RLS status for app tables

```sql
-- 2. RLS enabled flag for all non-system tables
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename;
```

Focus on **your Prisma tables** (typical names; actual set may differ):

- `User`, `UserUsage`, `Account`, `Session`, `Generation`, `GenerationReservation`, `SavedPrompt`, `Template`, `Subscription`, etc.  
(Exact names depend on Prisma `@@map` — use whatever appears under `public`.)

| Result pattern | Level | Interpretation |
|----------------|-------|----------------|
| App tables `rls_enabled = false`, Data API off, no `anon` grants | **WARNING** | Normal for Prisma-as-owner apps; not internet-exposed by itself. |
| App tables `rls_enabled = false` **and** `anon` has SELECT/INSERT | **CRITICAL** | Data API or direct PostgREST path could dump/mutate data. |
| App tables `rls_enabled = true` with policies | **SAFE** only if policies are least-privilege (see §3). |

---

## 3. Policies on public / storage tables

```sql
-- 3a. All RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
ORDER BY schemaname, tablename, policyname;
```

```sql
-- 3b. Storage object policies (if storage used)
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;
```

| Result pattern | Level | Interpretation |
|----------------|-------|----------------|
| No policies on app tables + RLS off + no anon grants | **WARNING** | Acceptable for Prisma-only if API closed. |
| Policy `TO anon` with `USING (true)` on app data | **CRITICAL** | Public read/write of user data. |
| Storage policies allowing `anon` upload/download to private buckets | **CRITICAL** | Public file access. |
| Empty `storage` policies and no buckets | **SAFE** | Storage unused. |

---

## 4. Grants to `anon` / `authenticated`

```sql
-- 4a. Table privileges for PostgREST-facing roles
SELECT
  table_schema,
  table_name,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE grantee IN ('anon', 'authenticated')
ORDER BY table_schema, table_name, grantee, privilege_type;
```

```sql
-- 4b. Column-level grants (sometimes used instead of table grants)
SELECT
  table_schema,
  table_name,
  column_name,
  grantee,
  privilege_type
FROM information_schema.column_privileges
WHERE grantee IN ('anon', 'authenticated')
ORDER BY table_schema, table_name, column_name, grantee;
```

```sql
-- 4c. Sequence grants (can enable insert abuse if tables are writable)
SELECT
  sequence_schema,
  sequence_name,
  grantee,
  privilege_type
FROM information_schema.usage_privileges
WHERE grantee IN ('anon', 'authenticated')
  AND object_type = 'SEQUENCE'
ORDER BY sequence_schema, sequence_name, grantee;
```

### Dangerous if Data API is enabled (or ever re-enabled)

Any of the following on **app data** tables → treat as **CRITICAL**:

| Privilege | Why dangerous |
|-----------|----------------|
| `SELECT` to `anon` | Public read of users, generations, prompts |
| `INSERT` / `UPDATE` / `DELETE` to `anon` | Public write/corruption |
| Broad `SELECT` to `authenticated` without RLS | Any logged-in Supabase Auth user (if used) could read all rows |

| Result pattern | Level | Interpretation |
|----------------|-------|----------------|
| **Zero rows** for app schemas in 4a/4b | **SAFE** | PostgREST has nothing useful to expose even if half-configured. |
| Grants only on `storage` / internal with tight policies | **WARNING** | Review case-by-case. |
| Grants on `public."User"` / generations / prompts to `anon` | **CRITICAL** | Fix immediately (revoke + RLS). |

**Note:** Creatornivo uses **Auth.js**, not necessarily Supabase Auth. `authenticated` grants may still matter if the project default roles are left open.

---

## 5. Storage bucket public/private status

```sql
-- 5a. Buckets (skip if storage.buckets missing)
SELECT
  id,
  name,
  public AS is_public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
FROM storage.buckets
ORDER BY name;
```

```sql
-- 5b. Object counts per bucket (metadata only; not file contents)
SELECT
  bucket_id,
  COUNT(*) AS object_count
FROM storage.objects
GROUP BY bucket_id
ORDER BY bucket_id;
```

| Result pattern | Level | Interpretation |
|----------------|-------|----------------|
| No buckets / empty | **SAFE** | Storage unused (matches app audit). |
| `is_public = true` with real objects | **WARNING** or **CRITICAL** | Public URLs if objects exist; confirm intentional. |
| Private buckets + open `anon` policies (§3b) | **CRITICAL** | Policy beats “private” flag in practice. |

---

## 6. SECURITY DEFINER functions and execute grants

```sql
-- 6a. SECURITY DEFINER functions outside system catalogs
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args,
  p.prosecdef AS security_definer,
  p.proconfig AS function_config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND p.prosecdef = true
ORDER BY n.nspname, p.proname;
```

```sql
-- 6b. EXECUTE grants on routines to public-ish roles
SELECT
  routine_schema,
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE grantee IN ('anon', 'authenticated', 'public')
ORDER BY routine_schema, routine_name, grantee;
```

```sql
-- 6c. SECURITY DEFINER + EXECUTE for anon/authenticated/public (high signal)
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  r.rolname AS grantee
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'n'
-- Prefer aclitem scan for execute:
JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl ON true
JOIN pg_roles r ON r.oid = acl.grantee
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND p.prosecdef = true
  AND acl.privilege_type = 'EXECUTE'
  AND r.rolname IN ('anon', 'authenticated', 'public')
ORDER BY n.nspname, p.proname, r.rolname;
```

If **6c** fails on your Postgres version, use **6a + 6b** and manually cross-check names.

| Result pattern | Level | Interpretation |
|----------------|-------|----------------|
| Supabase-internal definer functions only; not granted to `anon` | **SAFE** / **WARNING** | Common on hosted Supabase. |
| Custom definer in `public` executable by `anon` | **CRITICAL** | Privilege escalation path. |
| `search_path` not locked on custom definer (`proconfig` lacks `search_path=...`) | **WARNING** | Classic hardening issue for custom functions. |

---

## 7. Tables in `public` with RLS disabled

```sql
-- 7. public schema tables where RLS is OFF
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = false
ORDER BY c.relname;
```

| Result pattern | Level | Interpretation |
|----------------|-------|----------------|
| Many Prisma tables listed + §4 shows **no** `anon` grants | **WARNING** | Expected Prisma posture; API path closed. |
| Same list + `anon` SELECT/INSERT on those tables | **CRITICAL** | |
| Empty (all RLS on) | **SAFE** for defense-in-depth (still verify policies). |

---

## 8. Anon grants that are dangerous if Data API is enabled

Dedicated “red flag” query — any row is a problem **if** Data API can see that schema.

```sql
-- 8. High-signal dangerous privileges for anon on public tables
SELECT
  g.table_schema,
  g.table_name,
  g.privilege_type,
  CASE
    WHEN g.privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
      THEN 'CRITICAL_WRITE'
    WHEN g.privilege_type = 'SELECT'
      THEN 'CRITICAL_READ'
    WHEN g.privilege_type IN ('REFERENCES', 'TRIGGER')
      THEN 'WARNING'
    ELSE 'REVIEW'
  END AS risk_if_data_api_enabled
FROM information_schema.role_table_grants g
WHERE g.grantee = 'anon'
  AND g.table_schema IN ('public', 'storage')
ORDER BY
  CASE
    WHEN g.privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE') THEN 0
    WHEN g.privilege_type = 'SELECT' THEN 1
    ELSE 2
  END,
  g.table_schema,
  g.table_name;
```

```sql
-- 8b. Same for authenticated (important if Supabase Auth is on)
SELECT
  g.table_schema,
  g.table_name,
  g.privilege_type,
  'REVIEW_AUTHENTICATED' AS note
FROM information_schema.role_table_grants g
WHERE g.grantee = 'authenticated'
  AND g.table_schema IN ('public', 'storage')
ORDER BY g.table_schema, g.table_name, g.privilege_type;
```

| Result pattern | Level | Interpretation |
|----------------|-------|----------------|
| **0 rows** in 8 for `anon` | **SAFE** | Even with Data API mistakes, table ACL blocks `anon`. |
| Any `CRITICAL_*` row | **CRITICAL** | Assume breach path until revoked + retested. |
| Only `authenticated` broad SELECT, RLS off | **CRITICAL** if Supabase Auth used; **WARNING** if Auth unused but roles exist |

---

## 9. Decision tree: is the log spam benign?

Run in order: **1c → 4a → 8 → 7 → 1b / Dashboard**.

```text
sentinel_schema_exists = false?
  yes → expected for error message
anon grants on public app tables (query 8) empty?
  yes → Data API cannot usefully read app data as anon
  no  → CRITICAL regardless of log spam
Dashboard / pgrst.db_schemas empty or no public?
  yes + empty anon grants → SAFE: log spam is benign noise
  no  + RLS off            → CRITICAL
  no  + RLS on             → audit every policy (section 3)
```

### Final combined verdict cheat-sheet

| 1c sentinel exists | 8 anon grants | Exposed schemas include public | Verdict |
|--------------------|---------------|--------------------------------|---------|
| false | empty | no / empty | **SAFE** — spam is noise |
| false | empty | yes | **WARNING** — API open but ACL empty; still tighten |
| false | non-empty | yes | **CRITICAL** |
| false | non-empty | no | **WARNING/CRITICAL** — grants exist; fix anyway |
| true | any | any | **WARNING** — investigate sentinel schema |

---

## 10. Full pack (copy once)

Safe to run as a single script: all SELECTs.

```sql
-- ============================================================
-- Creatornivo Supabase READ-ONLY verification pack
-- 2026-07-16 — no writes
-- ============================================================

-- 1a schemas
SELECT nspname AS schema_name
FROM pg_namespace
WHERE nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
  AND nspname NOT LIKE 'pg_temp_%'
  AND nspname NOT LIKE 'pg_toast_temp_%'
ORDER BY nspname;

-- 1c sentinel
SELECT EXISTS (
  SELECT 1 FROM pg_namespace WHERE nspname = 'pg_pgrst_no_exposed_schemas'
) AS sentinel_schema_exists;

-- 1b role config (pgrst.*)
SELECT r.rolname, unnest(coalesce(r.rolconfig, ARRAY[]::text[])) AS config_entry
FROM pg_roles r
WHERE r.rolname IN (
  'authenticator', 'anon', 'authenticated', 'service_role', 'supabase_admin', 'postgres'
)
ORDER BY r.rolname, config_entry;

-- 2 RLS flags
SELECT schemaname, tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename;

-- 7 public RLS off
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false
ORDER BY c.relname;

-- 3 policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
ORDER BY schemaname, tablename, policyname;

-- 4a table grants
SELECT table_schema, table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE grantee IN ('anon', 'authenticated')
ORDER BY table_schema, table_name, grantee, privilege_type;

-- 8 dangerous anon grants
SELECT table_schema, table_name, privilege_type,
  CASE
    WHEN privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE') THEN 'CRITICAL_WRITE'
    WHEN privilege_type = 'SELECT' THEN 'CRITICAL_READ'
    ELSE 'REVIEW'
  END AS risk_if_data_api_enabled
FROM information_schema.role_table_grants
WHERE grantee = 'anon' AND table_schema IN ('public', 'storage')
ORDER BY 4, table_schema, table_name;

-- 8b authenticated grants
SELECT table_schema, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'authenticated' AND table_schema IN ('public', 'storage')
ORDER BY table_schema, table_name, privilege_type;

-- 5 storage buckets (ignore error if storage not installed)
SELECT id, name, public AS is_public, created_at, updated_at
FROM storage.buckets
ORDER BY name;

-- 6a security definer
SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS args,
       p.prosecdef AS security_definer, p.proconfig AS function_config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND p.prosecdef = true
ORDER BY n.nspname, p.proname;

-- 6b execute grants
SELECT routine_schema, routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE grantee IN ('anon', 'authenticated', 'public')
ORDER BY routine_schema, routine_name, grantee;
```

If `storage.buckets` errors with “relation does not exist”, Storage is unused — mark §5 **SAFE** and continue.

---

## 11. What to record (no secrets)

For the audit trail, record only:

| Field | Example |
|-------|---------|
| Date / project ref (not password) | `2026-07-16 / abcd1234` |
| `sentinel_schema_exists` | `false` |
| Count of `anon` grants on `public` | `0` |
| Count of public tables with RLS off | e.g. `12` |
| Dashboard exposed schemas | `(empty)` |
| Final verdict | SAFE / WARNING / CRITICAL |

Do **not** export full table dumps or role passwords.

---

## 12. If CRITICAL

1. Do not expose additional schemas.  
2. In Supabase: disable Data API / clear exposed schemas.  
3. Revoke dangerous `anon`/`authenticated` grants (requires write privileges — separate approved change).  
4. Enable RLS only with a tested policy plan so Prisma app role still works.  
5. Rotate DB password / anon key **only if** you believe exposure was real.  

If **SAFE**: keep Data API off; treat log spam as noise; optional later RLS for defense-in-depth.

---

## 13. Relation to security audit report

See also:

- `docs/security-audit-report-2026-07-16.md` (full audit)  
- App uses Prisma only — platform SQL verification is the missing gate for C1.

*Pack is documentation only. Not committed unless you approve.*
