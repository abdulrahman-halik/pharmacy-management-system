import { Entity, Column, Index } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';

@Entity('doctors')
export class Doctor extends BaseAppEntity {
  @Column({ name: 'full_name', type: 'varchar', length: 120 })
  fullName!: string; // e.g. "Dr. K. A. Perera"

  @Index({ unique: true })
  @Column({ name: 'registration_number', type: 'varchar', length: 40 })
  registrationNumber!: string; // Sri Lanka Medical Council (SLMC) Registration No

  @Column({ type: 'varchar', length: 80, nullable: true })
  specialization?: string | null; // e.g., "Consultant Physician", "Pediatrician", "Cardiologist"

  @Column({ name: 'clinic_name', type: 'varchar', length: 120, nullable: true })
  clinicName?: string | null;

  @Column({ name: 'mobile_number', type: 'varchar', length: 20, nullable: true })
  mobileNumber?: string | null;

  @Column({ name: 'clinic_address', type: 'text', nullable: true })
  clinicAddress?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
