import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as nodemailer from 'nodemailer';
import request from 'supertest';
import { App } from 'supertest/types';
import { mockCartMailDto, mockContactMailDto } from '../src/mail/__mocks__/mail.mock';
import { MailModule } from '../src/mail/mail.module';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({ sendMail: jest.fn() }),
}));

describe('MailController (e2e)', () => {
  let app: INestApplication<App>;
  let sendMailMock: jest.Mock;

  beforeAll(async () => {
    sendMailMock = jest.fn();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock,
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MailModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /mail/contact', () => {
    it('204 – sends contact email', async () => {
      sendMailMock.mockResolvedValue({});

      await request(app.getHttpServer())
        .post('/mail/contact')
        .send(mockContactMailDto)
        .expect(204);

      expect(sendMailMock).toHaveBeenCalledTimes(1);
    });

    it('400 – missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/mail/contact')
        .send({ nombre: 'Juan' })
        .expect(400);
    });

    it('400 – invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/mail/contact')
        .send({ ...mockContactMailDto, correo: 'no-es-un-email' })
        .expect(400);
    });
  });

  describe('POST /mail/cart', () => {
    it('204 – sends cart email', async () => {
      sendMailMock.mockResolvedValue({});

      await request(app.getHttpServer())
        .post('/mail/cart')
        .send(mockCartMailDto)
        .expect(204);

      expect(sendMailMock).toHaveBeenCalledTimes(1);
    });

    it('400 – missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/mail/cart')
        .send({ nombre: 'Ana' })
        .expect(400);
    });

    it('400 – items is not an array', async () => {
      await request(app.getHttpServer())
        .post('/mail/cart')
        .send({ ...mockCartMailDto, items: 'no-es-array' })
        .expect(400);
    });
  });
});
