-- Crea el rol de runtime de la API en un Postgres administrado (Supabase hoy, Azure después).
-- En local no hace falta: lo crea docker/postgres/init-roles.sh.
--
-- Ejecutar UNA vez como administrador, reemplazando la contraseña por una generada
-- (por ejemplo `openssl rand -base64 32`). No guardes la contraseña real en este archivo.
CREATE ROLE baja_valle_app LOGIN PASSWORD 'REEMPLAZAR_POR_CONTRASEÑA_GENERADA';
GRANT CONNECT ON DATABASE postgres TO baja_valle_app; -- en Supabase la BD se llama "postgres"
