-- =============================================================================
-- OPTIONAL (manual) — NOT run by prisma migrate deploy
--
-- Extends default-privilege hardening for roles that often create tables on
-- Supabase (postgres, supabase_admin). Only run if:
--   1) Main migration already applied and verified
--   2) You are connected as a superuser / role that may alter those defaults
--   3) You accept that this is extra defense for FUTURE CREATE TABLE/SEQUENCE
--
-- Current tables already had REVOKE in migration.sql; this only affects future
-- objects created by the named roles.
-- =============================================================================

DO $$
DECLARE
  owner_role text;
BEGIN
  FOREACH owner_role IN ARRAY ARRAY['postgres', 'supabase_admin']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = owner_role) THEN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
         AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE format(
          'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated',
          owner_role
        );
        EXECUTE format(
          'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated',
          owner_role
        );
      ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE format(
          'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES FROM anon',
          owner_role
        );
        EXECUTE format(
          'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon',
          owner_role
        );
      ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE format(
          'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated',
          owner_role
        );
        EXECUTE format(
          'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated',
          owner_role
        );
      END IF;
    END IF;
  END LOOP;
END
$$;
