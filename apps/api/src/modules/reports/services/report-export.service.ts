import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';

@Injectable()
export class ReportExportService {
  private readonly logger = new Logger(ReportExportService.name);

  /**
   * Converts an array of objects into standard RFC-4180 compliant CSV string.
   */
  generateCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
    const escapeCsvField = (val: string | number | boolean | null | undefined): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerLine = headers.map(escapeCsvField).join(',');
    const dataLines = rows.map((row) => row.map(escapeCsvField).join(','));
    return [headerLine, ...dataLines].join('\r\n');
  }

  /**
   * Generates a printable, branded PDF report with clinical styling.
   */
  async generateTablePdf(options: {
    title: string;
    subtitle?: string;
    headers: string[];
    rows: (string | number)[][];
    summaryText?: string;
    colWidths?: number[];
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 36,
          info: {
            Title: options.title,
            Author: 'Enterprise Pharmacy Management System',
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        const primaryColor = '#1e3a8a';
        const darkTextColor = '#1f2937';
        const mutedTextColor = '#4b5563';
        const headerBgColor = '#f1f5f9';
        const borderLineColor = '#cbd5e1';

        // Title Header
        doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold').text(options.title, 36, 36);
        if (options.subtitle) {
          doc.fillColor(mutedTextColor).fontSize(9).font('Helvetica').text(options.subtitle, 36, 56);
        }

        const timestamp = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Colombo' });
        doc.fillColor(mutedTextColor).fontSize(8).text(`Generated: ${timestamp} (Asia/Colombo)`, 36, 70);

        doc.moveTo(36, 82).lineTo(559, 82).strokeColor(borderLineColor).lineWidth(1).stroke();

        let currentY = 92;

        if (options.summaryText) {
          doc.fillColor(darkTextColor).fontSize(9).font('Helvetica-Bold').text(options.summaryText, 36, currentY);
          currentY += 18;
        }

        // Calculate column widths if not provided
        const numCols = options.headers.length;
        const availableWidth = 523; // 559 - 36
        const colWidths = options.colWidths || Array(numCols).fill(Math.floor(availableWidth / numCols));

        // Draw Table Header
        doc.rect(36, currentY, availableWidth, 20).fill(headerBgColor);
        doc.strokeColor(borderLineColor).lineWidth(0.5).rect(36, currentY, availableWidth, 20).stroke();

        let headerX = 38;
        doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold');
        for (let i = 0; i < numCols; i++) {
          const width = colWidths[i];
          doc.text(options.headers[i] || '', headerX, currentY + 5, {
            width: width - 4,
            ellipsis: true,
          });
          headerX += width;
        }

        currentY += 20;

        // Draw Rows
        doc.font('Helvetica').fontSize(8).fillColor(darkTextColor);
        for (let r = 0; r < options.rows.length; r++) {
          if (currentY > 750) {
            doc.addPage();
            currentY = 36;
          }

          const row = options.rows[r];
          if (r % 2 === 1) {
            doc.rect(36, currentY, availableWidth, 16).fill('#f8fafc');
          }

          let cellX = 38;
          doc.fillColor(darkTextColor);
          for (let c = 0; c < numCols; c++) {
            const width = colWidths[c];
            const text = String(row[c] ?? '');
            doc.text(text, cellX, currentY + 4, {
              width: width - 4,
              ellipsis: true,
            });
            cellX += width;
          }

          currentY += 16;
        }

        // Footer
        doc.fillColor(mutedTextColor).fontSize(7).text('Confidential - Pharmacy Regulatory & Operations Record', 36, 780, {
          align: 'center',
          width: availableWidth,
        });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
