import { CartMailDto } from '../dto/cart-mail.dto';
import { ContactMailDto } from '../dto/contact-mail.dto';

export const mockContactMailDto: ContactMailDto = {
  nombre: 'Juan',
  apellido: 'Pérez',
  correo: 'juan.perez@ejemplo.com',
  mensaje: 'Me gustaría obtener información sobre sus productos.',
};

export const mockCartMailDto: CartMailDto = {
  nombre: 'Ana',
  apellido: 'García',
  correo: 'ana.garcia@ejemplo.com',
  ubicacion: 'Tijuana, Baja California',
  items: [
    { nombre: 'Producto A', cantidad: 2, precio: 120 },
    { nombre: 'Producto B', cantidad: 1, precio: 350 },
  ],
};
