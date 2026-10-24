import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Supplier } from '../entities/supplier.entity';
import { GoodsReceivedNote } from '../entities/goods-received-note.entity';
import { SupplierPayment } from '../entities/supplier-payment.entity';
import { ProcurementSequenceService } from './sequence.service';
import { RecordSupplierPaymentInput, SupplierPaymentDto } from '@pharmacy/shared';

@Injectable()
export class SupplierPaymentService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly sequenceService: ProcurementSequenceService,
  ) {}

  async recordPayment(
    supplierId: string,
    input: RecordSupplierPaymentInput,
    userId: string,
  ): Promise<SupplierPaymentDto> {
    return this.dataSource.transaction(async (manager) => {
      const supplier = await manager.findOne(Supplier, {
        where: { id: supplierId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!supplier) {
        throw new NotFoundException(`Supplier with ID ${supplierId} not found`);
      }

      if (input.amountLkr <= 0) {
        throw new BadRequestException('Payment amount must be greater than 0');
      }

      const paymentNumber = await this.sequenceService.getNextPaymentNumber(manager);

      // Validate and process GRN allocations if provided
      if (input.grnAllocations && input.grnAllocations.length > 0) {
        const totalAllocated = input.grnAllocations.reduce((sum, a) => sum + a.amount, 0);
        if (Math.abs(totalAllocated - input.amountLkr) > 0.01) {
          throw new BadRequestException(
            `Total GRN allocated amount (Rs. ${totalAllocated}) does not match payment amount (Rs. ${input.amountLkr})`,
          );
        }

        for (const alloc of input.grnAllocations) {
          const grn = await manager.findOne(GoodsReceivedNote, {
            where: { id: alloc.grnId, supplierId },
            lock: { mode: 'pessimistic_write' },
          });

          if (!grn) {
            throw new NotFoundException(`GRN with ID ${alloc.grnId} for this supplier not found`);
          }

          const currentPaid = Number(grn.paidAmountLkr || 0);
          const grandTotal = Number(grn.grandTotalLkr || 0);
          const newPaid = Math.round((currentPaid + alloc.amount) * 100) / 100;

          if (newPaid > grandTotal + 0.01) {
            throw new BadRequestException(
              `Allocation of Rs. ${alloc.amount} exceeds unpaid balance on GRN ${grn.grnNumber} (Grand total: Rs. ${grandTotal}, Already paid: Rs. ${currentPaid})`,
            );
          }

          grn.paidAmountLkr = newPaid;
          grn.paymentStatus = newPaid >= grandTotal - 0.01 ? 'PAID' : 'PARTIALLY_PAID';
          await manager.save(GoodsReceivedNote, grn);
        }
      }

      // Decrement supplier outstanding payable
      const currentOutstanding = Number(supplier.outstandingPayableLkr || 0);
      supplier.outstandingPayableLkr = Math.max(
        0,
        Math.round((currentOutstanding - input.amountLkr) * 100) / 100,
      );
      supplier.updatedBy = userId;
      await manager.save(Supplier, supplier);

      const payment = manager.create(SupplierPayment, {
        paymentNumber,
        supplierId,
        paymentDate: new Date(),
        amountLkr: input.amountLkr,
        paymentMethod: input.paymentMethod,
        reference: input.reference,
        bankAccountId: input.bankAccountId || null,
        notes: input.notes || null,
        grnAllocationsJson: input.grnAllocations ? JSON.stringify(input.grnAllocations) : null,
        processedByUserId: userId,
        createdBy: userId,
      });

      const saved = await manager.save(SupplierPayment, payment);

      return {
        id: saved.id,
        paymentNumber: saved.paymentNumber,
        supplierId: saved.supplierId,
        supplierName: supplier.companyName,
        paymentDate: typeof saved.paymentDate === 'string' ? saved.paymentDate : saved.paymentDate.toISOString().slice(0, 10),
        amountLkr: Number(saved.amountLkr),
        paymentMethod: saved.paymentMethod,
        reference: saved.reference,
        bankAccountId: saved.bankAccountId,
        notes: saved.notes,
        grnAllocations: input.grnAllocations,
        createdAt: saved.createdAt.toISOString(),
      };
    });
  }
}
