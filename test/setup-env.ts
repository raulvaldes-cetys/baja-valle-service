// Fijas para que las pruebas nunca lean el .env local, que apunta a la base de datos real
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://test:test@127.0.0.1:5432/test',
  CORS_ORIGINS: 'http://localhost:4321',
  SWAGGER_ENABLED: 'false',
  MAIL_HOST: 'smtp.test.local',
  MAIL_PORT: '465',
  MAIL_SECURE: 'true',
  MAIL_USER: 'no-reply@test.local',
  MAIL_PASS: 'test',
  MAIL_TO: 'ventas@test.local',
});
