import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StockAuditSession } from '../entities/stock-audit-session.entity';
import { StockAuditItem } from '../entities/stock-audit-item.entity';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { StockMovementService } from './stock-movement.service';
import {
  StartAuditSessionInput,
  RecordAuditCountInput,
  ApproveAuditSessionInput,
  AuditStatus,
} from '@pharmacy/shared';

@Injectable()
export class StockAuditService {
  constructor(
    @InjectRepository(StockAuditSession)
    private readonly sessionRepo: Repository<StockAuditSession>,
    @InjectRepository(StockAuditItem)
    private readonly itemRepo: Repository<StockAuditItem>,
    @InjectRepository(InventoryBatch)
    private readonly batchRepo: Repository<InventoryBatch>,
    private readonly stockMovementService: StockMovementService,
    private readonly dataSource: DataSource,
  ) {}

  async startSession(
    input: StartAuditSessionInput,
    userId: string,
  ): Promise<StockAuditSession> {
    const datePrefix = new Date().toISOString().slice(0, 7).replace('-', '');
    const count = await this.sessionRepo.count();
    const sessionCode =
      input.sessionCode || `AUD-${datePrefix}-${String(count + 1).padStart(3, '0')}`;

    const session = this.sessionRepo.create({
      sessionCode,
      status: AuditStatus.IN_PROGRESS,
      totalVarianceCostLkr: 0.0,
      notes: input.notes || null,
      createdBy: userId,
    });

    return this.sessionRepo.save(session);
  }

  async recordCount(
    sessionId: string,
    input: RecordAuditCountInput,
    _userId: string,
  ): Promise<StockAuditSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Audit session with ID ${sessionId} not found`);
    }

    if (session.status !== AuditStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Cannot record counts on an audit session in ${session.status} status`,
      );
    }

    const batch = await this.batchRepo.findOne({
      where: { id: input.batchId },
      relations: ['medicine'],
    });

    if (!batch) {
      throw new NotFoundException(`Inventory batch with ID ${input.batchId} not found`);
    }

    let item = await this.itemRepo.findOne({
      where: { sessionId: session.id, batchId: batch.id },
    });

    const systemQuantity = batch.quantityBaseUnits;
    const countedQuantity = input.countedQuantityBaseUnits;
    const varianceQuantity = countedQuantity - systemQuantity;
    const varianceCost = Math.round(varianceQuantity * batch.unitCostPrice * 100) / 100;

    if (item) {
      item.countedQuantityBaseUnits = countedQuantity;
      item.varianceQuantityBaseUnits = varianceQuantity;
      item.varianceCostLkr = varianceCost;
      item.notes = input.notes || item.notes;
      await this.itemRepo.save(item);
    } else {
      item = this.itemRepo.create({
        sessionId: session.id,
        medicineId: batch.medicineId,
        batchId: batch.id,
        systemQuantityBaseUnits: systemQuantity,
        countedQuantityBaseUnits: countedQuantity,
        varianceQuantityBaseUnits: varianceQuantity,
        varianceCostLkr: varianceCost,
        notes: input.notes || null,
      });
      await this.itemRepo.save(item);
    }

    // Recalculate session total variance cost
    const allItems = await this.itemRepo.find({ where: { sessionId: session.id } });
    const totalVarianceCost = allItems.reduce((sum, it) => sum + it.varianceCostLkr, 0);
    const roundedVarianceCost = Math.round(totalVarianceCost * 100) / 100;

    await this.sessionRepo.update(session.id, {
      totalVarianceCostLkr: roundedVarianceCost,
    });

    return this.getSession(sessionId);
  }

  async approveSession(
    sessionId: string,
    input: ApproveAuditSessionInput,
  ): Promise<StockAuditSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['items', 'items.batch'],
    });

    if (!session) {
      throw new NotFoundException(`Audit session with ID ${sessionId} not found`);
    }

    if (session.status !== AuditStatus.IN_PROGRESS && session.status !== AuditStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Audit session has already been finalized with status ${session.status}`,
      );
    }

    if (input.decision === 'REJECTED') {
      await this.sessionRepo.update(session.id, {
        status: AuditStatus.REJECTED,
        approvedBy: input.approvedBy,
        approvedAt: new Date(),
      });
      return this.getSession(sessionId);
    }

    // In a single atomic database transaction, reconcile each variance by writing AUDIT_CORRECTION movements
    await this.dataSource.transaction(async (manager) => {
      const items = await this.itemRepo.find({
        where: { sessionId: session.id },
      });

      for (const item of items) {
        if (item.varianceQuantityBaseUnits !== 0) {
          await this.stockMovementService.recordMovement(
            {
              batchId: item.batchId,
              movementType: 'AUDIT_CORRECTION',
              quantityBaseUnits: item.varianceQuantityBaseUnits,
              reason: `PHYSICAL AUDIT RECONCILIATION: Session ${session.sessionCode} (Counted: ${item.countedQuantityBaseUnits}, System: ${item.systemQuantityBaseUnits})`,
              referenceType: 'AUDIT_SESSION',
              referenceId: session.id,
              userId: input.approvedBy,
            },
            manager,
          );
        }
      }

      await manager.update(StockAuditSession, session.id, {
        status: AuditStatus.APPROVED,
        approvedBy: input.approvedBy,
        approvedAt: new Date(),
      });
    });

    return this.getSession(sessionId);
  }

  async getSession(sessionId: string): Promise<StockAuditSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['items', 'items.medicine', 'items.batch'],
    });

    if (!session) {
      throw new NotFoundException(`Audit session with ID ${sessionId} not found`);
    }

    return session;
  }

  async listSessions(): Promise<StockAuditSession[]> {
    return this.sessionRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['items'],
    });
  }
}
