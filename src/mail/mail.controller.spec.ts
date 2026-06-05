import { Test, TestingModule } from '@nestjs/testing';
import { mockCartMailDto, mockContactMailDto } from './__mocks__/mail.mock';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';

const mockMailService = {
  sendContact: jest.fn(),
  sendCart: jest.fn(),
};

describe('MailController', () => {
  let controller: MailController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MailController],
      providers: [{ provide: MailService, useValue: mockMailService }],
    }).compile();

    controller = module.get<MailController>(MailController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendContact', () => {
    it('should delegate to mailService.sendContact', async () => {
      mockMailService.sendContact.mockResolvedValue(undefined);

      await controller.sendContact(mockContactMailDto);

      expect(mockMailService.sendContact).toHaveBeenCalledWith(
        mockContactMailDto,
      );
      expect(mockMailService.sendContact).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendCart', () => {
    it('should delegate to mailService.sendCart', async () => {
      mockMailService.sendCart.mockResolvedValue(undefined);

      await controller.sendCart(mockCartMailDto);

      expect(mockMailService.sendCart).toHaveBeenCalledWith(mockCartMailDto);
      expect(mockMailService.sendCart).toHaveBeenCalledTimes(1);
    });
  });
});
