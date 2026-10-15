import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const USER_AGENT_MAX = 255;

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('base64url');

@Injectable()
export class SessionsService {
  private readonly logger = new Logger('Auth');
  private readonly ttlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.ttlMs = config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }) * DAY_MS;
  }

  async create(
    userId: string,
    userAgent?: string,
    familyId: string = randomUUID(),
  ) {
    const refreshToken = randomBytes(32).toString('base64url');
    const session = await this.prisma.session.create({
      data: {
        userId,
        familyId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + this.ttlMs),
        userAgent: userAgent?.slice(0, USER_AGENT_MAX),
      },
    });
    return { session, refreshToken };
  }

  async rotate(refreshToken: string, userAgent?: string) {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: { select: { id: true, role: true } } },
    });

    if (!session || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }

    // Un refresh token ya usado indica que pudo ser robado: se cierra toda la familia
    const claimed = await this.prisma.session.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (claimed.count !== 1) {
      await this.revokeFamily(session.familyId);
      this.logger.warn(
        `Reutilización de refresh token: familia ${session.familyId} revocada (usuario ${session.userId})`,
      );
      throw new UnauthorizedException('Sesión inválida o expirada');
    }

    const next = await this.create(session.userId, userAgent, session.familyId);
    return { ...next, user: session.user };
  }

  findActive(sessionId: string) {
    return this.prisma.session.findFirst({
      where: { id: sessionId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { userId: true, user: { select: { role: true } } },
    });
  }

  async revoke(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string, exceptSessionId?: string) {
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId && { id: { not: exceptSessionId } }),
      },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
