import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Env } from '../config/env';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { ProfileController } from './profile.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const issuer = config.get('JWT_ISSUER', { infer: true });
        const audience = config.get('JWT_AUDIENCE', { infer: true });
        return {
          secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
          signOptions: {
            algorithm: 'HS256',
            expiresIn: config.get('JWT_ACCESS_TTL_SECONDS', { infer: true }),
            issuer,
            audience,
          },
          verifyOptions: { algorithms: ['HS256'], issuer, audience },
        };
      },
    }),
  ],
  controllers: [AuthController, ProfileController],
  providers: [AuthService, SessionsService, PasswordService],
  exports: [JwtModule, AuthService, SessionsService, PasswordService],
})
export class AuthModule {}
