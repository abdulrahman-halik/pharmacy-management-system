import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { BankAccount } from './bank-account.entity';
import { PaymentMethod } from './payment-method.entity';
import { CashDirection, CashSourceType } from '@pharmacy/shared';

@Entity('cash_ledger_entries')
@Index('idx_cash_date_source', ['entryDate', 'sourceType'])
export class CashLedgerEntry extends BaseAppEntity {
  @Index()
  @Column({ name: 'entry_date', type: 'datetime' })
  entryDate!: Date;

  @Column({ type: 'enum', enum: ['IN', 'OUT'] })
  direction!: CashDirection;

  @Column({ name: 'amount_lkr', type: 'decimal', precision: 14, scale: 2 })
  amountLkr!: number;

  @ManyToOne(() => PaymentMethod, { nullable: false })
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethod!: PaymentMethod;

  @Column({ name: 'payment_method_id', type: 'varchar', length: 64 })
  paymentMethodId!: string;

  @ManyToOne(() => BankAccount, { nullable: true })
  @JoinColumn({ name: 'bank_account_id' })
  bankAccount?: BankAccount;

  @Column({
    name: 'bank_account_id',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  bankAccountId?: string;

  @Column({
    name: 'source_type',
    type: 'enum',
    enum: [
      'SALE',
      'SALE_RETURN',
      'CUSTOMER_COLLECTION',
      'SUPPLIER_PAYMENT',
      'PURCHASE_RETURN_REFUND',
      'EXPENSE',
      'OTHER_INCOME',
      'SALARY',
      'ADVANCE',
      'OPENING',
      'TRANSFER',
    ],
  })
  sourceType!: CashSourceType;

  @Column({ name: 'source_id', type: 'varchar', length: 64, nullable: true })
  sourceId?: string; // Links to Sale ID, Expense ID, SupplierPayment ID

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId!: string;
}
