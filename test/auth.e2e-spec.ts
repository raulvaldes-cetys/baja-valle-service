import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/setup-app';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({ sendMail: jest.fn() }),
}));

const PASSWORD = `Cosecha-${randomBytes(6).toString('hex')}`;
const newUser = (overrides: Record<string, unknown> = {}) => ({
  firstName: 'Ana',
  lastName: 'García',
  email: 'Ana.Garcia@Ejemplo.com',
  password: PASSWORD,
  ...overrides,
});

interface AuthBody {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; role: string };
}

describe('Auth (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  const http = () => request(app.getHttpServer());
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  const register = async (overrides: Record<string, unknown> = {}) =>
    (await http().post('/auth/register').send(newUser(overrides)).expect(201))
      .body as AuthBody;

  const login = (email = 'ana.garcia@ejemplo.com', password = PASSWORD) =>
    http().post('/auth/login').send({ email, password });

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApp(app, {
      NODE_ENV: 'test',
      CORS_ORIGINS: [],
      SWAGGER_ENABLED: false,
    });
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  describe('register', () => {
    it('creates a CLIENT and stores personal data only encrypted', async () => {
      const body = await register();

      expect(body.user).toMatchObject({
        email: 'ana.garcia@ejemplo.com',
        firstName: 'Ana',
        lastName: 'García',
        role: 'CLIENT',
      });
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();

      const stored = await prisma.user.findUniqueOrThrow({
        where: { id: body.user.id },
      });
      const row = JSON.stringify(stored);
      expect(stored.emailEnc).toMatch(/^v1\./);
      expect(stored.firstNameEnc).toMatch(/^v1\./);
      expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
      expect(row).not.toContain('ana.garcia');
      expect(row).not.toContain('García');
      expect(row).not.toContain(PASSWORD);
    });

    it('rejects a role sent in the body', async () => {
      await http()
        .post('/auth/register')
        .send(newUser({ role: 'ADMIN' }))
        .expect(400);
    });

    it('rejects a duplicated email regardless of case and spaces', async () => {
      await register();

      await http()
        .post('/auth/register')
        .send(newUser({ email: '  ANA.GARCIA@ejemplo.com ' }))
        .expect(409);
    });

    it.each([
      ['too short', 'Corta-1'],
      ['common', 'Password123'],
      ['containing the email user', 'ana.garcia-2026!!'],
    ])('rejects a %s password', async (_label, password) => {
      await http()
        .post('/auth/register')
        .send(newUser({ password }))
        .expect(400);
    });
  });

  describe('login', () => {
    it('returns tokens with the right credentials', async () => {
      await register();

      const res = await login().expect(200);
      expect((res.body as AuthBody).user.role).toBe('CLIENT');
    });

    it('answers the same for a wrong password and an unknown email', async () => {
      await register();

      const wrongPassword = await login(undefined, 'otra-contraseña-123');
      const unknownEmail = await login('nadie@ejemplo.com');

      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(401);
      expect(wrongPassword.body).toEqual(unknownEmail.body);
    });

    it('locks the account after 5 failed attempts', async () => {
      const { user } = await register();

      for (let i = 0; i < 5; i++) {
        await login(undefined, 'otra-contraseña-123').expect(401);
      }
      await login().expect(401);

      const stored = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(stored.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('access token', () => {
    it('is required on protected routes', async () => {
      await http().get('/auth/me').expect(401);
    });

    it('grants access to protected routes', async () => {
      const { accessToken, user } = await register();

      const res = await http()
        .get('/auth/me')
        .set(bearer(accessToken))
        .expect(200);
      expect(res.body).toEqual({ id: user.id, role: 'CLIENT' });
    });

    it('rejects a token signed with another secret', async () => {
      const { user } = await register();
      const forged = await new JwtService({
        secret: Buffer.alloc(32, 9),
      }).signAsync({ sub: user.id, role: 'ADMIN', sid: 'x' });

      await http().get('/auth/me').set(bearer(forged)).expect(401);
    });

    it('rejects an expired token', async () => {
      const { user } = await register();
      const session = await prisma.session.findFirstOrThrow({
        where: { userId: user.id },
      });
      const expiring = await app
        .get(JwtService)
        .signAsync(
          { sub: user.id, role: 'CLIENT', sid: session.id },
          { expiresIn: 1 },
        );

      await new Promise((resolve) => setTimeout(resolve, 1100));

      await http().get('/auth/me').set(bearer(expiring)).expect(401);
    });

    it('never downgrades an invalid token to guest on public routes', async () => {
      await http().get('/products').expect(200);
      await http().get('/products').set(bearer('a.b.c')).expect(401);
    });
  });

  describe('refresh', () => {
    it('rotates the refresh token and closes the previous session', async () => {
      const first = await register();

      const res = await http()
        .post('/auth/refresh')
        .send({ refreshToken: first.refreshToken })
        .expect(200);
      const second = res.body as AuthBody;

      expect(second.refreshToken).not.toBe(first.refreshToken);
      await http().get('/auth/me').set(bearer(second.accessToken)).expect(200);
      await http().get('/auth/me').set(bearer(first.accessToken)).expect(401);
    });

    it('revokes the whole family when a used refresh token comes back', async () => {
      const first = await register();
      const second = (
        await http()
          .post('/auth/refresh')
          .send({ refreshToken: first.refreshToken })
          .expect(200)
      ).body as AuthBody;
      await prisma.session.updateMany({
        where: { revokedAt: { not: null } },
        data: { revokedAt: new Date(Date.now() - 60 * 1000) },
      });

      await http()
        .post('/auth/refresh')
        .send({ refreshToken: first.refreshToken })
        .expect(401);

      await http().get('/auth/me').set(bearer(second.accessToken)).expect(401);
      await http()
        .post('/auth/refresh')
        .send({ refreshToken: second.refreshToken })
        .expect(401);
    });

    it('keeps the session when two refreshes with the same token arrive together', async () => {
      const first = await register();

      const responses = await Promise.all([
        http().post('/auth/refresh').send({ refreshToken: first.refreshToken }),
        http().post('/auth/refresh').send({ refreshToken: first.refreshToken }),
      ]);

      const statuses = responses.map((res) => res.status).sort();
      expect(statuses).toEqual([200, 401]);
      const winner = responses.find((res) => res.status === 200)!
        .body as AuthBody;
      await http().get('/auth/me').set(bearer(winner.accessToken)).expect(200);
      await http()
        .post('/auth/refresh')
        .send({ refreshToken: winner.refreshToken })
        .expect(200);
    });

    it('rejects an unknown refresh token', async () => {
      await http()
        .post('/auth/refresh')
        .send({ refreshToken: 'no-existe' })
        .expect(401);
    });
  });

  describe('logout', () => {
    it('ends the current session immediately', async () => {
      const { accessToken, refreshToken } = await register();

      await http().post('/auth/logout').set(bearer(accessToken)).expect(204);

      await http().get('/auth/me').set(bearer(accessToken)).expect(401);
      await http().post('/auth/refresh').send({ refreshToken }).expect(401);
    });

    it('logout-all ends every session of the user', async () => {
      const first = await register();
      const second = (await login().expect(200)).body as AuthBody;

      await http()
        .post('/auth/logout-all')
        .set(bearer(second.accessToken))
        .expect(204);

      await http().get('/auth/me').set(bearer(first.accessToken)).expect(401);
      await http().get('/auth/me').set(bearer(second.accessToken)).expect(401);
    });
  });

  describe('roles', () => {
    const category = { name: 'Barricas' };

    it('forbids admin routes to a CLIENT', async () => {
      const { accessToken } = await register();

      await http()
        .post('/categories')
        .set(bearer(accessToken))
        .send(category)
        .expect(403);
    });

    it('requires a session for admin routes', async () => {
      await http().post('/categories').send(category).expect(401);
    });

    it('allows admin routes to an ADMIN', async () => {
      const { accessToken, user } = await register();
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
      });

      await http()
        .post('/categories')
        .set(bearer(accessToken))
        .send(category)
        .expect(201);
      await prisma.category.deleteMany({ where: { name: category.name } });
    });
  });
});
