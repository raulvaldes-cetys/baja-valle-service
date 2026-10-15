import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PASSWORD_MAX, PASSWORD_MIN, trim } from './auth.dto';

export class UpdateProfileDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName?: string;
}

export class CurrentPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX)
  currentPassword: string;
}

export class ChangeEmailDto extends CurrentPasswordDto {
  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  newEmail: string;
}

export class ChangePasswordDto extends CurrentPasswordDto {
  @IsString()
  @MinLength(PASSWORD_MIN)
  @MaxLength(PASSWORD_MAX)
  newPassword: string;
}
