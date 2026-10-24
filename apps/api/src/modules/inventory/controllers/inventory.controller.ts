import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UsePipes,
} from '@nestjs/common';
import { InventoryBatchService } from '../services/inventory-batch.service';
import { FefoAllocationService } from '../services/fefo-allocation.service';
import { StockHealthService } from '../services/stock-health.service';
import { StockAdjustmentService } from '../services/stock-adjustment.service';
import { BatchRecallService } from '../services/batch-recall.service';
import { StockMovementService } from '../services/stock-movement.service';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import {
  CreateBatchSchema,
  CreateBatchInput,
  StockAdjustmentSchema,
  StockAdjustmentInput,
  BatchRecallSchema,
  BatchRecallInput,
  BatchFilterQuerySchema,
  BatchFilterQueryInput,
  FefoPreviewQuerySchema,
  FefoPreviewQueryInput,
} from '@pharmacy/shared';

@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly batchService: InventoryBatchService,
    private readonly fefoService: FefoAllocationService,
    private readonly healthService: StockHealthService,
    private readonly adjustmentService: StockAdjustmentService,
    private readonly recallService: BatchRecallService,
    private readonly movementService: StockMovementService,
  ) {}

  @Post('batches')
  @UsePipes(new ZodValidationPipe(CreateBatchSchema))
  async createBatch(
    @Body() input: CreateBatchInput,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const userId = user?.id || 'system-user-001';
    return this.batchService.createBatch(input, userId);
  }

  @Get('batches')
  @UsePipes(new ZodValidationPipe(BatchFilterQuerySchema))
  async getBatches(@Query() query: BatchFilterQueryInput) {
    return this.batchService.getBatches(query);
  }

  @Get('batches/:id')
  async getBatchById(@Param('id') id: string) {
    return this.batchService.getBatchById(id);
  }

  @Get('fefo-preview/:medicineId')
  @UsePipes(new ZodValidationPipe(FefoPreviewQuerySchema))
  async previewFefo(
    @Param('medicineId') medicineId: string,
    @Query() query: FefoPreviewQueryInput,
  ) {
    return this.fefoService.previewFefo(medicineId, query.requestedUnits);
  }

  @Get('stock-health')
  async getStockHealthSummary() {
    return this.healthService.getStockHealthSummary();
  }

  @Get('low-stock')
  async getLowStockAlerts() {
    return this.healthService.getLowStockAlerts();
  }

  @Post('adjustments')
  @UsePipes(new ZodValidationPipe(StockAdjustmentSchema))
  async adjustStock(
    @Body() input: StockAdjustmentInput,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const userId = user?.id || 'system-user-001';
    const userRole = user?.role || 'PHARMACIST';
    return this.adjustmentService.processAdjustment(input, userId, userRole);
  }

  @Post('recall')
  @UsePipes(new ZodValidationPipe(BatchRecallSchema))
  async recallBatch(
    @Body() input: BatchRecallInput,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const userId = user?.id || 'system-user-001';
    return this.recallService.recallBatch(input, userId);
  }

  @Get('recall/:batchId/traceability')
  async getTraceabilityReport(@Param('batchId') batchId: string) {
    return this.recallService.getTraceabilityReport(batchId);
  }

  @Get('reconciliation')
  async reconcileAllBatches() {
    return this.movementService.reconcileAllBatches();
  }

  @Get('reconciliation/:batchId')
  async verifyBatchInvariant(@Param('batchId') batchId: string) {
    return this.movementService.verifyBatchLedgerInvariant(batchId);
  }
}
