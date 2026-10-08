import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { RateLimit } from '../common/rate-limit/rate-limit.policies';
import { CartMailDto } from './dto/cart-mail.dto';
import { ContactMailDto } from './dto/contact-mail.dto';
import { MailService } from './mail.service';

@RateLimit('form')
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('contact')
  @HttpCode(HttpStatus.NO_CONTENT)
  sendContact(@Body() dto: ContactMailDto): Promise<void> {
    return this.mailService.sendContact(dto);
  }

  @Post('cart')
  @HttpCode(HttpStatus.NO_CONTENT)
  sendCart(@Body() dto: CartMailDto): Promise<void> {
    return this.mailService.sendCart(dto);
  }
}
