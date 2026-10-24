import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import * as crypto from 'crypto';
import { DayClose } from '../entities/day-close.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { CashLedgerEntry } from '../entities/cash-ledger-entry.entity';
import { AuditLog } from '../../audit/entities/audit-log.entity';
import {
  DayCloseCommitInput,
  DayCloseReopenInput,
  DayClosePreviewDto,
  DayCloseDto,
  calculateDenominationsTotal,
} from '@pharmacy/shared';

@Injectable()
export class DayCloseService {
  constructor(
    @InjectRepository(DayClose)
    private readonly dayCloseRepo: Repository<DayClose>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepo: Repository<PaymentMethod>,
    @InjectRepository(CashLedgerEntry)
    private readonly ledgerRepo: Repository<CashLedgerEntry>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Checks whether a calendar date is closed and locked.
   */
  async isDateLocked(dateInput: string | Date, storeId = 1): Promise<boolean> {
    const dateStr =
      dateInput instanceof Date
        ? dateInput.toISOString().split('T')[0]
        : String(dateInput).split('T')[0];

    const dayClose = await this.dayCloseRepo.findOne({
      where: { closingDate: dateStr as unknown as Date, storeId },
    });

    return !!(dayClose && dayClose.isLocked);
  }

  /**
   * Computes expected cash and reconciliation preview for a given calendar date.
   */
  async getPreview(
    closingDateStr: string,
    storeId = 1,
  ): Promise<DayClosePreviewDto> {
    const dateStr = closingDateStr.split('T')[0];
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
    const nextDate = new Date(`${dateStr}T23:59:59.999Z`);

    // 1. Check if already closed
    const existing = await this.dayCloseRepo.findOne({
      where: { closingDate: dateStr as unknown as Date, storeId },
    });

    // 2. Determine opening cash: from previous day's counted cash or 0.00
    const prevDayClose = await this.dayCloseRepo.findOne({
      where: {
        closingDate: LessThan(dateStr as unknown as Date),
        storeId,
      },
      order: { closingDate: 'DESC' },
    });
    const openingCashLkr = prevDayClose
      ? Number(prevDayClose.countedCashLkr)
      : 0.0;

    // 3. Cash Sales (payment method CASH, source SALE)
    const cashPm = await this.paymentMethodRepo.findOne({
      where: { code: 'CASH' },
    });
    const cashPmId = cashPm?.id || 'pm-cash';

    const salesRes = await this.ledgerRepo
      .createQueryBuilder('entry')
      .select('SUM(entry.amountLkr)', 'cashSales')
      .where('entry.storeId = :storeId', { storeId })
      .andWhere('entry.paymentMethodId = :pmId', { pmId: cashPmId })
      .andWhere('entry.sourceType = :st', { st: 'SALE' })
      .andWhere('entry.entryDate BETWEEN :start AND :end', {
        start: targetDate,
        end: nextDate,
      })
      .getRawOne();
    const cashSalesLkr = Number(
      parseFloat(salesRes?.cashSales || '0').toFixed(2),
    );

    // 4. Customer Collections in cash
    const collRes = await this.ledgerRepo
      .createQueryBuilder('entry')
      .select('SUM(entry.amountLkr)', 'cashCollections')
      .where('entry.storeId = :storeId', { storeId })
      .andWhere('entry.paymentMethodId = :pmId', { pmId: cashPmId })
      .andWhere('entry.sourceType = :st', { st: 'CUSTOMER_COLLECTION' })
      .andWhere('entry.entryDate BETWEEN :start AND :end', {
        start: targetDate,
        end: nextDate,
      })
      .getRawOne();
    const cashCollectionsLkr = Number(
      parseFloat(collRes?.cashCollections || '0').toFixed(2),
    );

    // 5. Cash Refunds (SALE_RETURN)
    const refundRes = await this.ledgerRepo
      .createQueryBuilder('entry')
      .select('SUM(entry.amountLkr)', 'cashRefunds')
      .where('entry.storeId = :storeId', { storeId })
      .andWhere('entry.paymentMethodId = :pmId', { pmId: cashPmId })
      .andWhere('entry.sourceType = :st', { st: 'SALE_RETURN' })
      .andWhere('entry.entryDate BETWEEN :start AND :end', {
        start: targetDate,
        end: nextDate,
      })
      .getRawOne();
    const cashRefundsLkr = Number(
      parseFloat(refundRes?.cashRefunds || '0').toFixed(2),
    );

    // 6. Cash Expenses
    const expRes = await this.ledgerRepo
      .createQueryBuilder('entry')
      .select('SUM(entry.amountLkr)', 'cashExpenses')
      .where('entry.storeId = :storeId', { storeId })
      .andWhere('entry.paymentMethodId = :pmId', { pmId: cashPmId })
      .andWhere('entry.sourceType = :st', { st: 'EXPENSE' })
      .andWhere('entry.entryDate BETWEEN :start AND :end', {
        start: targetDate,
        end: nextDate,
      })
      .getRawOne();
    const cashExpensesLkr = Number(
      parseFloat(expRes?.cashExpenses || '0').toFixed(2),
    );

    // 7. Expected Cash
    const expectedCashLkr = Number(
      (
        openingCashLkr +
        cashSalesLkr +
        cashCollectionsLkr -
        cashRefundsLkr -
        cashExpensesLkr
      ).toFixed(2),
    );

    let dayCloseDto: DayCloseDto | null = null;
    if (existing) {
      dayCloseDto = {
        id: existing.id,
        closingDate: dateStr,
        openingCashLkr: Number(existing.openingCashLkr),
        cashSalesLkr: Number(existing.cashSalesLkr),
        cashCollectionsLkr: Number(existing.cashCollectionsLkr),
        cashRefundsLkr: Number(existing.cashRefundsLkr),
        cashExpensesLkr: Number(existing.cashExpensesLkr),
        expectedCashLkr: Number(existing.expectedCashLkr),
        countedCashLkr: Number(existing.countedCashLkr),
        cashVarianceLkr: Number(existing.cashVarianceLkr),
        varianceReason: existing.varianceReason,
        denominationsJson: existing.denominationsJson,
        isLocked: existing.isLocked,
        closedByUserId: existing.closedByUserId,
        reopenedByUserId: existing.reopenedByUserId,
        reopenReason: existing.reopenReason,
        createdAt: existing.createdAt.toISOString(),
        updatedAt: existing.updatedAt.toISOString(),
      };
    }

    return {
      closingDate: dateStr,
      openingCashLkr,
      cashSalesLkr,
      cashCollectionsLkr,
      cashRefundsLkr,
      cashExpensesLkr,
      expectedCashLkr,
      isAlreadyClosed: !!(existing && existing.isLocked),
      dayClose: dayCloseDto,
    };
  }

  /**
   * Commits Day-Close reconciliation, validates denominations and variance, and locks the date.
   */
  async commit(input: DayCloseCommitInput, userId: string, storeId = 1) {
    const preview = await this.getPreview(input.closingDate, storeId);

    if (preview.isAlreadyClosed) {
      throw new BadRequestException(
        `Day-Close for date ${input.closingDate} has already been closed and locked`,
      );
    }

    const expectedCashLkr = preview.expectedCashLkr;
    const countedCashLkr = Number(input.countedCashLkr);
    const variance = Number((countedCashLkr - expectedCashLkr).toFixed(2));

    // Non-zero variance mandates explanation note
    if (Math.abs(variance) > 0.01) {
      if (!input.varianceReason || input.varianceReason.trim().length < 5) {
        throw new BadRequestException(
          `A non-zero variance (Rs. ${variance}) mandates an explanatory note with at least 5 characters`,
        );
      }
    }

    return this.dataSource.transaction(async (manager) => {
      let dayClose = await manager.findOne(DayClose, {
        where: {
          closingDate: input.closingDate as unknown as Date,
          storeId,
        },
      });

      if (!dayClose) {
        dayClose = manager.create(DayClose, {
          storeId,
          closingDate: input.closingDate as unknown as Date,
        });
      }

      dayClose.openingCashLkr = preview.openingCashLkr;
      dayClose.cashSalesLkr = preview.cashSalesLkr;
      dayClose.cashCollectionsLkr = preview.cashCollectionsLkr;
      dayClose.cashRefundsLkr = preview.cashRefundsLkr;
      dayClose.cashExpensesLkr = preview.cashExpensesLkr;
      dayClose.expectedCashLkr = expectedCashLkr;
      dayClose.countedCashLkr = countedCashLkr;
      dayClose.cashVarianceLkr = variance;
      dayClose.varianceReason = input.varianceReason || undefined;
      dayClose.denominationsJson = input.denominations;
      dayClose.isLocked = true;
      dayClose.closedByUserId = userId;

      const saved = await manager.save(dayClose);

      // Audit Log entry
      const auditPayload = {
        action: 'DAY_CLOSE_COMMIT',
        entityName: 'DayClose',
        entityId: saved.id,
        date: input.closingDate,
        expectedCashLkr,
        countedCashLkr,
        variance,
      };
      const hash = crypto
        .createHash('sha256')
        .update(JSON.stringify(auditPayload))
        .digest('hex');

      const audit = manager.create(AuditLog, {
        storeId,
        userId,
        userEmail: 'cashier@pharmacy.local',
        action: 'DAY_CLOSE_COMMIT',
        entityName: 'DayClose',
        entityId: saved.id,
        afterStateJson: auditPayload,
        ipAddress: '127.0.0.1',
        userAgent: 'Internal-DayCloseService',
        integrityHash: hash,
      });
      await manager.save(audit);

      return {
        ...saved,
        openingCashLkr: Number(saved.openingCashLkr),
        cashSalesLkr: Number(saved.cashSalesLkr),
        expectedCashLkr: Number(saved.expectedCashLkr),
        countedCashLkr: Number(saved.countedCashLkr),
        cashVarianceLkr: Number(saved.cashVarianceLkr),
      };
    });
  }

  /**
   * Unlocks a previously closed calendar day with elevated credentials and audit logging.
   */
  async reopen(input: DayCloseReopenInput, managerUserId: string, storeId = 1) {
    const dayClose = await this.dayCloseRepo.findOne({
      where: {
        closingDate: input.closingDate as unknown as Date,
        storeId,
      },
    });

    if (!dayClose) {
      throw new NotFoundException(
        `Day-Close for date ${input.closingDate} not found`,
      );
    }

    if (!dayClose.isLocked) {
      throw new BadRequestException(
        `Date ${input.closingDate} is not currently locked`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const beforeState = {
        isLocked: dayClose.isLocked,
        closedByUserId: dayClose.closedByUserId,
      };

      dayClose.isLocked = false;
      dayClose.reopenedByUserId = managerUserId;
      dayClose.reopenReason = input.reason;

      const updated = await manager.save(dayClose);

      const afterState = {
        isLocked: false,
        reopenedByUserId: managerUserId,
        reopenReason: input.reason,
      };

      const hash = crypto
        .createHash('sha256')
        .update(JSON.stringify({ beforeState, afterState }))
        .digest('hex');

      const audit = manager.create(AuditLog, {
        storeId,
        userId: managerUserId,
        userEmail: 'manager@pharmacy.local',
        action: 'DAY_CLOSE_REOPEN',
        entityName: 'DayClose',
        entityId: dayClose.id,
        beforeStateJson: beforeState,
        afterStateJson: afterState,
        ipAddress: '127.0.0.1',
        userAgent: 'Manager-ReopenWorkflow',
        integrityHash: hash,
      });
      await manager.save(audit);

      return {
        ...updated,
        openingCashLkr: Number(updated.openingCashLkr),
        expectedCashLkr: Number(updated.expectedCashLkr),
        countedCashLkr: Number(updated.countedCashLkr),
        cashVarianceLkr: Number(updated.cashVarianceLkr),
      };
    });
  }
}
