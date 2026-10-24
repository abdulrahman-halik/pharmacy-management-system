import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import {
  BatchStatus,
  BatchRecallInput,
  BatchTraceabilityReport,
  InventoryBatchDto,
  StockMovementDto,
} from '@pharmacy/shared';

@Injectable()
export class BatchRecallService {
  constructor(
    @InjectRepository(InventoryBatch)
    private readonly batchRepo: Repository<InventoryBatch>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
  ) {}

  /**
   * Quarantines a batch immediately across all store systems and generates an NMRA traceability report.
   */
  async recallBatch(
    input: BatchRecallInput,
    userId: string,
  ): Promise<BatchTraceabilityReport> {
    const batch = await this.batchRepo.findOne({
      where: { id: input.batchId },
      relations: ['medicine'],
    });

    if (!batch) {
      throw new NotFoundException(`Inventory batch with ID ${input.batchId} not found`);
    }

    // Set batch status to QUARANTINED
    batch.status = BatchStatus.QUARANTINED;
    await this.batchRepo.save(batch);

    // Record an audit movement documenting the quarantine lock
    const auditMovement = this.movementRepo.create({
      storeId: batch.storeId,
      medicineId: batch.medicineId,
      batchId: batch.id,
      movementType: 'DAMAGE',
      quantityBaseUnits: 0, // Zero delta: administrative quarantine status change
      balanceAfter: batch.quantityBaseUnits,
      unitCostPrice: batch.unitCostPrice,
      referenceType: 'RECALL',
      reason: `EMERGENCY BATCH RECALL: ${input.reason}`,
      userId,
    });
    await this.movementRepo.save(auditMovement);

    return this.getTraceabilityReport(batch.id);
  }

  /**
   * Generates NMRA Batch Traceability Report listing all stock movements and dispensed sales.
   */
  async getTraceabilityReport(batchId: string): Promise<BatchTraceabilityReport> {
    const batch = await this.batchRepo.findOne({
      where: { id: batchId },
      relations: ['medicine'],
    });

    if (!batch) {
      throw new NotFoundException(`Inventory batch with ID ${batchId} not found`);
    }

    const movements = await this.movementRepo.find({
      where: { batchId: batch.id },
      order: { createdAt: 'DESC' },
    });

    let totalDispensedUnits = 0;
    const salesReferences: Array<{
      invoiceId: string;
      saleDate: string;
      quantityBaseUnits: number;
      userId: string;
    }> = [];

    for (const mov of movements) {
      if (mov.quantityBaseUnits < 0) {
        totalDispensedUnits += Math.abs(mov.quantityBaseUnits);
      }

      if (mov.referenceType === 'SALE_INVOICE' || mov.movementType === 'SALE') {
        salesReferences.push({
          invoiceId: mov.referenceId || mov.id,
          saleDate: mov.createdAt.toISOString(),
          quantityBaseUnits: Math.abs(mov.quantityBaseUnits),
          userId: mov.userId,
        });
      }
    }

    const batchDto: InventoryBatchDto = {
      id: batch.id,
      storeId: batch.storeId,
      medicineId: batch.medicineId,
      medicineName: batch.medicine?.name,
      medicineGenericName: batch.medicine?.genericName,
      batchNumber: batch.batchNumber,
      mfdDate: batch.mfdDate ? new Date(batch.mfdDate).toISOString().split('T')[0] : null,
      expiryDate: new Date(batch.expiryDate).toISOString().split('T')[0],
      quantityBaseUnits: batch.quantityBaseUnits,
      unitCostPrice: batch.unitCostPrice,
      batchMrp: batch.batchMrp,
      supplierId: batch.supplierId,
      status: batch.status,
      createdAt: batch.createdAt.toISOString(),
      updatedAt: batch.updatedAt.toISOString(),
    };

    const movementDtos: StockMovementDto[] = movements.map((m) => ({
      id: m.id,
      storeId: m.storeId,
      medicineId: m.medicineId,
      batchId: m.batchId,
      movementType: m.movementType,
      quantityBaseUnits: m.quantityBaseUnits,
      balanceAfter: m.balanceAfter,
      unitCostPrice: m.unitCostPrice,
      referenceType: m.referenceType,
      referenceId: m.referenceId,
      reason: m.reason,
      userId: m.userId,
      createdAt: m.createdAt.toISOString(),
    }));

    return {
      batch: batchDto,
      totalDispensedUnits,
      totalRemainingUnits: batch.quantityBaseUnits,
      movements: movementDtos,
      salesReferences,
    };
  }
}
