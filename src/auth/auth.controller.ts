import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { RateLimit } from '../common/rate-limit/rate-limit.policies';
import { CurrentUser, IgnoreAccessToken, Public } from './auth.decorators';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth.types';
import { LoginDto, RefreshDto, RegisterDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @RateLimit('auth')
  @Post('register')
  register(
    @Body() dto: RegisterDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.auth.register(dto, userAgent);
  }

  @Public()
  @RateLimit('auth')
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Headers('user-agent') userAgent?: string) {
    return this.auth.login(dto, userAgent);
  }

  @Public()
  @IgnoreAccessToken()
  @RateLimit('refresh')
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto, @Headers('user-agent') userAgent?: string) {
    return this.auth.refresh(dto.refreshToken, userAgent);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@CurrentUser() user: AuthUser) {
    return this.auth.logout(user);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  logoutAll(@CurrentUser() user: AuthUser) {
    return this.auth.logoutAll(user);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return { id: user.id, role: user.role };
  }
}
