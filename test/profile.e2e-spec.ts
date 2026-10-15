import { Logger } from '@nestjs/common';
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

const EMAIL = 'ana.garcia@ejemplo.com';
const PASSWORD = `Cosecha-${randomBytes(6).toString('hex')}`;
const NEW_PASSWORD = `Vendimia-${randomBytes(6).toString('hex')}`;
const WRONG_PASSWORD = `${PASSWORD}-incorrecta`;

interface AuthBody {
  accessToken: string;
  refreshToken: string;
  user: { id: string };
}

describe('Profile /users/me (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let session: AuthBody;

  const http = () => request(app.getHttpServer());
  const bearer = (token = session.accessToken) => ({
    Authorization: `Bearer ${token}`,
  });
  const login = (email = EMAIL, password = PASSWORD) =>
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

    session = (
      await http()
        .post('/auth/register')
        .send({
          firstName: 'Ana',
          lastName: 'García',
          email: EMAIL,
          password: PASSWORD,
        })
        .expect(201)
    ).body as AuthBody;
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  it('returns the decrypted profile of the authenticated user', async () => {
    const res = await http().get('/users/me').set(bearer()).expect(200);

    expect(res.body).toMatchObject({
      id: session.user.id,
      email: EMAIL,
      firstName: 'Ana',
      lastName: 'García',
      role: 'CLIENT',
    });
  });

  it('updates the name', async () => {
    const res = await http()
      .patch('/users/me')
      .set(bearer())
      .send({ firstName: 'Ana Sofía' })
      .expect(200);

    expect(res.body).toMatchObject({
      firstName: 'Ana Sofía',
      lastName: 'García',
    });
  });

  it('rejects an empty update and fields outside the profile', async () => {
    await http().patch('/users/me').set(bearer()).send({}).expect(400);
    await http()
      .patch('/users/me')
      .set(bearer())
      .send({ role: 'ADMIN' })
      .expect(400);
  });

  describe('email', () => {
    it('requires the current password', async () => {
      await http()
        .patch('/users/me/email')
        .set(bearer())
        .send({ newEmail: 'ana@nuevo.com', currentPassword: WRONG_PASSWORD })
        .expect(401);
    });

    it('changes the login email', async () => {
      await http()
        .patch('/users/me/email')
        .set(bearer())
        .send({ newEmail: 'Ana@Nuevo.com', currentPassword: PASSWORD })
        .expect(200);

      await login().expect(401);
      await login('ana@nuevo.com').expect(200);
    });

    it('rejects an email that belongs to another account', async () => {
      await http()
        .post('/auth/register')
        .send({
          firstName: 'Luis',
          lastName: 'Pérez',
          email: 'luis@ejemplo.com',
          password: 'Barrica-Roble-Frances',
        })
        .expect(201);

      await http()
        .patch('/users/me/email')
        .set(bearer())
        .send({ newEmail: 'luis@ejemplo.com', currentPassword: PASSWORD })
        .expect(409);
    });
  });

  describe('password', () => {
    it('requires the current password', async () => {
      await http()
        .patch('/users/me/password')
        .set(bearer())
        .send({ currentPassword: WRONG_PASSWORD, newPassword: NEW_PASSWORD })
        .expect(401);
    });

    it('changes the password and ends every other session', async () => {
      const other = (await login().expect(200)).body as AuthBody;

      await http()
        .patch('/users/me/password')
        .set(bearer())
        .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD })
        .expect(204);

      await http().get('/users/me').set(bearer()).expect(200);
      await http().get('/users/me').set(bearer(other.accessToken)).expect(401);
      await http()
        .post('/auth/refresh')
        .send({ refreshToken: other.refreshToken })
        .expect(401);
      await login().expect(401);
      await login(EMAIL, NEW_PASSWORD).expect(200);
    });

    it('applies the password policy to the new password', async () => {
      await http()
        .patch('/users/me/password')
        .set(bearer())
        .send({ currentPassword: PASSWORD, newPassword: 'Password123' })
        .expect(400);
    });
  });

  describe('delete', () => {
    it('requires the current password', async () => {
      await http()
        .delete('/users/me')
        .set(bearer())
        .send({ currentPassword: WRONG_PASSWORD })
        .expect(401);
    });

    it('deletes the account and its sessions', async () => {
      await http()
        .delete('/users/me')
        .set(bearer())
        .send({ currentPassword: PASSWORD })
        .expect(204);

      await http().get('/users/me').set(bearer()).expect(401);
      await login().expect(401);
      expect(
        await prisma.session.count({ where: { userId: session.user.id } }),
      ).toBe(0);
    });
  });
});
