-- Solo para Supabase. Idempotente. Ejecutar como postgres después de grants.sql.
--
-- Supabase da por defecto todos los privilegios (incluido TRUNCATE, que RLS no controla)
-- a los roles anon y authenticated sobre las tablas de public, para su Data API (PostgREST).
-- La API de Baja Valle no usa la Data API, así que se revocan por completo.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- Evita que las tablas de migraciones futuras vuelvan a heredar esos privilegios
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
