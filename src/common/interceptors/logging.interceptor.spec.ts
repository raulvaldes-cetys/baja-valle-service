import { BadRequestException, Logger } from '@nestjs/common';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

const makeMockContext = (method: string, url: string, statusCode = 200) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ method, url }),
      getResponse: () => ({ statusCode }),
    }),
  }) as unknown as ExecutionContext;

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('successful request', () => {
    it('should log request received and success response', (done) => {
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
      const context = makeMockContext('GET', '/products');
      const handler: CallHandler = { handle: () => of({ id: 1 }) };

      interceptor.intercept(context, handler).subscribe({
        complete: () => {
          expect(logSpy).toHaveBeenNthCalledWith(1, 'GET /products - recibido');
          expect(logSpy).toHaveBeenNthCalledWith(
            2,
            expect.stringMatching(/^GET \/products - 200 \(\d+ms\)$/),
          );
          done();
        },
      });
    });
  });

  describe('failed request', () => {
    it('should log the error status and message', (done) => {
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      jest.spyOn(Logger.prototype, 'log').mockImplementation();
      const context = makeMockContext('POST', '/products');
      const error = new BadRequestException('name should not be empty');
      const handler: CallHandler = {
        handle: () => throwError(() => error),
      };

      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(errorSpy).toHaveBeenCalledWith(
            expect.stringMatching(
              /^POST \/products - 400 \(\d+ms\) \| name should not be empty$/,
            ),
          );
          done();
        },
      });
    });

    it('should rethrow the original error after logging', (done) => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation();
      jest.spyOn(Logger.prototype, 'log').mockImplementation();
      const context = makeMockContext('DELETE', '/products/1');
      const error = new BadRequestException('campo requerido');
      const handler: CallHandler = {
        handle: () => throwError(() => error),
      };

      interceptor.intercept(context, handler).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });

    it('should default to status 500 when error has no status', (done) => {
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      jest.spyOn(Logger.prototype, 'log').mockImplementation();
      const context = makeMockContext('GET', '/categories');
      const error = new Error('fallo interno');
      const handler: CallHandler = {
        handle: () => throwError(() => error),
      };

      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(errorSpy).toHaveBeenCalledWith(
            expect.stringMatching(
              /^GET \/categories - 500 \(\d+ms\) \| fallo interno$/,
            ),
          );
          done();
        },
      });
    });
  });
});
