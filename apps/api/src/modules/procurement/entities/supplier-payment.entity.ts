import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { decimalTransformer } from '../../../database/transformers';
import { Supplier } from './supplier.entity';
import { SupplierPaymentMethod, SUPPLIER_PAYMENT_METHODS } from '@pharmacy/shared';

@Entity('supplier_payments')
export class SupplierPayment extends BaseAppEntity {
  @Index({ unique: true })
  @Column({ name: 'payment_number', type: 'varchar', length: 40 })
  paymentNumber!: string;

  @ManyToOne(() => Supplier, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: Supplier;

  @Column({ name: 'supplier_id', type: 'varchar', length: 36 })
  supplierId!: string;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate!: Date | string;

  @Column({
    name: 'amount_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  amountLkr!: number;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: SUPPLIER_PAYMENT_METHODS,
    default: 'BANK_TRANSFER',
  })
  paymentMethod!: SupplierPaymentMethod;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference?: string | null;

  @Column({ name: 'bank_account_id', type: 'varchar', length: 100, nullable: true })
  bankAccountId?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'grn_allocations_json', type: 'text', nullable: true })
  grnAllocationsJson?: string | null;

  @Column({ name: 'processed_by_user_id', type: 'varchar', length: 64 })
  processedByUserId!: string;
}
