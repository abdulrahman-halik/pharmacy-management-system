import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { PACKAGING_LEVELS, type PackagingLevel } from '@pharmacy/shared';
import { BaseAppEntity } from '../../../database/base.entity';
import { decimalTransformer } from '../../../database/transformers';
import { Medicine } from './medicine.entity';

@Entity('medicine_price_overrides')
@Index('uq_price_override_medicine_level', ['medicineId', 'packagingLevel'], { unique: true })
export class MedicinePriceOverride extends BaseAppEntity {
  @ManyToOne(() => Medicine, (medicine) => medicine.priceOverrides, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'medicine_id' })
  medicine?: Medicine;

  @Column({ name: 'medicine_id', type: 'varchar', length: 36 })
  medicineId!: string;

  @Column({ name: 'packaging_level', type: 'enum', enum: PACKAGING_LEVELS })
  packagingLevel!: PackagingLevel;

  /** LKR selling price for one unit of this packaging level. */
  @Column({ name: 'selling_price', type: 'decimal', precision: 12, scale: 2, transformer: decimalTransformer })
  sellingPrice!: number;
}
