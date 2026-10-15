-- Reemplazar por una contraseña generada; no guardarla en este archivo
CREATE ROLE baja_valle_app LOGIN PASSWORD 'REEMPLAZAR_POR_CONTRASEÑA_GENERADA';

DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO baja_valle_app', current_database());
END
$$;
