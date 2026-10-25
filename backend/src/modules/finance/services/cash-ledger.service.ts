import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, Between, LessThanOrEqual } from 'typeorm';
import { CashLedgerEntry } from '../entities/cash-ledger-entry.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { BankAccount } from '../entities/bank-account.entity';
import {
  CashDirection,
  CashSourceType,
  CashbookFilterDto,
} from '@pharmacy/shared';
import { Sale } from '../../pos/entities/sale.entity';
import { SupplierPayment } from '../../procurement/entities/supplier-payment.entity';

export interface RecordCashEntryInput {
  storeId?: number;
  entryDate?: Date;
  direction: CashDirection;
  amountLkr: number;
  paymentMethodId: string;
  bankAccountId?: string | null;
  sourceType: CashSourceType;
  sourceId?: string | null;
  description: string;
  userId: string;
}

@Injectable()
export class CashLedgerService {
  private readonly logger = new Logger(CashLedgerService.name);

  constructor(
    @InjectRepository(CashLedgerEntry)
    private readonly ledgerRepo: Repository<CashLedgerEntry>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepo: Repository<PaymentMethod>,
    @InjectRepository(BankAccount)
    private readonly bankAccountRepo: Repository<BankAccount>,
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    @InjectRepository(SupplierPayment)
    private readonly supplierPaymentRepo: Repository<SupplierPayment>,
  ) {}

  /**
   * Records an immutable entry into the Cash Ledger.
   * Accepts an optional transactional EntityManager.
   */
  async recordEntry(
    input: RecordCashEntryInput,
    transactionalManager?: EntityManager,
  ): Promise<CashLedgerEntry> {
    const repo = transactionalManager
      ? transactionalManager.getRepository(CashLedgerEntry)
      : this.ledgerRepo;

    const entry = repo.create({
      storeId: input.storeId || 1,
      entryDate: input.entryDate || new Date(),
      direction: input.direction,
      amountLkr: Number(input.amountLkr),
      paymentMethodId: input.paymentMethodId,
      bankAccountId: input.bankAccountId || undefined,
      sourceType: input.sourceType,
      sourceId: input.sourceId || undefined,
      description: input.description,
      userId: input.userId,
    });

    const saved = await repo.save(entry);

    // If a bank account is referenced, update its current balance atomically (excluding OPENING which sets initial balance)
    if (input.bankAccountId && input.sourceType !== 'OPENING') {
      const bankRepo = transactionalManager
        ? transactionalManager.getRepository(BankAccount)
        : this.bankAccountRepo;
      const bank = await bankRepo.findOne({
        where: { id: input.bankAccountId },
        lock: transactionalManager ? { mode: 'pessimistic_write' } : undefined,
      });

      if (bank) {
        const delta =
          input.direction === 'IN'
            ? Number(input.amountLkr)
            : -Number(input.amountLkr);
        bank.currentBalanceLkr = Number(
          (Number(bank.currentBalanceLkr) + delta).toFixed(2),
        );
        await bankRepo.save(bank);
      }
    }

    return saved;
  }

  /**
   * Retrieves cashbook entries with running balance computation.
   */
  async getCashbook(filter: CashbookFilterDto, storeId = 1) {
    const qb = this.ledgerRepo
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.paymentMethod', 'pm')
      .leftJoinAndSelect('entry.bankAccount', 'bank')
      .where('entry.storeId = :storeId', { storeId });

    if (filter.startDate && filter.endDate) {
      qb.andWhere('entry.entryDate BETWEEN :start AND :end', {
        start: new Date(filter.startDate),
        end: new Date(filter.endDate),
      });
    } else if (filter.startDate) {
      qb.andWhere('entry.entryDate >= :start', {
        start: new Date(filter.startDate),
      });
    } else if (filter.endDate) {
      qb.andWhere('entry.entryDate <= :end', { end: new Date(filter.endDate) });
    }

    if (filter.paymentMethodId) {
      qb.andWhere('entry.paymentMethodId = :pmId', {
        pmId: filter.paymentMethodId,
      });
    }

    if (filter.bankAccountId) {
      qb.andWhere('entry.bankAccountId = :bankId', {
        bankId: filter.bankAccountId,
      });
    }

    if (filter.sourceType) {
      qb.andWhere('entry.sourceType = :srcType', {
        srcType: filter.sourceType,
      });
    }

    if (filter.direction) {
      qb.andWhere('entry.direction = :dir', { dir: filter.direction });
    }

    const totalCount = await qb.getCount();
    const entries = await qb
      .orderBy('entry.entryDate', 'DESC')
      .addOrderBy('entry.createdAt', 'DESC')
      .skip(filter.offset || 0)
      .take(filter.limit || 50)
      .getMany();

    // Compute live balances
    const balanceResult = await this.ledgerRepo
      .createQueryBuilder('entry')
      .select(
        `SUM(CASE WHEN entry.direction = 'IN' THEN entry.amount_lkr ELSE -entry.amount_lkr END)`,
        'netBalance',
      )
      .addSelect(
        `SUM(CASE WHEN entry.direction = 'IN' THEN entry.amount_lkr ELSE 0 END)`,
        'totalIn',
      )
      .addSelect(
        `SUM(CASE WHEN entry.direction = 'OUT' THEN entry.amount_lkr ELSE 0 END)`,
        'totalOut',
      )
      .where('entry.storeId = :storeId', { storeId })
      .getRawOne();

    return {
      entries,
      totalCount,
      summary: {
        totalInLkr: Number(parseFloat(balanceResult?.totalIn || '0').toFixed(2)),
        totalOutLkr: Number(parseFloat(balanceResult?.totalOut || '0').toFixed(2)),
        netBalanceLkr: Number(
          parseFloat(balanceResult?.netBalance || '0').toFixed(2),
        ),
      },
    };
  }

  /**
   * Calculates live cash-in-drawer for physical counter currency.
   */
  async getLiveCashInDrawer(storeId = 1, asOfDate?: Date): Promise<number> {
    const qb = this.ledgerRepo
      .createQueryBuilder('entry')
      .innerJoin('entry.paymentMethod', 'pm')
      .where('entry.storeId = :storeId', { storeId })
      .andWhere("pm.code = 'CASH'");

    if (asOfDate) {
      qb.andWhere('entry.entryDate <= :asOfDate', { asOfDate });
    }

    const res = await qb
      .select(
        `SUM(CASE WHEN entry.direction = 'IN' THEN entry.amount_lkr ELSE -entry.amount_lkr END)`,
        'netCash',
      )
      .getRawOne();

    return Number(parseFloat(res?.netCash || '0').toFixed(2));
  }

  /**
   * Idempotent backfill script to populate cash ledger entries
   * for existing Phase 6 sales and Phase 7 supplier payments.
   */
  async backfillFromPastTransactions(storeId = 1): Promise<{
    salesBackfilled: number;
    paymentsBackfilled: number;
  }> {
    let salesBackfilled = 0;
    let paymentsBackfilled = 0;

    // 1. Backfill Sales
    const sales = await this.saleRepo.find({
      where: { storeId },
      order: { createdAt: 'ASC' },
    });

    for (const sale of sales) {
      const existing = await this.ledgerRepo.findOne({
        where: {
          storeId,
          sourceType: 'SALE' as CashSourceType,
          sourceId: sale.id,
        },
      });

      if (!existing && sale.status === 'COMPLETED') {
        const splits = (sale.splitPayments as unknown as Array<{
          method: string;
          amount: number;
        }>) || [{ method: 'CASH', amount: Number(sale.paidAmountLkr) }];

        for (const split of splits) {
          const pmCode = split.method || 'CASH';
          const pm =
            (await this.paymentMethodRepo.findOne({
              where: { code: pmCode },
            })) ||
            (await this.paymentMethodRepo.findOne({
              where: { code: 'CASH' },
            }));

          if (pm) {
            await this.ledgerRepo.save(
              this.ledgerRepo.create({
                storeId,
                entryDate: sale.createdAt,
                direction: 'IN',
                amountLkr: Number(split.amount),
                paymentMethodId: pm.id,
                sourceType: 'SALE' as CashSourceType,
                sourceId: sale.id,
                description: `POS Sale Receipt #${sale.invoiceNumber} (${pm.name})`,
                userId: sale.cashierUserId || 'system',
              }),
            );
            salesBackfilled++;
          }
        }
      }
    }

    // 2. Backfill Supplier Payments
    const supplierPayments = await this.supplierPaymentRepo.find({
      where: { storeId },
      order: { paymentDate: 'ASC' },
    });

    for (const payment of supplierPayments) {
      const existing = await this.ledgerRepo.findOne({
        where: {
          storeId,
          sourceType: 'SUPPLIER_PAYMENT' as CashSourceType,
          sourceId: payment.id,
        },
      });

      if (!existing) {
        const pmCode =
          payment.paymentMethod === 'BANK_TRANSFER'
            ? 'BANK_TRANSFER'
            : payment.paymentMethod === 'CHEQUE'
              ? 'CHEQUE'
              : 'CASH';

        const pm =
          (await this.paymentMethodRepo.findOne({
            where: { code: pmCode },
          })) ||
          (await this.paymentMethodRepo.findOne({
            where: { code: 'CASH' },
          }));

        if (pm) {
          await this.ledgerRepo.save(
            this.ledgerRepo.create({
              storeId,
              entryDate: new Date(payment.paymentDate),
              direction: 'OUT',
              amountLkr: Number(payment.amountLkr),
              paymentMethodId: pm.id,
              bankAccountId:
                pmCode === 'BANK_TRANSFER' ? 'ba-comb-main' : undefined,
              sourceType: 'SUPPLIER_PAYMENT' as CashSourceType,
              sourceId: payment.id,
              description: `Supplier Payout #${payment.paymentNumber} (${payment.reference || pm.name})`,
              userId: payment.processedByUserId || 'system',
            }),
          );
          paymentsBackfilled++;
        }
      }
    }

    this.logger.log(
      `Backfill complete: ${salesBackfilled} sales, ${paymentsBackfilled} payments processed.`,
    );

    return { salesBackfilled, paymentsBackfilled };
  }
}
