import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { BatchStatus, AllocatedBatchItem, FefoAllocationResult } from '@pharmacy/shared';

@Injectable()
export class FefoAllocationService {
  constructor(
    @InjectRepository(InventoryBatch)
    private readonly batchRepo: Repository<InventoryBatch>,
  ) {}

  /**
   * High-Performance FEFO Allocation Engine.
   * Acquires pessimistic write lock on active, non-expired batches ordered by earliest expiry date.
   * Ensures zero overselling under high concurrency.
   */
  async allocateFefo(
    entityManager: EntityManager,
    medicineId: string,
    requestedUnits: number,
  ): Promise<AllocatedBatchItem[]> {
    if (requestedUnits <= 0) {
      throw new BadRequestException('Requested units must be greater than zero');
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Query active, non-expired batches ordered by earliest expiry date with pessimistic lock
    const batches = await entityManager
      .createQueryBuilder(InventoryBatch, 'batch')
      .setLock('pessimistic_write')
      .where('batch.medicineId = :medicineId', { medicineId })
      .andWhere('batch.status = :status', { status: BatchStatus.ACTIVE })
      .andWhere('batch.expiryDate > :todayStr', { todayStr })
      .andWhere('batch.quantityBaseUnits > 0')
      .orderBy('batch.expiryDate', 'ASC')
      .addOrderBy('batch.createdAt', 'ASC')
      .getMany();

    const totalAvailable = batches.reduce((sum, b) => sum + b.quantityBaseUnits, 0);
    if (totalAvailable < requestedUnits) {
      throw new BadRequestException(
        `Insufficient stock for medicine ID ${medicineId}. Requested: ${requestedUnits}, Available: ${totalAvailable}`,
      );
    }

    let remainingToAllocate = requestedUnits;
    const allocations: AllocatedBatchItem[] = [];

    for (const batch of batches) {
      if (remainingToAllocate <= 0) break;

      const allocQuantity = Math.min(batch.quantityBaseUnits, remainingToAllocate);
      allocations.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        expiryDate: typeof batch.expiryDate === 'string' ? batch.expiryDate : (batch.expiryDate as Date).toISOString().split('T')[0],
        allocatedUnits: allocQuantity,
        unitCostPrice: batch.unitCostPrice,
        batchMrp: batch.batchMrp,
      });

      remainingToAllocate -= allocQuantity;
    }

    return allocations;
  }

  /**
   * Read-only FEFO preview for dispensary / POS without acquiring database locks.
   */
  async previewFefo(
    medicineId: string,
    requestedUnits: number,
  ): Promise<FefoAllocationResult> {
    if (requestedUnits <= 0) {
      throw new BadRequestException('Requested units must be greater than zero');
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const batches = await this.batchRepo
      .createQueryBuilder('batch')
      .where('batch.medicineId = :medicineId', { medicineId })
      .andWhere('batch.status = :status', { status: BatchStatus.ACTIVE })
      .andWhere('batch.expiryDate > :todayStr', { todayStr })
      .andWhere('batch.quantityBaseUnits > 0')
      .orderBy('batch.expiryDate', 'ASC')
      .addOrderBy('batch.createdAt', 'ASC')
      .getMany();

    let remainingToAllocate = requestedUnits;
    const allocations: AllocatedBatchItem[] = [];

    for (const batch of batches) {
      if (remainingToAllocate <= 0) break;

      const allocQuantity = Math.min(batch.quantityBaseUnits, remainingToAllocate);
      allocations.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        expiryDate: typeof batch.expiryDate === 'string' ? batch.expiryDate : (batch.expiryDate as Date).toISOString().split('T')[0],
        allocatedUnits: allocQuantity,
        unitCostPrice: batch.unitCostPrice,
        batchMrp: batch.batchMrp,
      });

      remainingToAllocate -= allocQuantity;
    }

    const allocatedTotalUnits = allocations.reduce((sum, item) => sum + item.allocatedUnits, 0);
    const shortfallUnits = Math.max(0, requestedUnits - allocatedTotalUnits);

    return {
      medicineId,
      requestedUnits,
      allocatedTotalUnits,
      shortfallUnits,
      allocations,
    };
  }
}
