import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { decimalTransformer } from '../../../database/transformers';
import { Supplier } from './supplier.entity';
import { PurchaseReturnItem } from './purchase-return-item.entity';
import { PurchaseReturnReason, PURCHASE_RETURN_REASONS } from '@pharmacy/shared';

@Entity('purchase_returns')
export class PurchaseReturn extends BaseAppEntity {
  @Index({ unique: true })
  @Column({ name: 'return_number', type: 'varchar', length: 40 })
  returnNumber!: string;

  @ManyToOne(() => Supplier, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: Supplier;

  @Column({ name: 'supplier_id', type: 'varchar', length: 36 })
  supplierId!: string;

  @Column({ name: 'return_date', type: 'date' })
  returnDate!: Date | string;

  @Column({
    name: 'total_refund_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  totalRefundLkr!: number;

  @Column({
    type: 'enum',
    enum: PURCHASE_RETURN_REASONS,
    default: 'EXPIRED',
  })
  reason!: PurchaseReturnReason;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'processed_by_user_id', type: 'varchar', length: 64 })
  processedByUserId!: string;

  @OneToMany(() => PurchaseReturnItem, (item) => item.purchaseReturn, { cascade: true })
  items!: PurchaseReturnItem[];
}
