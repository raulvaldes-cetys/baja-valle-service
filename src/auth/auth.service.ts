import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Env } from '../config/env';
import { Role } from '../generated/prisma/enums';
import { UserProfile, UsersService } from '../users/users.service';
import { AccessTokenPayload, AuthTokens, AuthUser } from './auth.types';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { PasswordService } from './password.service';
import { SessionsService } from './sessions.service';

const MAX_FAILED_LOGINS = 5;
const LOCK_MS = 15 * 60 * 1000;
const INVALID_CREDENTIALS = 'Credenciales inválidas';

export type AuthResponse = AuthTokens & { user: UserProfile };

@Injectable()
export class AuthService {
  private readonly logger = new Logger('Auth');
  private readonly accessTtlSeconds: number;

  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionsService,
    private readonly jwt: JwtService,
    config: ConfigService<Env, true>,
  ) {
    this.accessTtlSeconds = config.get('JWT_ACCESS_TTL_SECONDS', {
      infer: true,
    });
  }

  async register(dto: RegisterDto, userAgent?: string): Promise<AuthResponse> {
    this.passwords.assertAcceptable(dto.password, dto.email);

    const user = await this.users.create({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      passwordHash: await this.passwords.hash(dto.password),
    });

    return this.startSession(user, userAgent);
  }

  async login(dto: LoginDto, userAgent?: string): Promise<AuthResponse> {
    const user = await this.users.findByEmail(dto.email);

    if (!user) {
      await this.passwords.verifyAgainstDummy(dto.password);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.passwords.verifyAgainstDummy(dto.password);
      this.logger.warn(`Login sobre cuenta bloqueada: usuario ${user.id}`);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (!(await this.passwords.verify(user.passwordHash, dto.password))) {
      await this.registerFailedLogin(user.id);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.users.clearFailedLogins(user.id);
    }
    if (this.passwords.needsRehash(user.passwordHash)) {
      await this.users.updatePasswordHash(
        user.id,
        await this.passwords.hash(dto.password),
      );
    }

    return this.startSession(user, userAgent);
  }

  async refresh(refreshToken: string, userAgent?: string): Promise<AuthTokens> {
    const {
      session,
      refreshToken: next,
      user,
    } = await this.sessions.rotate(refreshToken, userAgent);
    return this.issueTokens(user.id, user.role, session.id, next);
  }

  logout(user: AuthUser): Promise<void> {
    return this.sessions.revoke(user.sessionId);
  }

  logoutAll(user: AuthUser): Promise<void> {
    return this.sessions.revokeAllForUser(user.id);
  }

  async verifyCurrentPassword(userId: string, password: string) {
    const user = await this.users.findById(userId);
    if (!user || !(await this.passwords.verify(user.passwordHash, password))) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }
    return user;
  }

  private async registerFailedLogin(userId: string): Promise<void> {
    const { failedLoginAttempts } = await this.users.recordFailedLogin(userId);

    if (failedLoginAttempts >= MAX_FAILED_LOGINS) {
      await this.users.lock(userId, new Date(Date.now() + LOCK_MS));
      this.logger.warn(
        `Cuenta bloqueada por ${MAX_FAILED_LOGINS} intentos fallidos: usuario ${userId}`,
      );
    } else {
      this.logger.warn(
        `Login fallido (${failedLoginAttempts}/${MAX_FAILED_LOGINS}): usuario ${userId}`,
      );
    }
  }

  private async startSession(
    user: Parameters<UsersService['toProfile']>[0],
    userAgent?: string,
  ): Promise<AuthResponse> {
    const { session, refreshToken } = await this.sessions.create(
      user.id,
      userAgent,
    );
    const tokens = await this.issueTokens(
      user.id,
      user.role,
      session.id,
      refreshToken,
    );
    return { ...tokens, user: this.users.toProfile(user) };
  }

  private async issueTokens(
    userId: string,
    role: Role,
    sessionId: string,
    refreshToken: string,
  ): Promise<AuthTokens> {
    const payload: AccessTokenPayload = { sub: userId, role, sid: sessionId };
    return {
      accessToken: await this.jwt.signAsync(payload),
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.accessTtlSeconds,
    };
  }
}
