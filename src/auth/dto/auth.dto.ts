import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

export class RegisterDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName: string;

  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(PASSWORD_MIN)
  @MaxLength(PASSWORD_MAX)
  password: string;
}

export class LoginDto {
  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX)
  password: string;
}

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  refreshToken: string;
}
