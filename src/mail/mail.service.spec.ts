import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Workbook } from 'exceljs';
import * as nodemailer from 'nodemailer';
import { mockCartMailDto, mockContactMailDto } from './__mocks__/mail.mock';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn(),
  }),
}));

describe('MailService', () => {
  let service: MailService;
  let sendMailMock: jest.Mock<unknown, [Record<string, unknown>]>;

  beforeEach(async () => {
    sendMailMock = jest.fn<unknown, [Record<string, unknown>]>();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [MailService],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendContact', () => {
    it('should call sendMail with the correct fields', async () => {
      sendMailMock.mockResolvedValue({});

      await service.sendContact(mockContactMailDto);

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: process.env.MAIL_TO,
          replyTo: mockContactMailDto.correo,
          subject: expect.stringContaining(mockContactMailDto.nombre) as string,
        }),
      );
    });

    it('should throw InternalServerErrorException when sendMail fails', async () => {
      sendMailMock.mockRejectedValue(new Error('SMTP error'));

      await expect(service.sendContact(mockContactMailDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('sendCart', () => {
    it('should call sendMail with the correct fields and an xlsx attachment', async () => {
      sendMailMock.mockResolvedValue({});

      await service.sendCart(mockCartMailDto);

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const call = sendMailMock.mock.calls[0][0] as {
        to: string;
        replyTo: string;
        subject: string;
        attachments: {
          filename: string;
          contentType: string;
          content: Buffer;
        }[];
      };

      expect(call).toEqual(
        expect.objectContaining({
          to: process.env.MAIL_TO,
          replyTo: mockCartMailDto.correo,
          subject: expect.stringContaining(mockCartMailDto.nombre) as string,
        }),
      );
      expect(call.attachments).toHaveLength(1);
      expect(call.attachments[0]).toEqual(
        expect.objectContaining({
          filename: expect.stringMatching(/^COT-[\dA-Z]+\.xlsx$/) as string,
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          content: expect.any(Buffer) as Buffer,
        }),
      );
    });

    it('should generate a workbook with the cart items and the computed total', async () => {
      sendMailMock.mockResolvedValue({});

      await service.sendCart(mockCartMailDto);

      const call = sendMailMock.mock.calls[0][0] as {
        attachments: { content: Buffer }[];
      };
      const { content } = call.attachments[0];

      const workbook = new Workbook();
      await workbook.xlsx.load(
        content as unknown as Parameters<typeof workbook.xlsx.load>[0],
      );
      const sheet = workbook.getWorksheet('Cotización');
      const values = sheet?.getSheetValues().flat();

      for (const item of mockCartMailDto.items) {
        expect(values).toContain(item.nombre);
      }

      const expectedTotal = mockCartMailDto.items.reduce(
        (sum, item) => sum + item.cantidad * item.precio,
        0,
      );
      expect(values).toContain(expectedTotal);
    });

    it('should throw InternalServerErrorException when sendMail fails', async () => {
      sendMailMock.mockRejectedValue(new Error('SMTP error'));

      await expect(service.sendCart(mockCartMailDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
