import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { decimalTransformer } from '../../../database/transformers';
import { PurchaseReturn } from './purchase-return.entity';
import { InventoryBatch } from '../../inventory/entities/inventory-batch.entity';

@Entity('purchase_return_items')
export class PurchaseReturnItem extends BaseAppEntity {
  @ManyToOne(() => PurchaseReturn, (ret) => ret.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_return_id' })
  purchaseReturn!: PurchaseReturn;

  @Column({ name: 'purchase_return_id', type: 'varchar', length: 36 })
  purchaseReturnId!: string;

  @ManyToOne(() => InventoryBatch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'batch_id' })
  batch!: InventoryBatch;

  @Column({ name: 'batch_id', type: 'varchar', length: 36 })
  batchId!: string;

  @Column({ name: 'quantity_base_units', type: 'int' })
  quantityBaseUnits!: number;

  @Column({
    name: 'unit_cost_price',
    type: 'decimal',
    precision: 14,
    scale: 4,
    transformer: decimalTransformer,
  })
  unitCostPrice!: number;

  @Column({
    name: 'line_total_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  lineTotalLkr!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason?: string | null;
}
