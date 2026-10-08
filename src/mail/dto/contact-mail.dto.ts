import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ContactMailDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  apellido: string;

  @IsEmail()
  @MaxLength(254)
  correo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  mensaje: string;
}
