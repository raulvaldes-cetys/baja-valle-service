import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ContactMailDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  apellido: string;

  @IsEmail()
  correo: string;

  @IsString()
  @IsNotEmpty()
  mensaje: string;
}
