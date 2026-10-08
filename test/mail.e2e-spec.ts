import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as nodemailer from 'nodemailer';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  mockCartMailDto,
  mockContactMailDto,
} from '../src/mail/__mocks__/mail.mock';
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

    it('400 – message longer than the limit', async () => {
      await request(app.getHttpServer())
        .post('/mail/contact')
        .send({ ...mockContactMailDto, mensaje: 'x'.repeat(2001) })
        .expect(400);
    });

    it('escapes HTML injected by the user in the email body', async () => {
      sendMailMock.mockResolvedValue({});

      await request(app.getHttpServer())
        .post('/mail/contact')
        .send({
          ...mockContactMailDto,
          nombre: '<b>Soporte</b>',
          mensaje: '<a href="https://phishing.example">Verifica tu cuenta</a>',
        })
        .expect(204);

      const { html, from } = sendMailMock.mock.calls[0][0] as {
        html: string;
        from: string;
      };
      expect(html).not.toContain('<a href');
      expect(html).toContain('&lt;a href=&quot;https://phishing.example&quot;');
      expect(html).toContain('&lt;b&gt;Soporte&lt;/b&gt;');
      expect(from).not.toContain('Soporte');
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

    it.each([
      ['negative quantity', { cantidad: -1 }],
      ['fractional quantity', { cantidad: 1.5 }],
      ['zero price', { precio: 0 }],
    ])('400 – item with %s', async (_label, override) => {
      await request(app.getHttpServer())
        .post('/mail/cart')
        .send({
          ...mockCartMailDto,
          items: [{ ...mockCartMailDto.items[0], ...override }],
        })
        .expect(400);
    });

    it('400 – empty cart', async () => {
      await request(app.getHttpServer())
        .post('/mail/cart')
        .send({ ...mockCartMailDto, items: [] })
        .expect(400);
    });

    it('400 – more items than the limit', async () => {
      await request(app.getHttpServer())
        .post('/mail/cart')
        .send({
          ...mockCartMailDto,
          items: Array.from({ length: 51 }, () => mockCartMailDto.items[0]),
        })
        .expect(400);
    });
  });
});
