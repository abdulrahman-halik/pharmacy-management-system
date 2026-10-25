import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { StockMovementService } from './stock-movement.service';
import {
  StockAdjustmentInput,
  MANAGER_APPROVAL_THRESHOLD_LKR,
} from '@pharmacy/shared';

@Injectable()
export class StockAdjustmentService {
  constructor(
    @InjectRepository(InventoryBatch)
    private readonly batchRepo: Repository<InventoryBatch>,
    private readonly stockMovementService: StockMovementService,
  ) {}

  async processAdjustment(
    input: StockAdjustmentInput,
    userId: string,
    userRole?: string,
  ) {
    const batch = await this.batchRepo.findOne({
      where: { id: input.batchId },
      relations: ['medicine'],
    });

    if (!batch) {
      throw new NotFoundException(`Inventory batch with ID ${input.batchId} not found`);
    }

    const costImpact = input.quantityBaseUnits * batch.unitCostPrice;
    const isManagerRole = userRole === 'ADMIN' || userRole === 'MANAGER';

    if (costImpact > MANAGER_APPROVAL_THRESHOLD_LKR && !input.managerApprovedBy && !isManagerRole) {
      throw new ForbiddenException(
        `Stock adjustment cost (Rs. ${costImpact.toLocaleString()}) exceeds Rs. 25,000 threshold. Manager approval required.`,
      );
    }

    const isAddition = input.adjustmentType === 'ADD';
    const quantityDelta = isAddition ? input.quantityBaseUnits : -input.quantityBaseUnits;
    const movementType = isAddition ? 'ADJUST_ADD' : 'ADJUST_REDUCE';

    const auditReason = input.managerApprovedBy
      ? `${input.reason} [Approved by Manager: ${input.managerApprovedBy}]`
      : input.reason;

    const result = await this.stockMovementService.recordMovement({
      batchId: batch.id,
      movementType,
      quantityBaseUnits: quantityDelta,
      reason: auditReason,
      referenceType: 'ADJUSTMENT',
      userId,
    });

    return {
      batch: result.batch,
      movement: result.movement,
      costImpact,
    };
  }
}
