import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { decimalTransformer } from '../../../database/transformers';
import { Medicine } from '../../medicines/entities/medicine.entity';
import { InventoryBatch } from './inventory-batch.entity';
import { MovementType, MOVEMENT_TYPES } from '@pharmacy/shared';

@Entity('stock_movements')
@Index('idx_movement_history', ['medicineId', 'batchId', 'createdAt'])
export class StockMovement extends BaseAppEntity {
  @ManyToOne(() => Medicine, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'medicine_id' })
  medicine!: Medicine;

  @Column({ name: 'medicine_id', type: 'varchar', length: 36 })
  medicineId!: string;

  @ManyToOne(() => InventoryBatch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'batch_id' })
  batch!: InventoryBatch;

  @Column({ name: 'batch_id', type: 'varchar', length: 36 })
  batchId!: string;

  @Column({
    name: 'movement_type',
    type: 'enum',
    enum: MOVEMENT_TYPES,
  })
  movementType!: MovementType;

  @Column({ name: 'quantity_base_units', type: 'int' })
  quantityBaseUnits!: number;

  @Column({ name: 'balance_after', type: 'int' })
  balanceAfter!: number;

  @Column({
    name: 'unit_cost_price',
    type: 'decimal',
    precision: 14,
    scale: 4,
    transformer: decimalTransformer,
  })
  unitCostPrice!: number;

  @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: true })
  referenceType?: string | null;

  @Column({ name: 'reference_id', type: 'varchar', length: 64, nullable: true })
  referenceId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason?: string | null;

  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId!: string;
}
