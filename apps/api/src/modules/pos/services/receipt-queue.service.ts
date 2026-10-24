import { Injectable, Logger } from '@nestjs/common';
import { Sale } from '../entities/sale.entity';
import { EscPosReceiptData } from '@pharmacy/shared';

export interface DigitalReceiptDispatchJob {
  saleId: string;
  invoiceNumber: string;
  customerPhone?: string;
  customerEmail?: string;
  grandTotalLkr: number;
  pdfOrTextUrl?: string;
  receiptSummary: string;
}

@Injectable()
export class ReceiptQueueService {
  private readonly logger = new Logger(ReceiptQueueService.name);

  /**
   * Dispatches receipt via background BullMQ / sandbox worker.
   * Sends WhatsApp and SMS digital receipts without delaying terminal checkout.
   */
  async dispatchDigitalReceipt(sale: Sale, receiptData: EscPosReceiptData): Promise<void> {
    const customerPhone = sale.customer?.phone;
    const customerEmail = sale.customer?.email;

    if (!customerPhone && !customerEmail) {
      this.logger.debug(
        `Walk-in patient sale ${sale.invoiceNumber}: skipping digital WhatsApp/SMS dispatch`,
      );
      return;
    }

    const jobData: DigitalReceiptDispatchJob = {
      saleId: sale.id,
      invoiceNumber: sale.invoiceNumber,
      customerPhone: customerPhone || undefined,
      customerEmail: customerEmail || undefined,
      grandTotalLkr: Number(sale.grandTotalLkr),
      receiptSummary: `Apex Pharmacy Invoice ${sale.invoiceNumber}: Total Rs. ${sale.grandTotalLkr}. Thank you!`,
    };

    // Sandbox / Mock BullMQ worker handling
    this.logger.log(
      `[DigitalReceiptWorker:MOCK] Queued digital receipt for ${sale.invoiceNumber} -> Phone: ${customerPhone || 'N/A'}, Email: ${customerEmail || 'N/A'}`,
    );
  }
}
