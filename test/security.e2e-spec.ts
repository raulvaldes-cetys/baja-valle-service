import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/setup-app';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({ sendMail: jest.fn() }),
}));

const ALLOWED_ORIGIN = 'http://localhost:4321';

describe('HTTP security controls (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApp(app, {
      NODE_ENV: 'test',
      CORS_ORIGINS: [ALLOWED_ORIGIN],
      SWAGGER_ENABLED: false,
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('sets security headers and hides the framework', async () => {
    const res = await request(app.getHttpServer()).get('/').expect(200);

    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  it('allows CORS only for configured origins', async () => {
    const allowed = await request(app.getHttpServer())
      .get('/')
      .set('Origin', ALLOWED_ORIGIN);
    expect(allowed.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);

    const blocked = await request(app.getHttpServer())
      .get('/')
      .set('Origin', 'https://evil.example.com');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rejects request bodies larger than the limit with 413', async () => {
    await request(app.getHttpServer())
      .post('/mail/contact')
      .send({ mensaje: 'x'.repeat(200 * 1024) })
      .expect(413);
  });
});
