import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Patch,
} from '@nestjs/common';
import { RateLimit } from '../common/rate-limit/rate-limit.policies';
import { UsersService } from '../users/users.service';
import { CurrentUser } from './auth.decorators';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth.types';
import {
  ChangeEmailDto,
  ChangePasswordDto,
  CurrentPasswordDto,
  UpdateProfileDto,
} from './dto/profile.dto';
import { PasswordService } from './password.service';
import { SessionsService } from './sessions.service';

@Controller('users/me')
export class ProfileController {
  constructor(
    private readonly users: UsersService,
    private readonly auth: AuthService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionsService,
  ) {}

  @Get()
  async get(@CurrentUser() user: AuthUser) {
    const stored = await this.users.findById(user.id);
    if (!stored) {
      throw new NotFoundException();
    }
    return this.users.toProfile(stored);
  }

  @Patch()
  async update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    if (dto.firstName === undefined && dto.lastName === undefined) {
      throw new BadRequestException('Indica firstName o lastName');
    }
    return this.users.toProfile(await this.users.updateName(user.id, dto));
  }

  @RateLimit('profile')
  @Patch('email')
  async changeEmail(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangeEmailDto,
  ) {
    await this.auth.verifyCurrentPassword(user.id, dto.currentPassword);
    return this.users.toProfile(
      await this.users.updateEmail(user.id, dto.newEmail),
    );
  }

  @RateLimit('profile')
  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    const stored = await this.auth.verifyCurrentPassword(
      user.id,
      dto.currentPassword,
    );
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException(
        'La contraseña nueva debe ser distinta de la actual',
      );
    }
    this.passwords.assertAcceptable(
      dto.newPassword,
      this.users.toProfile(stored).email,
    );

    await this.users.updatePasswordHash(
      user.id,
      await this.passwords.hash(dto.newPassword),
    );
    await this.sessions.revokeAllForUser(user.id, user.sessionId);
  }

  @RateLimit('profile')
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser() user: AuthUser, @Body() dto: CurrentPasswordDto) {
    await this.auth.verifyCurrentPassword(user.id, dto.currentPassword);
    await this.users.delete(user.id);
  }
}
