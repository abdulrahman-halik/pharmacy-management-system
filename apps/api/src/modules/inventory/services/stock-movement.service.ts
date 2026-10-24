import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, DataSource } from 'typeorm';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { MovementType, BatchStatus } from '@pharmacy/shared';

export interface RecordMovementOptions {
  batchId: string;
  movementType: MovementType;
  quantityBaseUnits: number; // Signed: positive for inward, negative for outward
  reason?: string;
  referenceType?: string;
  referenceId?: string;
  userId: string;
}

export interface InvariantCheckResult {
  batchId: string;
  batchNumber: string;
  batchQuantity: number;
  ledgerSum: number;
  discrepancy: number;
  isValid: boolean;
}

@Injectable()
export class StockMovementService {
  constructor(
    @InjectRepository(InventoryBatch)
    private readonly batchRepo: Repository<InventoryBatch>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Appends an immutable stock movement and updates the inventory batch in a single atomic transaction.
   * Can run within an existing EntityManager or automatically opens a new transaction.
   */
  async recordMovement(
    options: RecordMovementOptions,
    externalManager?: EntityManager,
  ): Promise<{ batch: InventoryBatch; movement: StockMovement }> {
    const execute = async (manager: EntityManager) => {
      // Pessimistic write lock to avoid concurrent race conditions on batch balance
      const batch = await manager
        .createQueryBuilder(InventoryBatch, 'batch')
        .setLock('pessimistic_write')
        .where('batch.id = :batchId', { batchId: options.batchId })
        .getOne();

      if (!batch) {
        throw new NotFoundException(`Inventory batch with ID ${options.batchId} not found`);
      }

      const previousBalance = batch.quantityBaseUnits;
      const newBalance = previousBalance + options.quantityBaseUnits;

      if (newBalance < 0) {
        throw new BadRequestException(
          `Insufficient stock in batch ${batch.batchNumber}. Current: ${previousBalance}, Requested delta: ${options.quantityBaseUnits}`,
        );
      }

      // Update batch quantity
      batch.quantityBaseUnits = newBalance;

      // Status transition: if balance reaches 0 and is ACTIVE -> DEPLETED
      // If stock replenished and was DEPLETED -> check if expired/quarantined, else ACTIVE
      const isExpired = new Date(batch.expiryDate).getTime() <= new Date().setHours(0, 0, 0, 0);
      if (batch.status !== BatchStatus.QUARANTINED) {
        if (isExpired) {
          batch.status = BatchStatus.EXPIRED;
        } else if (newBalance === 0) {
          batch.status = BatchStatus.DEPLETED;
        } else {
          batch.status = BatchStatus.ACTIVE;
        }
      }

      await manager.save(InventoryBatch, batch);

      // Create and persist the immutable stock movement ledger entry
      const movement = manager.create(StockMovement, {
        storeId: batch.storeId,
        medicineId: batch.medicineId,
        batchId: batch.id,
        movementType: options.movementType,
        quantityBaseUnits: options.quantityBaseUnits,
        balanceAfter: newBalance,
        unitCostPrice: batch.unitCostPrice,
        referenceType: options.referenceType || null,
        referenceId: options.referenceId || null,
        reason: options.reason || null,
        userId: options.userId,
      });

      const savedMovement = await manager.save(StockMovement, movement);

      return { batch, movement: savedMovement };
    };

    if (externalManager) {
      return execute(externalManager);
    }

    return this.dataSource.transaction(async (manager) => {
      return execute(manager);
    });
  }

  /**
   * Verifies the core ledger invariant for a specific batch:
   * inventory_batches.quantity_base_units === SUM(stock_movements.quantity_base_units)
   */
  async verifyBatchLedgerInvariant(batchId: string): Promise<InvariantCheckResult> {
    const batch = await this.batchRepo.findOne({ where: { id: batchId } });
    if (!batch) {
      throw new NotFoundException(`Batch ${batchId} not found`);
    }

    const { sum } = await this.movementRepo
      .createQueryBuilder('sm')
      .select('COALESCE(SUM(sm.quantity_base_units), 0)', 'sum')
      .where('sm.batch_id = :batchId', { batchId })
      .getRawOne();

    const ledgerSum = parseInt(sum, 10);
    const discrepancy = batch.quantityBaseUnits - ledgerSum;

    return {
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      batchQuantity: batch.quantityBaseUnits,
      ledgerSum,
      discrepancy,
      isValid: discrepancy === 0,
    };
  }

  /**
   * Reconciles all inventory batches across the system, detecting any ledger discrepancies.
   */
  async reconcileAllBatches(): Promise<{
    totalAudited: number;
    validCount: number;
    discrepancyCount: number;
    discrepancies: InvariantCheckResult[];
  }> {
    const batches = await this.batchRepo.find();
    const results: InvariantCheckResult[] = [];

    for (const batch of batches) {
      const check = await this.verifyBatchLedgerInvariant(batch.id);
      results.push(check);
    }

    const discrepancies = results.filter((r) => !r.isValid);

    return {
      totalAudited: results.length,
      validCount: results.length - discrepancies.length,
      discrepancyCount: discrepancies.length,
      discrepancies,
    };
  }
}
