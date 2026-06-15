import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Workbook, type Borders, type Fill } from 'exceljs';
import * as nodemailer from 'nodemailer';
import { CartMailDto } from './dto/cart-mail.dto';
import { ContactMailDto } from './dto/contact-mail.dto';

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

    const CREAM: Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5EDD8' },
    };
    const DARK: Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3F3F3F' },
    };
    const WHITE: Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFFFF' },
    };
    const BORDER: Partial<Borders> = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };

    // A=margen izq, B=descripción, C=cantidad, D=precio, E=total, F=margen der
    sheet.columns = [
      { width: 3 },
      { width: 36 },
      { width: 12 },
      { width: 14 },
      { width: 14 },
      { width: 3 },
    ];

    // Fondo crema dinámico: 17 (inicio items) + items reales + ~12 filas para totales/footer
    const MIN_ITEM_ROWS = 7;
    const fillRows = 17 + Math.max(dto.items.length, MIN_ITEM_ROWS) + 12;
    for (let r = 1; r <= fillRows; r++) {
      for (let c = 1; c <= 6; c++) {
        sheet.getCell(r, c).fill = CREAM;
      }
    }

    // --- ENCABEZADO ---
    sheet.getRow(1).height = 25;
    sheet.getRow(2).height = 26;
    sheet.getRow(3).height = 22;

    // B1 con fondo oscuro (extiende visualmente el logo hacia arriba)
    sheet.getCell('B1').fill = DARK;

    const logoTop = sheet.getCell('B2');
    logoTop.value = 'BAJA VALLE';
    logoTop.font = {
      name: 'Century Gothic',
      bold: true,
      size: 20,
      color: { argb: 'FFFFFFFF' },
    };
    logoTop.fill = DARK;
    logoTop.alignment = { vertical: 'middle' };

    const logoBottom = sheet.getCell('B3');
    logoBottom.value = 'TODO PARA VIÑEDOS';
    logoBottom.font = {
      name: 'Century Gothic',
      size: 17,
      color: { argb: 'FFFFFFFF' },
    };
    logoBottom.fill = DARK;
    logoBottom.alignment = { vertical: 'middle' };

    const titleCell = sheet.getCell('E2');
    titleCell.value = 'COTIZACIÓN';
    titleCell.font = { name: 'Rockwell', bold: true, size: 25 };
    titleCell.alignment = { vertical: 'middle', horizontal: 'right' };

    // --- DATOS DE CONTACTO Y COTIZACIÓN ---
    const date = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const ROCKWELL_BOLD_10 = { name: 'Rockwell', bold: true, size: 10 };

    sheet.getCell('B5').value = 'AVE RUIZ 460 ZC';
    sheet.getCell('B5').font = ROCKWELL_BOLD_10;
    sheet.getCell('B6').value = 'ENSENADA BC MEXICO';
    sheet.getCell('B6').font = ROCKWELL_BOLD_10;
    sheet.getCell('B7').value = '331-280-8522';
    sheet.getCell('B7').font = ROCKWELL_BOLD_10;

    sheet.mergeCells('D5:E5');
    sheet.mergeCells('D6:E6');
    sheet.mergeCells('D7:E7');

    const infoRows: [string, string][] = [
      ['D5', `FECHA   ${date}`],
      ['D6', `NUMERO   ${folio}`],
      ['D7', `EMPRESA   ${dto.nombre} ${dto.apellido}`],
    ];
    infoRows.forEach(([addr, value]) => {
      const cell = sheet.getCell(addr);
      cell.value = value;
      cell.font = ROCKWELL_BOLD_10;
    });

    // --- ENCABEZADO DE TABLA ---
    sheet.getRow(16).height = 20;
    const tableHeaders: [string, string, string][] = [
      ['B', 'DESCRIPCIÓN', 'left'],
      ['C', 'CANTIDAD', 'center'],
      ['D', 'PRECIO', 'center'],
      ['E', 'TOTAL', 'right'],
    ];
    tableHeaders.forEach(([col, label, align]) => {
      const cell = sheet.getCell(`${col}16`);
      cell.value = label;
      cell.font = {
        name: 'Century Gothic',
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.fill = DARK;
      cell.alignment = {
        horizontal: align as 'left' | 'center' | 'right',
        vertical: 'middle',
      };
      cell.border = BORDER;
    });

    // --- ITEMS ---
    const ROCKWELL_10 = { name: 'Rockwell', size: 10 };
    let subtotal = 0;
    let currentRow = 17;

    dto.items.forEach((item, index) => {
      const rowTotal = item.cantidad * item.precio;
      subtotal += rowTotal;
      const fill = index % 2 === 0 ? WHITE : CREAM;

      sheet.getRow(currentRow).height = 18;
      ['B', 'C', 'D', 'E'].forEach((col) => {
        sheet.getCell(`${col}${currentRow}`).fill = fill;
        sheet.getCell(`${col}${currentRow}`).border = BORDER;
      });

      sheet.getCell(`B${currentRow}`).value = item.nombre;
      sheet.getCell(`B${currentRow}`).font = ROCKWELL_10;
      sheet.getCell(`C${currentRow}`).value = item.cantidad;
      sheet.getCell(`C${currentRow}`).font = ROCKWELL_10;
      sheet.getCell(`C${currentRow}`).alignment = { horizontal: 'center' };
      sheet.getCell(`D${currentRow}`).value = item.precio;
      sheet.getCell(`D${currentRow}`).font = ROCKWELL_10;
      sheet.getCell(`D${currentRow}`).numFmt = CURRENCY_FORMAT;
      sheet.getCell(`D${currentRow}`).alignment = { horizontal: 'right' };
      sheet.getCell(`E${currentRow}`).value = rowTotal;
      sheet.getCell(`E${currentRow}`).font = ROCKWELL_10;
      sheet.getCell(`E${currentRow}`).numFmt = CURRENCY_FORMAT;
      sheet.getCell(`E${currentRow}`).alignment = { horizontal: 'right' };

      currentRow++;
    });

    // Filas vacías hasta un mínimo de 7 para mantener la estructura visual
    for (let i = dto.items.length; i < MIN_ITEM_ROWS; i++) {
      const fill = i % 2 === 0 ? WHITE : CREAM;
      sheet.getRow(currentRow).height = 18;
      ['B', 'C', 'D', 'E'].forEach((col) => {
        sheet.getCell(`${col}${currentRow}`).fill = fill;
        sheet.getCell(`${col}${currentRow}`).border = BORDER;
      });
      currentRow++;
    }

    currentRow++; // espacio antes de totales

    // --- TOTALES ---
    sheet.getCell(`D${currentRow}`).value = 'SUBTOTAL';
    sheet.getCell(`D${currentRow}`).font = { name: 'Rockwell', bold: true };
    sheet.getCell(`D${currentRow}`).alignment = { horizontal: 'right' };
    sheet.getCell(`E${currentRow}`).value = subtotal;
    sheet.getCell(`E${currentRow}`).font = { name: 'Rockwell', bold: true };
    sheet.getCell(`E${currentRow}`).numFmt = CURRENCY_FORMAT;
    sheet.getCell(`E${currentRow}`).alignment = { horizontal: 'right' };
    sheet.getCell(`E${currentRow}`).border = {
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
    };
    currentRow++;

    sheet.getCell(`D${currentRow}`).value = 'IVA';
    sheet.getCell(`D${currentRow}`).font = { name: 'Rockwell', bold: true };
    sheet.getCell(`D${currentRow}`).alignment = { horizontal: 'right' };
    sheet.getCell(`E${currentRow}`).border = {
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
    };
    currentRow += 2;

    sheet.getRow(currentRow).height = 22;
    ['D', 'E'].forEach((col) => {
      const cell = sheet.getCell(`${col}${currentRow}`);
      cell.fill = DARK;
      cell.font = {
        name: 'Century Gothic',
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    });
    sheet.getCell(`D${currentRow}`).value = 'TOTAL';
    sheet.getCell(`E${currentRow}`).value = subtotal;
    sheet.getCell(`E${currentRow}`).numFmt = CURRENCY_FORMAT;
    currentRow += 4;

    // --- FOOTER ---
    sheet.mergeCells(`B${currentRow}:E${currentRow}`);
    const footer = sheet.getCell(`B${currentRow}`);
    footer.value = 'GRACIAS POR HACER NEGOCIO CON NOSOTROS!';
    footer.font = { name: 'Rockwell', bold: true, size: 10 };
    footer.alignment = { horizontal: 'center' };

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
