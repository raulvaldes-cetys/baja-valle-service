import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Workbook, type Borders, type Fill } from 'exceljs';
import * as nodemailer from 'nodemailer';
import { CartMailDto } from './dto/cart-mail.dto';
import { ContactMailDto } from './dto/contact-mail.dto';

const HEADER_FILL: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF3F3F3F' },
};

const ACCENT_FILL: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF2EBD3' },
};

const THIN_BORDER: Partial<Borders> = {
  top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
  left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
  bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
  right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
};

const CURRENCY_FORMAT = '"$"#,##0.00';

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
      const folio = `COT-${Date.now().toString(36).toUpperCase()}`;
      const workbook = await this.buildCartWorkbook(dto, folio);

      await this.transporter.sendMail({
        from: `"${dto.nombre} ${dto.apellido}" <${process.env.MAIL_USER}>`,
        to: process.env.MAIL_TO,
        replyTo: dto.correo,
        subject: `Nueva solicitud de cotización — ${dto.nombre} ${dto.apellido}`,
        text: `Se recibió una nueva solicitud de cotización de ${dto.nombre} ${dto.apellido} (${dto.correo}, ${dto.ubicacion}). El detalle se encuentra en el archivo adjunto.`,
        attachments: [
          {
            filename: `${folio}.xlsx`,
            content: workbook,
            contentType:
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        ],
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

  private async buildCartWorkbook(
    dto: CartMailDto,
    folio: string,
  ): Promise<Buffer> {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Cotización');

    sheet.columns = [
      { width: 45 },
      { width: 12 },
      { width: 16 },
      { width: 16 },
    ];

    sheet.mergeCells('A1:B2');
    const company = sheet.getCell('A1');
    company.value = 'BAJA VALLE\nTodo para viñedos';
    company.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    company.alignment = { vertical: 'middle', wrapText: true };
    company.fill = HEADER_FILL;

    sheet.mergeCells('C1:D2');
    const title = sheet.getCell('C1');
    title.value = 'SOLICITUD DE COTIZACIÓN';
    title.font = { bold: true, size: 16 };
    title.alignment = { vertical: 'middle', horizontal: 'right' };

    sheet.addRow([]);

    const folioRow = sheet.addRow(['Folio', folio]);
    folioRow.getCell(1).font = { bold: true };

    const dateRow = sheet.addRow([
      'Fecha',
      new Date().toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    ]);
    dateRow.getCell(1).font = { bold: true };

    sheet.addRow([]);

    const clientHeaderRow = sheet.addRow(['Datos del cliente']);
    sheet.mergeCells(`A${clientHeaderRow.number}:D${clientHeaderRow.number}`);
    clientHeaderRow.getCell(1).font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    clientHeaderRow.getCell(1).fill = HEADER_FILL;

    const nameRow = sheet.addRow(['Nombre', `${dto.nombre} ${dto.apellido}`]);
    nameRow.getCell(1).font = { bold: true };

    const emailRow = sheet.addRow(['Correo', dto.correo]);
    emailRow.getCell(1).font = { bold: true };

    const locationRow = sheet.addRow(['Ubicación', dto.ubicacion]);
    locationRow.getCell(1).font = { bold: true };

    sheet.addRow([]);

    const tableHeaderRow = sheet.addRow([
      'Producto',
      'Cantidad',
      'Precio unitario',
      'Importe',
    ]);
    tableHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = HEADER_FILL;
      cell.alignment = { horizontal: 'center' };
      cell.border = THIN_BORDER;
    });

    let subtotal = 0;
    dto.items.forEach((item, index) => {
      const amount = item.cantidad * item.precio;
      subtotal += amount;

      const row = sheet.addRow([
        item.nombre,
        item.cantidad,
        item.precio,
        amount,
      ]);
      row.getCell(2).alignment = { horizontal: 'center' };
      row.getCell(3).numFmt = CURRENCY_FORMAT;
      row.getCell(4).numFmt = CURRENCY_FORMAT;
      row.eachCell((cell) => {
        cell.border = THIN_BORDER;
        if (index % 2 === 1) {
          cell.fill = ACCENT_FILL;
        }
      });
    });

    sheet.addRow([]);

    const subtotalRow = sheet.addRow(['', '', 'Subtotal', subtotal]);
    subtotalRow.getCell(3).font = { bold: true };
    subtotalRow.getCell(3).alignment = { horizontal: 'right' };
    subtotalRow.getCell(4).numFmt = CURRENCY_FORMAT;

    const totalRow = sheet.addRow(['', '', 'Total', subtotal]);
    totalRow.eachCell((cell, colNumber) => {
      if (colNumber < 3) return;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = HEADER_FILL;
    });
    totalRow.getCell(3).alignment = { horizontal: 'right' };
    totalRow.getCell(4).numFmt = CURRENCY_FORMAT;

    sheet.addRow([]);

    const noteRow = sheet.addRow([
      'Cotización generada automáticamente. Los precios son de referencia y están sujetos a confirmación.',
    ]);
    sheet.mergeCells(`A${noteRow.number}:D${noteRow.number}`);
    noteRow.getCell(1).font = {
      italic: true,
      size: 9,
      color: { argb: 'FF888888' },
    };

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
