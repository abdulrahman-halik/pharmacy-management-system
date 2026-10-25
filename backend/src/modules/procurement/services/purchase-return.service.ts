import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PurchaseReturn } from '../entities/purchase-return.entity';
import { PurchaseReturnItem } from '../entities/purchase-return-item.entity';
import { Supplier } from '../entities/supplier.entity';
import { InventoryBatch } from '../../inventory/entities/inventory-batch.entity';
import { StockMovement } from '../../inventory/entities/stock-movement.entity';
import { ProcurementSequenceService } from './sequence.service';
import {
  CreatePurchaseReturnInput,
  PurchaseReturnDto,
} from '@pharmacy/shared';

@Injectable()
export class PurchaseReturnService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly sequenceService: ProcurementSequenceService,
  ) {}

  async processReturn(
    input: CreatePurchaseReturnInput,
    userId: string,
  ): Promise<PurchaseReturnDto> {
    return this.dataSource.transaction(async (manager) => {
      const supplier = await manager.findOne(Supplier, {
        where: { id: input.supplierId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!supplier) {
        throw new NotFoundException(`Supplier with ID ${input.supplierId} not found`);
      }

      const returnNumber = await this.sequenceService.getNextReturnNumber(manager);

      let totalRefundLkr = 0;
      const returnItems: PurchaseReturnItem[] = [];
      const stockMovements: StockMovement[] = [];

      for (const item of input.items) {
        const batch = await manager.findOne(InventoryBatch, {
          where: { id: item.batchId },
          relations: ['medicine'],
          lock: { mode: 'pessimistic_write' },
        });

        if (!batch) {
          throw new NotFoundException(`Inventory Batch with ID ${item.batchId} not found`);
        }

        if (batch.quantityBaseUnits < item.quantityBaseUnits) {
          throw new BadRequestException(
            `Insufficient stock to return from Batch ${batch.batchNumber}: requested ${item.quantityBaseUnits} base units, but only ${batch.quantityBaseUnits} available`,
          );
        }

        const unitCost = Number(batch.unitCostPrice);
        const lineTotal = Math.round(item.quantityBaseUnits * unitCost * 100) / 100;
        totalRefundLkr += lineTotal;

        // Decrement stock
        batch.quantityBaseUnits -= item.quantityBaseUnits;
        if (batch.quantityBaseUnits === 0) {
          batch.status = 'DEPLETED';
        }
        batch.updatedBy = userId;
        await manager.save(InventoryBatch, batch);

        const returnItem = manager.create(PurchaseReturnItem, {
          batchId: item.batchId,
          quantityBaseUnits: item.quantityBaseUnits,
          unitCostPrice: unitCost,
          lineTotalLkr: lineTotal,
          reason: item.reason || input.reason,
          createdBy: userId,
        });
        returnItems.push(returnItem);

        const movement = manager.create(StockMovement, {
          storeId: batch.storeId || 1,
          medicineId: batch.medicineId,
          batchId: batch.id,
          movementType: 'PURCHASE_RETURN',
          quantityBaseUnits: item.quantityBaseUnits,
          balanceAfter: batch.quantityBaseUnits,
          unitCostPrice: unitCost,
          referenceType: 'PURCHASE_RETURN',
          referenceId: returnNumber,
          reason: `Purchase return to supplier: ${item.reason || input.reason}`,
          userId,
          createdBy: userId,
        });
        stockMovements.push(movement);
      }

      await manager.save(StockMovement, stockMovements);

      totalRefundLkr = Math.round(totalRefundLkr * 100) / 100;

      // Debit supplier outstanding payable balance
      const currentPayable = Number(supplier.outstandingPayableLkr || 0);
      supplier.outstandingPayableLkr = Math.max(
        0,
        Math.round((currentPayable - totalRefundLkr) * 100) / 100,
      );
      supplier.updatedBy = userId;
      await manager.save(Supplier, supplier);

      const pr = manager.create(PurchaseReturn, {
        returnNumber,
        supplierId: input.supplierId,
        returnDate: new Date(),
        totalRefundLkr,
        reason: input.reason,
        notes: input.notes || null,
        processedByUserId: userId,
        createdBy: userId,
        items: returnItems,
      });

      const savedPr = await manager.save(PurchaseReturn, pr);

      return {
        id: savedPr.id,
        returnNumber: savedPr.returnNumber,
        supplierId: savedPr.supplierId,
        supplierName: supplier.companyName,
        returnDate:
          typeof savedPr.returnDate === 'string'
            ? savedPr.returnDate
            : savedPr.returnDate.toISOString().slice(0, 10),
        totalRefundLkr: Number(savedPr.totalRefundLkr),
        reason: savedPr.reason,
        notes: savedPr.notes,
        items: returnItems.map((ri) => ({
          id: ri.id,
          returnId: savedPr.id,
          batchId: ri.batchId,
          quantityBaseUnits: ri.quantityBaseUnits,
          unitCostPrice: Number(ri.unitCostPrice),
          lineTotalLkr: Number(ri.lineTotalLkr),
          reason: ri.reason,
        })),
        createdAt: savedPr.createdAt.toISOString(),
      };
    });
  }

  async getReturns(supplierId?: string): Promise<PurchaseReturnDto[]> {
    const qb = this.dataSource
      .getRepository(PurchaseReturn)
      .createQueryBuilder('pr')
      .leftJoinAndSelect('pr.supplier', 'supplier')
      .leftJoinAndSelect('pr.items', 'item')
      .leftJoinAndSelect('item.batch', 'batch')
      .leftJoinAndSelect('batch.medicine', 'medicine')
      .orderBy('pr.createdAt', 'DESC');

    if (supplierId) {
      qb.where('pr.supplierId = :supplierId', { supplierId });
    }

    const prs = await qb.getMany();

    return prs.map((pr) => ({
      id: pr.id,
      returnNumber: pr.returnNumber,
      supplierId: pr.supplierId,
      supplierName: pr.supplier?.companyName,
      returnDate:
        typeof pr.returnDate === 'string'
          ? pr.returnDate
          : pr.returnDate.toISOString().slice(0, 10),
      totalRefundLkr: Number(pr.totalRefundLkr),
      reason: pr.reason,
      notes: pr.notes,
      items: (pr.items || []).map((item) => ({
        id: item.id,
        returnId: item.purchaseReturnId,
        batchId: item.batchId,
        medicineName: item.batch?.medicine?.name,
        batchNumber: item.batch?.batchNumber,
        quantityBaseUnits: item.quantityBaseUnits,
        unitCostPrice: Number(item.unitCostPrice),
        lineTotalLkr: Number(item.lineTotalLkr),
        reason: item.reason,
      })),
      createdAt: pr.createdAt.toISOString(),
    }));
  }
}
