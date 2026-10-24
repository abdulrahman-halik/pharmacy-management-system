import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { Prescription } from './prescription.entity';
import { Medicine } from '../../medicines/entities/medicine.entity';
import { PrescriptionItemStatus } from '@pharmacy/shared';

@Entity('prescription_items')
export class PrescriptionItem extends BaseAppEntity {
  @ManyToOne(() => Prescription, (rx) => rx.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prescription_id' })
  prescription!: Prescription;

  @Column({ name: 'prescription_id', type: 'varchar', length: 64 })
  prescriptionId!: string;

  @ManyToOne(() => Medicine, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'medicine_id' })
  medicine!: Medicine;

  @Column({ name: 'medicine_id', type: 'varchar', length: 64 })
  medicineId!: string;

  @Column({ type: 'varchar', length: 80 })
  dosage!: string; // e.g., "1 Tablet tds after meals"

  @Column({ name: 'duration_days', type: 'int', default: 5 })
  durationDays!: number;

  @Column({ name: 'prescribed_quantity_base_units', type: 'int' })
  prescribedQuantityBaseUnits!: number;

  @Column({ name: 'dispensed_quantity_base_units', type: 'int', default: 0 })
  dispensedQuantityBaseUnits!: number;

  @Column({ name: 'refill_allowed', type: 'boolean', default: false })
  refillAllowed!: boolean;

  @Column({ name: 'refills_allowed_count', type: 'int', default: 0 })
  refillsAllowedCount!: number;

  @Column({ name: 'refills_used', type: 'int', default: 0 })
  refillsUsed!: number;

  @Column({ name: 'refill_interval_days', type: 'int', default: 30 })
  refillIntervalDays!: number;

  @Column({ name: 'last_dispensed_at', type: 'datetime', nullable: true })
  lastDispensedAt?: Date | null;

  @Column({
    name: 'item_status',
    type: 'enum',
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
  })
  itemStatus!: PrescriptionItemStatus;
}
