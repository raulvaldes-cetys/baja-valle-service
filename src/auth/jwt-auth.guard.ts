import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC } from './auth.decorators';
import { AccessTokenPayload, AuthenticatedRequest } from './auth.types';
import { SessionsService } from './sessions.service';

const BEARER = /^Bearer ([\w-]+\.[\w-]+\.[\w-]+)$/;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly sessions: SessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = req.headers.authorization;

    if (!header) {
      if (isPublic) {
        return true;
      }
      throw new UnauthorizedException('Se requiere iniciar sesión');
    }

    // Un token inválido nunca se degrada a invitado, ni en rutas públicas
    const token = BEARER.exec(header)?.[1];
    const payload = token && (await this.verify(token));
    const session = payload && (await this.sessions.findActive(payload.sid));

    if (!payload || !session || session.userId !== payload.sub) {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }

    req.user = {
      id: payload.sub,
      role: session.user.role,
      sessionId: payload.sid,
    };
    return true;
  }

  private async verify(token: string): Promise<AccessTokenPayload | undefined> {
    try {
      return await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      return undefined;
    }
  }
}
