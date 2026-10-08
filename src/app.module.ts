import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategoryModule } from './category/category.module';
import { AppThrottlerGuard } from './common/rate-limit/app-throttler.guard';
import { buildThrottlers } from './common/rate-limit/rate-limit.policies';
import { Env, validateEnv } from './config/env';
import { MailModule } from './mail/mail.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    // Contadores en memoria: no se comparten entre réplicas
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        throttlers: buildThrottlers({
          THROTTLE_GLOBAL_PER_MINUTE: config.get('THROTTLE_GLOBAL_PER_MINUTE'),
          THROTTLE_FORM_PER_MINUTE: config.get('THROTTLE_FORM_PER_MINUTE'),
          THROTTLE_FORM_PER_DAY: config.get('THROTTLE_FORM_PER_DAY'),
          THROTTLE_AUTH_PER_MINUTE: config.get('THROTTLE_AUTH_PER_MINUTE'),
          THROTTLE_REFRESH_PER_MINUTE: config.get(
            'THROTTLE_REFRESH_PER_MINUTE',
          ),
          THROTTLE_PROFILE_PER_15_MINUTES: config.get(
            'THROTTLE_PROFILE_PER_15_MINUTES',
          ),
        }),
      }),
    }),
    PrismaModule,
    ProductsModule,
    CategoryModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: AppThrottlerGuard }],
})
export class AppModule {}
