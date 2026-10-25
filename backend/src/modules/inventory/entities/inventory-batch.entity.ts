import { Entity, Column, Index, ManyToOne, JoinColumn, Unique, Check } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { decimalTransformer } from '../../../database/transformers';
import { Medicine } from '../../medicines/entities/medicine.entity';
import { BatchStatus, BATCH_STATUSES } from '@pharmacy/shared';

@Entity('inventory_batches')
@Unique('uq_med_batch_expiry', ['medicineId', 'batchNumber', 'expiryDate'])
@Check('chk_batch_qty_positive', 'quantity_base_units >= 0')
@Index('idx_fefo_lookup', ['medicineId', 'status', 'expiryDate'])
export class InventoryBatch extends BaseAppEntity {
  @ManyToOne(() => Medicine, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'medicine_id' })
  medicine!: Medicine;

  @Column({ name: 'medicine_id', type: 'varchar', length: 36 })
  medicineId!: string;

  @Column({ name: 'batch_number', type: 'varchar', length: 80 })
  batchNumber!: string;

  @Column({ name: 'mfd_date', type: 'date', nullable: true })
  mfdDate?: Date | string | null;

  @Index()
  @Column({ name: 'expiry_date', type: 'date' })
  expiryDate!: Date | string;

  @Column({ name: 'quantity_base_units', type: 'int', default: 0 })
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
    name: 'batch_mrp',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  batchMrp!: number;

  @Column({ name: 'supplier_id', type: 'varchar', length: 64, nullable: true })
  supplierId?: string | null;

  @Column({
    type: 'enum',
    enum: BATCH_STATUSES,
    default: 'ACTIVE',
  })
  status!: BatchStatus;
}
