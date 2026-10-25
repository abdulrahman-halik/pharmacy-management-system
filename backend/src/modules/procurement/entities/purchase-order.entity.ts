import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { decimalTransformer } from '../../../database/transformers';
import { Supplier } from './supplier.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { PurchaseOrderStatus, PURCHASE_ORDER_STATUSES } from '@pharmacy/shared';

@Entity('purchase_orders')
export class PurchaseOrder extends BaseAppEntity {
  @Index({ unique: true })
  @Column({ name: 'po_number', type: 'varchar', length: 40 })
  poNumber!: string;

  @ManyToOne(() => Supplier, (s) => s.purchaseOrders, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: Supplier;

  @Column({ name: 'supplier_id', type: 'varchar', length: 36 })
  supplierId!: string;

  @Column({ name: 'order_date', type: 'date' })
  orderDate!: Date | string;

  @Column({ name: 'expected_delivery_date', type: 'date', nullable: true })
  expectedDeliveryDate?: Date | string | null;

  @Column({
    type: 'enum',
    enum: PURCHASE_ORDER_STATUSES,
    default: 'DRAFT',
  })
  status!: PurchaseOrderStatus;

  @Column({
    name: 'total_amount_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
    transformer: decimalTransformer,
  })
  totalAmountLkr!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @OneToMany(() => PurchaseOrderItem, (item) => item.purchaseOrder, { cascade: true })
  items!: PurchaseOrderItem[];
}
