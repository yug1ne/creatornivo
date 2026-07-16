-- =============================================================================
-- Migration: revoke Supabase Data API latent grants + enable RLS (defense-in-depth)
-- Date: 2026-07-17
--
-- Context:
--   - App uses Prisma only (DATABASE_URL / DIRECT_URL). No supabase-js.
--   - Data API is disabled; pg_pgrst_no_exposed_schemas log noise expected.
--   - Audit found broad grants to anon/authenticated on public tables + RLS off.
--
-- Goals:
--   - Remove table/sequence privileges for anon & authenticated in public.
--   - Enable ROW LEVEL SECURITY on app tables WITHOUT policies (deny Data API roles).
--   - Do NOT FORCE RLS (table owner / Prisma migrate role must keep full access).
--   - Do NOT touch auth, storage, realtime, graphql_public schemas.
--   - Do NOT create USING (true) policies.
--
-- Prisma impact:
--   Safe when the app role is table owner or BYPASSRLS (typical Supabase postgres /
--   migration role). Empty RLS + no FORCE does not block the owner.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Revoke table privileges (all current public tables, including _prisma_migrations)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated';
  ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon';
  ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated';
  END IF;
END
$$;

-- Explicit (idempotent clarity for audit trail)
DO $$
BEGIN
  IF to_regclass('public."_prisma_migrations"') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE 'REVOKE ALL ON TABLE public."_prisma_migrations" FROM anon';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE 'REVOKE ALL ON TABLE public."_prisma_migrations" FROM authenticated';
    END IF;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 2) Revoke sequence privileges in public
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated';
  ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon';
  ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated';
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 3) Enable RLS on public app tables (NOT _prisma_migrations; NOT FORCE)
--    No policies → non-owner / non-bypass roles get zero rows via Data API.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname <> '_prisma_migrations'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      r.table_name
    );
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- 4) Default privileges: CURRENT ROLE only (safe for prisma migrate deploy).
--    Does NOT use ALTER DEFAULT PRIVILEGES FOR ROLE postgres / supabase_admin
--    (those require ownership of that role’s defaults and are optional — see
--    optional_default_privileges.sql).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated';
  ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon';
  ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated';
  END IF;
END
$$;

-- Intentionally NOT:
--   ALTER DEFAULT PRIVILEGES FOR ROLE postgres / supabase_admin  (see optional_default_privileges.sql)
--   ALTER TABLE ... FORCE ROW LEVEL SECURITY
--   CREATE POLICY ... USING (true)
--   any changes to auth / storage / realtime / graphql_public
