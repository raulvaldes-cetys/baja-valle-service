import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import * as nodemailer from 'nodemailer';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  mockCartMailDto,
  mockContactMailDto,
} from '../src/mail/__mocks__/mail.mock';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/setup-app';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({ sendMail: jest.fn() }),
}));

const GLOBAL_PER_MINUTE = 100;
const FORM_PER_MINUTE = 3;

describe('Rate limiting (e2e)', () => {
  let app: NestExpressApplication;
  let warnSpy: jest.SpyInstance;

  beforeEach(async () => {
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({}),
    });
    warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApp(app, {
      NODE_ENV: 'test',
      CORS_ORIGINS: [],
      SWAGGER_ENABLED: false,
    });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    warnSpy.mockRestore();
  });

  const sendContact = (ip = '203.0.113.10') =>
    request(app.getHttpServer())
      .post('/mail/contact')
      .set('X-Forwarded-For', ip)
      .send(mockContactMailDto);

  const sendCart = (ip = '203.0.113.10') =>
    request(app.getHttpServer())
      .post('/mail/cart')
      .set('X-Forwarded-For', ip)
      .send(mockCartMailDto);

  it('blocks the form request above the per-minute limit with 429 and Retry-After', async () => {
    for (let i = 0; i < FORM_PER_MINUTE; i++) {
      await sendContact().expect(204);
    }

    const blocked = await sendContact().expect(429);

    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(blocked.body).toMatchObject({
      statusCode: 429,
      message: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
    });
  });

  it('logs every blocked request as a security warning without the body', async () => {
    for (let i = 0; i < FORM_PER_MINUTE; i++) {
      await sendContact();
    }
    await sendContact().expect(429);

    const messages = warnSpy.mock.calls.map(([message]) => String(message));
    const event = messages.find((message) => message.startsWith('429'));
    expect(event).toContain('POST /mail/contact');
    expect(event).toContain('tracker=ip:203.0.113.10');
    expect(event).not.toContain(mockContactMailDto.mensaje);
  });

  it('shares one counter between the quote and contact forms', async () => {
    await sendContact().expect(204);
    await sendCart().expect(204);
    await sendContact().expect(204);

    await sendCart().expect(429);
  });

  it('counts each client IP separately (behind the proxy)', async () => {
    for (let i = 0; i < FORM_PER_MINUTE; i++) {
      await sendContact('203.0.113.10');
    }
    await sendContact('203.0.113.10').expect(429);

    await sendContact('198.51.100.20').expect(204);
  });

  it('does not apply the form limit to other routes', async () => {
    for (let i = 0; i < FORM_PER_MINUTE + 2; i++) {
      await request(app.getHttpServer()).get('/').expect(200);
    }

    await sendContact().expect(204);
  });

  it('applies the global limit across all routes', async () => {
    const ip = '203.0.113.10';
    const getHome = () =>
      request(app.getHttpServer()).get('/').set('X-Forwarded-For', ip);

    for (let i = 0; i < GLOBAL_PER_MINUTE - 1; i++) {
      await getHome().expect(200);
    }
    await sendContact(ip).expect(204);

    const blocked = await getHome().expect(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });
});
