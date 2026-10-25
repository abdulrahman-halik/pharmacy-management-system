import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { Customer } from './customer.entity';

@Entity('customer_loyalty_ledgers')
@Index('idx_loyalty_customer', ['customerId', 'createdAt'])
export class CustomerLoyaltyLedger extends BaseAppEntity {
  @ManyToOne(() => Customer, (cust) => cust.loyaltyLedgers, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer;

  @Column({ name: 'customer_id', type: 'varchar', length: 64 })
  customerId!: string;

  @Column({ name: 'entry_type', type: 'varchar', length: 30 })
  entryType!: string; // EARNED, REDEEMED, EXPIRED, ADJUSTMENT

  @Column({ type: 'int' })
  points!: number; // Positive = earned, Negative = redeemed

  @Column({ name: 'running_points', type: 'int' })
  runningPoints!: number;

  @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: true })
  referenceType?: string | null;

  @Column({ name: 'reference_id', type: 'varchar', length: 64, nullable: true })
  referenceId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes?: string | null;

  @Column({ name: 'recorded_by', type: 'varchar', length: 64 })
  recordedBy!: string; // User ID
}
