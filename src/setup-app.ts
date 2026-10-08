import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { Env } from './config/env';

const BODY_LIMIT = '100kb';
const DOCS_PATH = 'docs';

type AppSecurityConfig = Pick<
  Env,
  'NODE_ENV' | 'CORS_ORIGINS' | 'SWAGGER_ENABLED'
>;

/**
 * Configuración HTTP compartida por main.ts y las pruebas e2e,
 * para que las pruebas ejerciten exactamente los mismos controles que producción.
 */
export function configureApp(
  app: NestExpressApplication,
  config: AppSecurityConfig,
): void {
  // Detrás del proxy de Railway / Azure Container Apps; necesario para la IP real del cliente
  app.set('trust proxy', 1);

  const apiHelmet = helmet();
  // Swagger UI necesita estilos y scripts inline
  const docsHelmet = helmet({
    contentSecurityPolicy: {
      directives: {
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'"],
      },
    },
  });
  app.use((req: Request, res: Response, next: NextFunction) =>
    req.path.startsWith(`/${DOCS_PATH}`)
      ? docsHelmet(req, res, next)
      : apiHelmet(req, res, next),
  );

  app.useBodyParser('json', { limit: BODY_LIMIT });
  app.useBodyParser('urlencoded', { extended: false, limit: BODY_LIMIT });

  // La app móvil no usa CORS; solo se permiten los orígenes web declarados
  app.enableCors({
    origin: config.CORS_ORIGINS.length > 0 ? config.CORS_ORIGINS : false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalInterceptors(new LoggingInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Opt-in: si una variable falta en el despliegue, la documentación de la API no queda expuesta
  if (config.SWAGGER_ENABLED) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Baja Valle API')
        .setVersion('1.0')
        .build(),
    );
    SwaggerModule.setup(DOCS_PATH, app, document);
  }
}
