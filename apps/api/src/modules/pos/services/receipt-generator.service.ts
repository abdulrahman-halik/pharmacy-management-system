import { Injectable } from '@nestjs/common';
import { Sale } from '../entities/sale.entity';
import { EscPosReceiptData, ReceiptPharmacyHeader, formatLKR } from '@pharmacy/shared';

@Injectable()
export class ReceiptGeneratorService {
  private defaultHeader: ReceiptPharmacyHeader = {
    storeName: 'APEX HEALTHCARE PHARMACY',
    branchName: 'Main Dispensary - Colombo 03',
    address: '142 Galle Road, Colombo 03, Sri Lanka',
    phone: '+94 11 258 9900',
    mobile: '+94 77 123 4567',
    nmraLicenseNo: 'NMRA/RET/COL/2026-0881',
    vatTinNo: 'TIN-10928374-7000',
    ssclNo: 'SSCL-2026-991',
  };

  /**
   * Generates formatted 80mm ESC/POS thermal text compliant with Sri Lankan NMRA mandates.
   * Prints itemized batch numbers and expiration dates (MM/YY) for all dispensed medicines.
   */
  generateReceipt(sale: Sale, headerOverride?: Partial<ReceiptPharmacyHeader>): EscPosReceiptData {
    const header: ReceiptPharmacyHeader = { ...this.defaultHeader, ...headerOverride };
    const LINE_WIDTH = 48;
    const divider = '='.repeat(LINE_WIDTH);
    const subDivider = '-'.repeat(LINE_WIDTH);

    const padCenter = (text: string) => {
      const padLen = Math.max(0, Math.floor((LINE_WIDTH - text.length) / 2));
      return ' '.repeat(padLen) + text;
    };

    const padTwoCol = (left: string, right: string) => {
      const spaceLen = Math.max(1, LINE_WIDTH - left.length - right.length);
      return left + ' '.repeat(spaceLen) + right;
    };

    const lines: string[] = [];
    lines.push(divider);
    lines.push(padCenter(header.storeName));
    lines.push(padCenter(header.branchName));
    lines.push(padCenter(header.address));
    lines.push(padCenter(`Tel: ${header.phone} | ${header.mobile || ''}`));
    lines.push(padCenter(`Pharmacy Reg: ${header.nmraLicenseNo}`));
    if (header.vatTinNo) lines.push(padCenter(`VAT/TIN: ${header.vatTinNo}`));
    lines.push(divider);

    const dateStr = sale.createdAt
      ? new Date(sale.createdAt).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })
      : new Date().toLocaleString('en-LK', { timeZone: 'Asia/Colombo' });

    lines.push(padTwoCol(`Invoice: ${sale.invoiceNumber}`, `Date: ${dateStr}`));
    const customerDisplay = sale.customer?.fullName || 'Walk-in Patient';
    lines.push(padTwoCol(`Cashier: ${sale.cashierUserId}`, `Customer: ${customerDisplay}`));
    lines.push(subDivider);
    lines.push('Item               Qty   Batch/Exp        Price');
    lines.push(subDivider);

    const itemReceipts: EscPosReceiptData['items'] = [];

    if (sale.items && sale.items.length > 0) {
      for (const item of sale.items) {
        const medName = item.medicine?.name || 'Medicine Item';
        lines.push(medName);

        // Allocations breakdown (Batch and Expiry)
        if (item.allocations && item.allocations.length > 0) {
          for (const alloc of item.allocations) {
            let expFormatted = 'N/A';
            if (alloc.expiryDate) {
              const expDate = new Date(alloc.expiryDate);
              const mm = String(expDate.getMonth() + 1).padStart(2, '0');
              const yy = String(expDate.getFullYear()).slice(-2);
              expFormatted = `${mm}/${yy}`;
            }

            const allocDetail = `  ${alloc.allocatedBaseUnits} Units (${alloc.batchNumber} - ${expFormatted})`;
            const priceStr = formatLKR(item.totalPriceLkr);
            lines.push(padTwoCol(allocDetail, priceStr));

            itemReceipts.push({
              medicineName: medName,
              packagingLevel: item.packagingLevel,
              quantity: item.quantitySold,
              baseUnits: alloc.allocatedBaseUnits,
              batchNumber: alloc.batchNumber,
              expiryDate: expFormatted,
              priceLkr: Number(item.totalPriceLkr),
            });
          }
        } else {
          const detail = `  ${item.quantitySold} ${item.packagingLevel}`;
          const priceStr = formatLKR(item.totalPriceLkr);
          lines.push(padTwoCol(detail, priceStr));

          itemReceipts.push({
            medicineName: medName,
            packagingLevel: item.packagingLevel,
            quantity: item.quantitySold,
            baseUnits: item.totalBaseUnits,
            batchNumber: 'N/A',
            expiryDate: 'N/A',
            priceLkr: Number(item.totalPriceLkr),
          });
        }
      }
    }

    lines.push(subDivider);
    lines.push(padTwoCol('Subtotal:', formatLKR(sale.subtotalLkr)));
    if (sale.discountLkr > 0) {
      lines.push(padTwoCol('Discount:', `-${formatLKR(sale.discountLkr)}`));
    }
    if (sale.taxVatLkr > 0) {
      lines.push(padTwoCol('VAT (18%):', formatLKR(sale.taxVatLkr)));
    }
    if (sale.taxSsclLkr > 0) {
      lines.push(padTwoCol('SSCL (2.5%):', formatLKR(sale.taxSsclLkr)));
    }
    if (sale.loyaltyRedeemedLkr > 0) {
      lines.push(padTwoCol('Loyalty Points Redeemed:', `-${formatLKR(sale.loyaltyRedeemedLkr)}`));
    }
    if (sale.roundOffLkr !== 0) {
      const sign = sale.roundOffLkr > 0 ? '+' : '';
      lines.push(padTwoCol('Cash Round Off:', `${sign}${formatLKR(sale.roundOffLkr)}`));
    }
    lines.push(subDivider);
    lines.push(padTwoCol('TOTAL DUE:', formatLKR(sale.grandTotalLkr)));
    lines.push(subDivider);

    lines.push('Payment Breakdown:');
    if (sale.splitPayments && sale.splitPayments.length > 0) {
      for (const sp of sale.splitPayments) {
        const refStr = sp.reference ? ` (${sp.reference})` : '';
        lines.push(padTwoCol(`  ${sp.method}${refStr}:`, formatLKR(sp.amount)));
      }
    }

    if (sale.changeGivenLkr > 0) {
      lines.push(padTwoCol('  CHANGE GIVEN:', formatLKR(sale.changeGivenLkr)));
    }

    lines.push(divider);
    lines.push(padCenter('Thank you! Wishing you a speedy recovery.'));
    lines.push(padCenter('NMRA Notice: Sold medicines cannot be returned.'));
    lines.push(divider);

    const rawEscPosText = lines.join('\n');

    return {
      header,
      invoiceNumber: sale.invoiceNumber,
      dateStr,
      cashierName: sale.cashierUserId,
      customerName: customerDisplay,
      items: itemReceipts,
      subtotalLkr: Number(sale.subtotalLkr),
      discountLkr: Number(sale.discountLkr),
      taxVatLkr: Number(sale.taxVatLkr),
      taxSsclLkr: Number(sale.taxSsclLkr),
      roundOffLkr: Number(sale.roundOffLkr),
      grandTotalLkr: Number(sale.grandTotalLkr),
      payments: (sale.splitPayments || []).map((p) => ({ method: p.method, amount: p.amount })),
      changeGivenLkr: Number(sale.changeGivenLkr),
      footerNotes: [
        'Thank you! Wishing you a speedy recovery.',
        'NMRA Notice: Sold medicines cannot be returned.',
      ],
      rawEscPosText,
    };
  }
}
