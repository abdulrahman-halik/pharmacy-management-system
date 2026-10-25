import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { SaleItem } from './sale-item.entity';
import { InventoryBatch } from '../../inventory/entities/inventory-batch.entity';
import { decimalTransformer } from '../../../database/transformers';

@Entity('sale_item_allocations')
export class SaleItemAllocation extends BaseAppEntity {
  @ManyToOne(() => SaleItem, (item) => item.allocations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_item_id' })
  saleItem!: SaleItem;

  @Column({ name: 'sale_item_id', type: 'varchar', length: 64 })
  saleItemId!: string;

  @ManyToOne(() => InventoryBatch)
  @JoinColumn({ name: 'batch_id' })
  batch!: InventoryBatch;

  @Column({ name: 'batch_id', type: 'varchar', length: 64 })
  batchId!: string;

  @Column({ name: 'batch_number', type: 'varchar', length: 80 })
  batchNumber!: string;

  @Column({ name: 'expiry_date', type: 'date' })
  expiryDate!: string | Date;

  @Column({ name: 'allocated_base_units', type: 'int' })
  allocatedBaseUnits!: number;

  @Column({
    name: 'unit_cost_at_sale',
    type: 'decimal',
    precision: 14,
    scale: 4,
    transformer: decimalTransformer,
  })
  unitCostAtSale!: number;
}
