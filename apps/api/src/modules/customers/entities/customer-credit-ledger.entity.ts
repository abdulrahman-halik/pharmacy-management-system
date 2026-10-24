import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { decimalTransformer } from '../../../database/transformers';
import { Customer } from './customer.entity';

@Entity('customer_credit_ledgers')
@Index('idx_credit_customer', ['customerId', 'createdAt'])
export class CustomerCreditLedger extends BaseAppEntity {
  @ManyToOne(() => Customer, (cust) => cust.creditLedgers, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer;

  @Column({ name: 'customer_id', type: 'varchar', length: 64 })
  customerId!: string;

  @Column({ name: 'entry_type', type: 'varchar', length: 30 })
  entryType!: string; // CREDIT_PURCHASE, PAYMENT, ADJUSTMENT

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  amount!: number; // Positive = increases credit balance, Negative = payment/repayment

  @Column({
    name: 'running_balance',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  runningBalance!: number;

  @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: true })
  referenceType?: string | null;

  @Column({ name: 'reference_id', type: 'varchar', length: 64, nullable: true })
  referenceId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes?: string | null;

  @Column({ name: 'recorded_by', type: 'varchar', length: 64 })
  recordedBy!: string; // User ID
}
