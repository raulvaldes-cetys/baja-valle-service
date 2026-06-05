import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req: Request = context.switchToHttp().getRequest();
    const res: Response = context.switchToHttp().getResponse();
    const { method, url } = req;
    const start = Date.now();

    this.logger.log(`${method} ${url} - recibido`);

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        this.logger.log(`${method} ${url} - ${res.statusCode} (${ms}ms)`);
      }),
      catchError((err: unknown) => {
        const ms = Date.now() - start;
        const status = err instanceof HttpException ? err.getStatus() : 500;
        const reason = err instanceof Error ? err.message : 'Error desconocido';
        this.logger.error(`${method} ${url} - ${status} (${ms}ms) | ${reason}`);
        return throwError(() => err);
      }),
    );
  }
}
