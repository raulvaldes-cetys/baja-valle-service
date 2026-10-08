#!/bin/sh
# Se ejecuta una sola vez, al crear el volumen. Replica en local el esquema de mínimo privilegio:
#   baja_valle_migrator -> dueño de la BD; corre migraciones (DIRECT_URL)
#   baja_valle_app      -> solo DML; lo usa la API en runtime (DATABASE_URL)
set -e

psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v migrator_password="$MIGRATOR_DB_PASSWORD" \
  -v app_password="$APP_DB_PASSWORD" <<'SQL'
-- CREATEDB es solo para la shadow database de `prisma migrate dev`
CREATE ROLE baja_valle_migrator LOGIN CREATEDB PASSWORD :'migrator_password';
CREATE ROLE baja_valle_app LOGIN PASSWORD :'app_password';

ALTER DATABASE baja_valle OWNER TO baja_valle_migrator;
REVOKE ALL ON DATABASE baja_valle FROM PUBLIC;
GRANT CONNECT ON DATABASE baja_valle TO baja_valle_app;
SQL
