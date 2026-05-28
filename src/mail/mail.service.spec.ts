import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
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
  let sendMailMock: jest.Mock;

  beforeEach(async () => {
    sendMailMock = jest.fn();
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
          subject: expect.stringContaining(mockContactMailDto.nombre),
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
    it('should call sendMail with the correct fields', async () => {
      sendMailMock.mockResolvedValue({});

      await service.sendCart(mockCartMailDto);

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: process.env.MAIL_TO,
          replyTo: mockCartMailDto.correo,
          subject: expect.stringContaining(mockCartMailDto.nombre),
        }),
      );
    });

    it('should throw InternalServerErrorException when sendMail fails', async () => {
      sendMailMock.mockRejectedValue(new Error('SMTP error'));

      await expect(service.sendCart(mockCartMailDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
