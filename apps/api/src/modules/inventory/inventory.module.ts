import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryBatch } from './entities/inventory-batch.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { StockAuditSession } from './entities/stock-audit-session.entity';
import { StockAuditItem } from './entities/stock-audit-item.entity';
import { Medicine } from '../medicines/entities/medicine.entity';
import { StockMovementService } from './services/stock-movement.service';
import { FefoAllocationService } from './services/fefo-allocation.service';
import { StockHealthService } from './services/stock-health.service';
import { StockAdjustmentService } from './services/stock-adjustment.service';
import { BatchRecallService } from './services/batch-recall.service';
import { StockAuditService } from './services/stock-audit.service';
import { InventoryBatchService } from './services/inventory-batch.service';
import { InventoryController } from './controllers/inventory.controller';
import { StockAuditController } from './controllers/stock-audit.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryBatch,
      StockMovement,
      StockAuditSession,
      StockAuditItem,
      Medicine,
    ]),
  ],
  controllers: [InventoryController, StockAuditController],
  providers: [
    StockMovementService,
    FefoAllocationService,
    StockHealthService,
    StockAdjustmentService,
    BatchRecallService,
    StockAuditService,
    InventoryBatchService,
  ],
  exports: [
    StockMovementService,
    FefoAllocationService,
    StockHealthService,
    InventoryBatchService,
    StockAdjustmentService,
    BatchRecallService,
    StockAuditService,
  ],
})
export class InventoryModule {}
