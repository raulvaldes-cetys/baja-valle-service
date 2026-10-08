-- Permisos de mínimo privilegio y RLS. Idempotente.
-- Ejecutar con el rol dueño de las tablas (el de DIRECT_URL) después de cada `prisma migrate`:
--   pnpm db:grants
--
-- baja_valle_app solo puede leer y escribir datos: sin DDL y sin acceso al historial de migraciones.
GRANT USAGE ON SCHEMA public TO baja_valle_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO baja_valle_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO baja_valle_app;
REVOKE ALL ON TABLE public._prisma_migrations FROM baja_valle_app;

-- Tablas que creen migraciones futuras heredan los mismos permisos
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO baja_valle_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO baja_valle_app;

-- RLS en todas las tablas. En Supabase esto cierra la Data API (roles anon/authenticated):
-- sin una política que los nombre, no ven ni modifican nada. El dueño de las tablas no se ve afectado
-- y baja_valle_app tiene una política explícita.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);

    IF t.tablename <> '_prisma_migrations' AND NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t.tablename AND policyname = 'baja_valle_app_all'
    ) THEN
      EXECUTE format(
        'CREATE POLICY baja_valle_app_all ON public.%I TO baja_valle_app USING (true) WITH CHECK (true)',
        t.tablename
      );
    END IF;
  END LOOP;
END
$$;
