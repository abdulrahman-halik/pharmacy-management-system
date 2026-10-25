import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { decimalTransformer } from '../../../database/transformers';
import { PurchaseOrder } from './purchase-order.entity';
import { Medicine } from '../../medicines/entities/medicine.entity';
import { PackagingLevel, PACKAGING_LEVELS } from '@pharmacy/shared';

@Entity('purchase_order_items')
export class PurchaseOrderItem extends BaseAppEntity {
  @ManyToOne(() => PurchaseOrder, (po) => po.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder!: PurchaseOrder;

  @Column({ name: 'purchase_order_id', type: 'varchar', length: 36 })
  purchaseOrderId!: string;

  @ManyToOne(() => Medicine, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'medicine_id' })
  medicine!: Medicine;

  @Column({ name: 'medicine_id', type: 'varchar', length: 36 })
  medicineId!: string;

  @Column({
    name: 'packaging_level',
    type: 'enum',
    enum: PACKAGING_LEVELS,
    default: 'BOX',
  })
  packagingLevel!: PackagingLevel;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({
    name: 'unit_cost_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  unitCostLkr!: number;

  @Column({
    name: 'line_total_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  lineTotalLkr!: number;

  @Column({ name: 'received_quantity', type: 'int', default: 0 })
  receivedQuantity!: number;
}
