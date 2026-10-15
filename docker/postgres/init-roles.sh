#!/bin/sh
set -e

psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v migrator_password="$MIGRATOR_DB_PASSWORD" \
  -v app_password="$APP_DB_PASSWORD" \
  -v db="$POSTGRES_DB" <<'SQL'
-- CREATEDB: shadow database de `prisma migrate dev`
CREATE ROLE baja_valle_migrator LOGIN CREATEDB PASSWORD :'migrator_password';
CREATE ROLE baja_valle_app LOGIN PASSWORD :'app_password';

ALTER DATABASE :"db" OWNER TO baja_valle_migrator;
REVOKE ALL ON DATABASE :"db" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db" TO baja_valle_app;
SQL
