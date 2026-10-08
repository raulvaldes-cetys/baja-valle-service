-- Reemplazar por una contraseña generada; no guardarla en este archivo
CREATE ROLE baja_valle_app LOGIN PASSWORD 'REEMPLAZAR_POR_CONTRASEÑA_GENERADA';
GRANT CONNECT ON DATABASE postgres TO baja_valle_app;
