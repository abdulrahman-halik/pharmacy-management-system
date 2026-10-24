import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { PrescriptionItem } from './prescription-item.entity';
import { PrescriptionStatus } from '@pharmacy/shared';

@Entity('prescriptions')
export class Prescription extends BaseAppEntity {
  @Index({ unique: true })
  @Column({ name: 'rx_number', type: 'varchar', length: 40 })
  rxNumber!: string; // e.g., "RX-202610-0089"

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer;

  @Column({ name: 'customer_id', type: 'varchar', length: 64 })
  customerId!: string;

  @ManyToOne(() => Doctor, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  @Column({ name: 'doctor_id', type: 'varchar', length: 64 })
  doctorId!: string;

  @Column({ name: 'issued_date', type: 'date' })
  issuedDate!: string;

  @Column({ name: 'valid_until', type: 'date' })
  validUntil!: string;

  @Column({
    type: 'enum',
    enum: [
      'PENDING',
      'VERIFIED',
      'REJECTED',
      'EXPIRED',
      'FULLY_DISPENSED',
    ],
    default: 'PENDING',
  })
  status!: PrescriptionStatus;

  @Column({ name: 'image_urls', type: 'json' })
  imageUrls!: string[]; // MinIO S3 object keys

  @Column({ name: 'verified_by', type: 'varchar', length: 64, nullable: true })
  verifiedBy?: string | null; // Pharmacist user ID

  @Column({ name: 'verified_at', type: 'datetime', nullable: true })
  verifiedAt?: Date | null;

  @Column({ name: 'rejection_reason', type: 'varchar', length: 255, nullable: true })
  rejectionReason?: string | null;

  @OneToMany(() => PrescriptionItem, (item) => item.prescription, { cascade: true })
  items!: PrescriptionItem[];
}
