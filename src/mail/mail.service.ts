import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { CartMailDto } from './dto/cart-mail.dto';
import { ContactMailDto } from './dto/contact-mail.dto';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: process.env.MAIL_SECURE === 'true',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  async sendContact(dto: ContactMailDto): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"${dto.nombre} ${dto.apellido}" <${process.env.MAIL_USER}>`,
        to: process.env.MAIL_TO,
        replyTo: dto.correo,
        subject: `Nuevo mensaje de contacto — ${dto.nombre} ${dto.apellido}`,
        html: this.buildContactHtml(dto),
      });
    } catch {
      throw new InternalServerErrorException(
        'No se pudo enviar el correo de contacto',
      );
    }
  }

  async sendCart(dto: CartMailDto): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"${dto.nombre} ${dto.apellido}" <${process.env.MAIL_USER}>`,
        to: process.env.MAIL_TO,
        replyTo: dto.correo,
        subject: `Nueva solicitud de cotización — ${dto.nombre} ${dto.apellido}`,
        html: this.buildCartHtml(dto),
      });
    } catch {
      throw new InternalServerErrorException(
        'No se pudo enviar el correo de cotización',
      );
    }
  }

  private buildContactHtml(dto: ContactMailDto): string {
    return `
      <h2>Nuevo mensaje de contacto</h2>
      <p><strong>Nombre:</strong> ${dto.nombre} ${dto.apellido}</p>
      <p><strong>Correo:</strong> ${dto.correo}</p>
      <hr />
      <p><strong>Mensaje:</strong></p>
      <p>${dto.mensaje}</p>
    `;
  }

  private buildCartHtml(dto: CartMailDto): string {
    const itemRows = dto.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 6px 12px; border: 1px solid #ddd;">${item.nombre}</td>
          <td style="padding: 6px 12px; border: 1px solid #ddd; text-align: center;">${item.cantidad}</td>
        </tr>`,
      )
      .join('');

    return `
      <h2>Nueva solicitud de cotización</h2>
      <p><strong>Nombre:</strong> ${dto.nombre} ${dto.apellido}</p>
      <p><strong>Correo:</strong> ${dto.correo}</p>
      <p><strong>Ubicación:</strong> ${dto.ubicacion}</p>
      <hr />
      <h3>Productos a cotizar</h3>
      <table style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th style="padding: 6px 12px; border: 1px solid #ddd; text-align: left;">Producto</th>
            <th style="padding: 6px 12px; border: 1px solid #ddd; text-align: center;">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
    `;
  }
}
