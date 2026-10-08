#!/bin/sh
set -e

psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v migrator_password="$MIGRATOR_DB_PASSWORD" \
  -v app_password="$APP_DB_PASSWORD" <<'SQL'
-- CREATEDB: shadow database de `prisma migrate dev`
CREATE ROLE baja_valle_migrator LOGIN CREATEDB PASSWORD :'migrator_password';
CREATE ROLE baja_valle_app LOGIN PASSWORD :'app_password';

ALTER DATABASE baja_valle OWNER TO baja_valle_migrator;
REVOKE ALL ON DATABASE baja_valle FROM PUBLIC;
GRANT CONNECT ON DATABASE baja_valle TO baja_valle_app;
SQL
