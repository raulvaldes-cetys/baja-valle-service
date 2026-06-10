import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CartItemDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsNumber()
  cantidad: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precio: number;
}

export class CartMailDto {
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
  ubicacion: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];
}
