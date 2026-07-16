-- =============================================================================
-- POST-MIGRATION VERIFICATION (read-only)
-- Run after: npx prisma migrate deploy  (on staging first)
-- =============================================================================

-- A) Dangerous anon grants on public/storage → expect 0 rows
SELECT
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
  AND table_schema IN ('public', 'storage')
ORDER BY table_schema, table_name, privilege_type;

-- B) Dangerous authenticated grants on public/storage → expect 0 rows
--    (unless you later add a justified Supabase Auth Data API use case)
SELECT
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'authenticated'
  AND table_schema IN ('public', 'storage')
ORDER BY table_schema, table_name, privilege_type;

-- C) Sequence grants to API roles → expect 0 rows
SELECT
  object_schema,
  object_name,
  grantee,
  privilege_type
FROM information_schema.usage_privileges
WHERE grantee IN ('anon', 'authenticated')
  AND object_type = 'SEQUENCE'
  AND object_schema = 'public'
ORDER BY object_name, grantee;

-- D) _prisma_migrations must not be accessible to API roles
SELECT
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = '_prisma_migrations'
  AND grantee IN ('anon', 'authenticated');
-- expect 0 rows

-- E) App tables: RLS enabled (except _prisma_migrations may stay off)
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;
-- expect: rls_enabled = true for app tables; rls_forced = false always
-- expect: _prisma_migrations rls_enabled = false (intentionally)

-- F) Policies remain empty (deny-by-default for non-owner)
SELECT COUNT(*) AS policy_count FROM pg_policies WHERE schemaname = 'public';
-- expect: 0 (or only future intentional policies)

-- G) Public tables still with RLS off (should only be _prisma_migrations if any)
SELECT c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = false
ORDER BY c.relname;

-- H) Prisma smoke (run from app host, not SQL):
--    npx prisma migrate status
--    Hit /api/health and one authenticated generate/library call on staging.
