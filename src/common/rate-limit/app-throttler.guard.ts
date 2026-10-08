import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import {
  ThrottlerException,
  ThrottlerGuard,
  ThrottlerLimitDetail,
} from '@nestjs/throttler';
import { Request, Response } from 'express';

interface RequestWithUser extends Request {
  user?: { id?: string };
}

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  private readonly securityLogger = new Logger('RateLimit');

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId = (req as RequestWithUser).user?.id;
    return userId ? `user:${userId}` : `ip:${await super.getTracker(req)}`;
  }

  // El default de @nestjs/throttler cuenta por ruta; aquí el contador se comparte entre rutas
  protected generateKey(
    _context: ExecutionContext,
    tracker: string,
    throttlerName: string,
  ): string {
    return `${throttlerName}:${tracker}`;
  }

  protected throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    // El guard base solo manda Retry-After-<throttler>
    res.header('Retry-After', String(detail.timeToBlockExpire));

    this.securityLogger.warn(
      `429 ${req.method} ${req.path} tracker=${detail.tracker} ` +
        `limit=${detail.limit}/${detail.ttl / 1000}s retryAfter=${detail.timeToBlockExpire}s`,
    );

    return Promise.reject(
      new ThrottlerException(
        'Demasiadas solicitudes. Intenta de nuevo más tarde.',
      ),
    );
  }
}
