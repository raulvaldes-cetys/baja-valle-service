import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { Env } from './config/env';
import { configureApp } from './setup-app';

// BigInt no es serializable por JSON.stringify por defecto.
// Esto lo convierte a string automáticamente en todas las respuestas HTTP.
(BigInt.prototype as { toJSON?: () => string }).toJSON = function (
  this: bigint,
) {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService<Env, true>);

  configureApp(app, {
    NODE_ENV: config.get('NODE_ENV', { infer: true }),
    CORS_ORIGINS: config.get('CORS_ORIGINS', { infer: true }),
    SWAGGER_ENABLED: config.get('SWAGGER_ENABLED', { infer: true }),
  });

  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
