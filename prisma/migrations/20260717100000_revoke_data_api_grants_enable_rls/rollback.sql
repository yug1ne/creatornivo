-- =============================================================================
-- ROLLBACK for 20260717100000_revoke_data_api_grants_enable_rls
--
-- NOT applied by Prisma automatically. Run manually only if you must undo.
-- Does NOT restore the exact prior GRANT set (Supabase defaults vary by project).
-- It disables RLS and re-grants a typical broad Supabase-style surface — only use
-- if you intentionally re-open Data API risk.
--
-- Prefer: leave migration applied; keep Data API disabled.
-- =============================================================================

-- 1) Disable RLS on public app tables (not _prisma_migrations)
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
      'ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY',
      r.table_name
    );
  END LOOP;
END
$$;

-- 2) Re-grant common privileges (matches many Supabase starter grants)
--    WARNING: This recreates latent Data API exposure if Data API is enabled.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA public TO anon';
    EXECUTE 'GRANT ALL ON ALL TABLES IN SCHEMA public TO anon';
    EXECUTE 'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA public TO authenticated';
    EXECUTE 'GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated';
    EXECUTE 'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated';
  END IF;
END
$$;

-- 3) Clear default privilege revokes is not fully reversible via SQL without
--    knowing prior defaults. Optionally re-grant defaults:
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated';
  END IF;
END
$$;

-- After rollback: keep Data API disabled unless you have a deliberate reason.
