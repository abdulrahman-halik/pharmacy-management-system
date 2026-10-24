import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { EmployeePayroll } from '../entities/employee-payroll.entity';
import { formatLKR } from '@pharmacy/shared';

export interface PharmacyDetails {
  name: string;
  address: string;
  phone: string;
  email: string;
}

@Injectable()
export class PayslipPdfService {
  private readonly logger = new Logger(PayslipPdfService.name);

  /**
   * Generates a branded, printable PDF payslip for an employee payroll record.
   * Returns a Buffer containing the complete PDF document.
   */
  async generatePayslipPdf(
    payroll: EmployeePayroll,
    pharmacyDetails: PharmacyDetails = {
      name: 'ASIRI CENTRAL PHARMACY & DISPENSARY',
      address: 'No. 114 Hospital Road, Colombo 00700, Sri Lanka',
      phone: '+94 11 234 5678',
      email: 'payroll@asiripharmacy.lk',
    },
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 40,
          info: {
            Title: `Payslip-${payroll.user?.fullName || 'Staff'}-${payroll.monthYear}`,
            Author: pharmacyDetails.name,
            Subject: `Salary Payslip for ${payroll.monthYear}`,
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        const primaryColor = '#1e3a8a'; // Deep clinical blue
        const darkTextColor = '#1f2937';
        const mutedTextColor = '#4b5563';
        const lightBg = '#f3f4f6';
        const borderLineColor = '#cbd5e1';

        // 1. Header & Pharmacy Branding
        doc
          .rect(40, 40, 515, 65)
          .fill(lightBg)
          .stroke(borderLineColor);

        doc
          .fillColor(primaryColor)
          .fontSize(16)
          .font('Helvetica-Bold')
          .text(pharmacyDetails.name, 50, 48, { align: 'center', width: 495 });

        doc
          .fillColor(mutedTextColor)
          .fontSize(9)
          .font('Helvetica')
          .text(
            `${pharmacyDetails.address} | Tel: ${pharmacyDetails.phone}`,
            50,
            70,
            { align: 'center', width: 495 },
          );

        doc
          .fillColor(primaryColor)
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(
            `CONFIDENTIAL SALARY PAYSLIP - ${payroll.monthYear}`,
            50,
            86,
            { align: 'center', width: 495 },
          );

        let y = 120;

        // 2. Employee & Disbursement Metadata Box
        doc
          .rect(40, y, 515, 65)
          .stroke(borderLineColor);

        doc.fillColor(darkTextColor).fontSize(9);

        // Col 1
        doc.font('Helvetica-Bold').text('Employee Name:', 50, y + 10);
        doc
          .font('Helvetica')
          .text(payroll.user?.fullName || 'N/A', 140, y + 10);

        doc.font('Helvetica-Bold').text('EPF Number:', 50, y + 26);
        doc.font('Helvetica').text(payroll.user?.epfNumber || 'N/A', 140, y + 26);

        doc.font('Helvetica-Bold').text('Designation:', 50, y + 42);
        doc
          .font('Helvetica')
          .text(payroll.user?.role || 'Staff Member', 140, y + 42);

        // Col 2
        doc.font('Helvetica-Bold').text('Payroll Month:', 310, y + 10);
        doc.font('Helvetica').text(payroll.monthYear, 400, y + 10);

        doc.font('Helvetica-Bold').text('Disbursement:', 310, y + 26);
        doc
          .font('Helvetica')
          .text(payroll.disbursementMethod || 'Direct Payout', 400, y + 26);

        doc.font('Helvetica-Bold').text('Bank Account:', 310, y + 42);
        const bankDisplay = payroll.user?.bankName
          ? `${payroll.user.bankName} (${payroll.user.bankAccountNumber || '...' + (payroll.user.bankAccountNumber?.slice(-4) || '')})`
          : 'Cash Payout';
        doc.font('Helvetica').text(bankDisplay, 400, y + 42, { width: 145 });

        y += 80;

        // 3. Earnings & Deductions Table Header
        const colWidth = 250;
        doc.rect(40, y, colWidth, 22).fill(lightBg).stroke(borderLineColor);
        doc
          .rect(40 + colWidth + 15, y, colWidth, 22)
          .fill(lightBg)
          .stroke(borderLineColor);

        doc
          .fillColor(primaryColor)
          .font('Helvetica-Bold')
          .fontSize(10)
          .text('EARNINGS (LKR)', 50, y + 6)
          .text('DEDUCTIONS (LKR)', 40 + colWidth + 25, y + 6);

        y += 28;

        // Table Rows
        const leftX = 50;
        const leftValX = 220;
        const rightX = 40 + colWidth + 25;
        const rightValX = 520;

        doc.fillColor(darkTextColor).font('Helvetica').fontSize(9);

        // Row 1: Basic vs EPF
        doc.text('Basic Salary:', leftX, y);
        doc.text(formatLKR(payroll.baseSalaryLkr), leftValX, y, {
          align: 'right',
          width: 60,
        });

        doc.text('EPF Employee (8%):', rightX, y);
        doc.text(formatLKR(payroll.statutoryDeductionsLkr), rightValX, y, {
          align: 'right',
          width: 60,
        });

        y += 18;

        // Row 2: Bonus vs Advance Recovery
        doc.text('Performance Bonus:', leftX, y);
        doc.text(formatLKR(payroll.bonusAllowanceLkr), leftValX, y, {
          align: 'right',
          width: 60,
        });

        doc.text('Salary Advance Recovery:', rightX, y);
        doc.text(formatLKR(payroll.advanceDeductedLkr), rightValX, y, {
          align: 'right',
          width: 60,
        });

        y += 18;

        // Row 3: Overtime vs Other Deductions
        doc.text('Overtime / Holiday Pay:', leftX, y);
        doc.text(formatLKR(payroll.overtimeLkr), leftValX, y, {
          align: 'right',
          width: 60,
        });

        doc.text('Other Deductions:', rightX, y);
        doc.text(formatLKR(payroll.otherDeductionsLkr), rightValX, y, {
          align: 'right',
          width: 60,
        });

        y += 24;

        // Totals divider
        doc
          .moveTo(40, y)
          .lineTo(40 + colWidth, y)
          .stroke(borderLineColor);
        doc
          .moveTo(40 + colWidth + 15, y)
          .lineTo(555, y)
          .stroke(borderLineColor);

        y += 8;

        // Gross Earnings vs Total Deductions
        const totalDeductions = Number(
          (
            Number(payroll.statutoryDeductionsLkr) +
            Number(payroll.advanceDeductedLkr) +
            Number(payroll.otherDeductionsLkr)
          ).toFixed(2),
        );

        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('Gross Earnings:', leftX, y);
        doc.text(formatLKR(payroll.grossEarningsLkr), leftValX, y, {
          align: 'right',
          width: 60,
        });

        doc.text('Total Deductions:', rightX, y);
        doc.text(formatLKR(totalDeductions), rightValX, y, {
          align: 'right',
          width: 60,
        });

        y += 30;

        // 4. Net Payable Box (Highlighted Banner)
        doc
          .rect(40, y, 515, 36)
          .fill(primaryColor);

        doc
          .fillColor('#ffffff')
          .font('Helvetica-Bold')
          .fontSize(12)
          .text('NET TAKE-HOME PAYABLE:', 55, y + 11);

        doc
          .fontSize(14)
          .text(formatLKR(payroll.netPayableLkr), 370, y + 10, {
            align: 'right',
            width: 170,
          });

        y += 50;

        // 5. Advance Balance & Carryforward Ledger Box
        doc
          .rect(40, y, 515, 50)
          .stroke(borderLineColor);

        doc
          .fillColor(primaryColor)
          .font('Helvetica-Bold')
          .fontSize(9)
          .text('ADVANCE RECOVERY & CARRYOVER STATUS', 50, y + 8);

        doc.fillColor(darkTextColor).font('Helvetica').fontSize(9);

        const advDeducted = Number(payroll.advanceDeductedLkr || 0);
        const advCarried = Number(payroll.advanceCarriedForwardLkr || 0);

        doc.text(
          `• Total Recovered This Month: ${formatLKR(advDeducted)}`,
          50,
          y + 24,
        );
        doc.text(
          `• Remaining Advance Carried Forward: ${formatLKR(advCarried)}`,
          300,
          y + 24,
        );

        const note =
          advCarried > 0
            ? 'Note: Remaining advance balance will be deducted in next month payroll (guaranteed net pay >= Rs. 0.00).'
            : 'All outstanding salary advances are cleared for this period.';
        doc.fillColor(mutedTextColor).fontSize(8).text(note, 50, y + 36);

        y += 65;

        // 6. Signatures and Statutory Notice
        doc
          .fontSize(8)
          .fillColor(mutedTextColor)
          .text(
            'This is a system-generated document compliant with Sri Lanka Shop & Office Employees Act regulations.',
            40,
            y,
            { align: 'center', width: 515 },
          );

        y += 45;

        doc
          .moveTo(60, y)
          .lineTo(200, y)
          .stroke(borderLineColor);
        doc
          .moveTo(355, y)
          .lineTo(495, y)
          .stroke(borderLineColor);

        doc
          .fontSize(8)
          .text('Authorized Signature (Employer)', 60, y + 6, {
            align: 'center',
            width: 140,
          })
          .text('Employee Acknowledgment', 355, y + 6, {
            align: 'center',
            width: 140,
          });

        doc.end();
      } catch (err) {
        this.logger.error('Failed to generate payslip PDF', err);
        reject(err);
      }
    });
  }
}
