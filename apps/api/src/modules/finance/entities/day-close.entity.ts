import { Entity, Column, Index, Unique } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { DenominationCounts } from '@pharmacy/shared';

@Entity('day_closes')
@Unique('uq_day_close_date_store', ['closingDate', 'storeId'])
export class DayClose extends BaseAppEntity {
  @Index()
  @Column({ name: 'closing_date', type: 'date' })
  closingDate!: Date | string;

  @Column({
    name: 'opening_cash_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
  })
  openingCashLkr!: number;

  @Column({
    name: 'cash_sales_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
  })
  cashSalesLkr!: number;

  @Column({
    name: 'cash_collections_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
  })
  cashCollectionsLkr!: number;

  @Column({
    name: 'cash_refunds_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
  })
  cashRefundsLkr!: number;

  @Column({
    name: 'cash_expenses_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
  })
  cashExpensesLkr!: number;

  @Column({
    name: 'expected_cash_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
  })
  expectedCashLkr!: number;

  @Column({
    name: 'counted_cash_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
  })
  countedCashLkr!: number;

  @Column({
    name: 'cash_variance_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
  })
  cashVarianceLkr!: number; // countedCash - expectedCash

  @Column({ name: 'variance_reason', type: 'varchar', length: 255, nullable: true })
  varianceReason?: string;

  @Column({ name: 'denominations_json', type: 'json' })
  denominationsJson!: DenominationCounts;

  @Column({ name: 'is_locked', type: 'boolean', default: true })
  isLocked!: boolean;

  @Column({ name: 'closed_by_user_id', type: 'varchar', length: 64 })
  closedByUserId!: string;

  @Column({ name: 'reopened_by_user_id', type: 'varchar', length: 64, nullable: true })
  reopenedByUserId?: string;

  @Column({ name: 'reopen_reason', type: 'varchar', length: 255, nullable: true })
  reopenReason?: string;
}
