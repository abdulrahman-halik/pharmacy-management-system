import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { decimalTransformer } from '../../../database/transformers';
import { StockAuditSession } from './stock-audit-session.entity';
import { Medicine } from '../../medicines/entities/medicine.entity';
import { InventoryBatch } from './inventory-batch.entity';

@Entity('stock_audit_items')
export class StockAuditItem extends BaseAppEntity {
  @ManyToOne(() => StockAuditSession, (session) => session.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: StockAuditSession;

  @Column({ name: 'session_id', type: 'varchar', length: 36 })
  sessionId!: string;

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

  @Column({ name: 'system_quantity_base_units', type: 'int' })
  systemQuantityBaseUnits!: number;

  @Column({ name: 'counted_quantity_base_units', type: 'int' })
  countedQuantityBaseUnits!: number;

  @Column({ name: 'variance_quantity_base_units', type: 'int' })
  varianceQuantityBaseUnits!: number; // counted - system

  @Column({
    name: 'variance_cost_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
    transformer: decimalTransformer,
  })
  varianceCostLkr!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes?: string | null;
}
