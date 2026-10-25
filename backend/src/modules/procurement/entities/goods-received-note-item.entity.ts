import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { decimalTransformer } from '../../../database/transformers';
import { GoodsReceivedNote } from './goods-received-note.entity';
import { Medicine } from '../../medicines/entities/medicine.entity';
import { PackagingLevel, PACKAGING_LEVELS } from '@pharmacy/shared';

@Entity('goods_received_note_items')
export class GoodsReceivedNoteItem extends BaseAppEntity {
  @ManyToOne(() => GoodsReceivedNote, (grn) => grn.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'grn_id' })
  grn!: GoodsReceivedNote;

  @Column({ name: 'grn_id', type: 'varchar', length: 36 })
  grnId!: string;

  @ManyToOne(() => Medicine, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'medicine_id' })
  medicine!: Medicine;

  @Column({ name: 'medicine_id', type: 'varchar', length: 36 })
  medicineId!: string;

  @Column({ name: 'batch_number', type: 'varchar', length: 80 })
  batchNumber!: string;

  @Column({ name: 'mfd_date', type: 'date', nullable: true })
  mfdDate?: Date | string | null;

  @Column({ name: 'expiry_date', type: 'date' })
  expiryDate!: Date | string;

  @Column({
    name: 'packaging_level',
    type: 'enum',
    enum: PACKAGING_LEVELS,
    default: 'BOX',
  })
  packagingLevel!: PackagingLevel;

  @Column({ name: 'purchased_quantity', type: 'int' })
  purchasedQuantity!: number;

  @Column({ name: 'bonus_quantity', type: 'int', default: 0 })
  bonusQuantity!: number;

  @Column({ name: 'total_received_base_units', type: 'int' })
  totalReceivedBaseUnits!: number;

  @Column({
    name: 'purchase_price_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  purchasePriceLkr!: number;

  @Column({
    name: 'line_total_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  lineTotalLkr!: number;

  @Column({
    name: 'net_landed_cost_per_base_unit',
    type: 'decimal',
    precision: 14,
    scale: 4,
    transformer: decimalTransformer,
  })
  netLandedCostPerBaseUnit!: number;

  @Column({
    name: 'batch_mrp_per_base_unit',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  batchMrpPerBaseUnit!: number;
}
