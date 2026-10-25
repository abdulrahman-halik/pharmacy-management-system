import { Entity, Column, Index, ManyToOne, JoinColumn, OneToOne, OneToMany, VersionColumn } from 'typeorm';
import {
  DOSAGE_FORMS,
  SCHEDULE_CLASSES,
  STORAGE_CONDITIONS,
  type DosageForm,
  type ScheduleClass,
  type StorageCondition,
} from '@pharmacy/shared';
import { BaseAppEntity } from '../../../database/base.entity';
import { decimalTransformer } from '../../../database/transformers';
import { Category } from './category.entity';
import { MedicinePackaging } from './medicine-packaging.entity';
import { MedicinePriceOverride } from './medicine-price-override.entity';

@Entity('medicines')
@Index('idx_med_fulltext', ['name', 'genericName'], { fulltext: true })
@Index('uq_medicines_store_barcode', ['storeId', 'barcode'], { unique: true })
@Index('idx_medicines_store_name', ['storeId', 'name'])
@Index('idx_medicines_store_generic', ['storeId', 'genericName'])
@Index('idx_medicines_store_schedule', ['storeId', 'scheduleClass'])
@Index('idx_medicines_nsqu_code', ['nsquCode'])
export class Medicine extends BaseAppEntity {
  @Column({ type: 'varchar', length: 180 })
  name!: string;

  @Column({ name: 'generic_name', type: 'varchar', length: 180 })
  genericName!: string;

  @Column({ name: 'brand_manufacturer', type: 'varchar', length: 120 })
  brandManufacturer!: string;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category?: Category | null;

  @Column({ name: 'category_id', type: 'varchar', length: 36, nullable: true })
  categoryId!: string | null;

  @Column({ type: 'varchar', length: 60 })
  strength!: string;

  @Column({ name: 'dosage_form', type: 'enum', enum: DOSAGE_FORMS, default: 'TABLET' })
  dosageForm!: DosageForm;

  @Column({ type: 'varchar', length: 64, nullable: true })
  barcode!: string | null;

  @Column({ name: 'qr_code', type: 'varchar', length: 128, nullable: true })
  qrCode!: string | null;

  /** Sri Lanka NMRA registration certificate number. */
  @Column({ name: 'nsqu_code', type: 'varchar', length: 64, nullable: true })
  nsquCode!: string | null;

  @Column({ name: 'hsn_code', type: 'varchar', length: 32, nullable: true })
  hsnCode!: string | null;

  @Column({ name: 'vat_percentage', type: 'decimal', precision: 5, scale: 2, default: 0, transformer: decimalTransformer })
  vatPercentage!: number;

  @Column({ name: 'is_vat_exempt', type: 'boolean', default: true })
  isVatExempt!: boolean;

  /** Expressed in base units. */
  @Column({ name: 'reorder_level', type: 'int', unsigned: true, default: 50 })
  reorderLevel!: number;

  @Column({ name: 'rack_location', type: 'varchar', length: 40, nullable: true })
  rackLocation!: string | null;

  @Column({ name: 'schedule_class', type: 'enum', enum: SCHEDULE_CLASSES, default: 'OTC' })
  scheduleClass!: ScheduleClass;

  @Column({ name: 'storage_condition', type: 'enum', enum: STORAGE_CONDITIONS, default: 'ROOM_TEMPERATURE' })
  storageCondition!: StorageCondition;

  @Column({ name: 'requires_prescription', type: 'boolean', default: false })
  requiresPrescription!: boolean;

  @Column({ name: 'is_controlled_substance', type: 'boolean', default: false })
  isControlledSubstance!: boolean;

  /** Catalogue MRP per base unit (LKR). Ceiling for every packaging-level selling price. */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, transformer: decimalTransformer })
  mrp!: number | null;

  @VersionColumn({ type: 'int', unsigned: true, default: 1 })
  version!: number;

  @OneToOne(() => MedicinePackaging, (packaging) => packaging.medicine, { cascade: ['insert', 'update'] })
  packaging!: MedicinePackaging;

  @OneToMany(() => MedicinePriceOverride, (override) => override.medicine)
  priceOverrides!: MedicinePriceOverride[];
}
