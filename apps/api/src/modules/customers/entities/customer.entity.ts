import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { decimalTransformer } from '../../../database/transformers';
import { CustomerCreditLedger } from './customer-credit-ledger.entity';
import { CustomerLoyaltyLedger } from './customer-loyalty-ledger.entity';

@Entity('customers')
export class Customer extends BaseAppEntity {
  @Column({ name: 'full_name', type: 'varchar', length: 120 })
  fullName!: string;

  @Index()
  @Column({ name: 'phone', type: 'varchar', length: 20 })
  phone!: string; // Normalized Sri Lankan phone (+947...)

  @Column({ name: 'email', type: 'varchar', length: 150, nullable: true })
  email?: string | null;

  @Index()
  @Column({ name: 'nic_or_passport', type: 'varchar', length: 32, nullable: true })
  nicOrPassport?: string | null;

  @Column({ name: 'dob', type: 'date', nullable: true })
  dob?: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  gender?: string | null;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column({ type: 'json', nullable: true })
  allergies?: string[] | null; // Generic names e.g. ["Amoxicillin", "Penicillin", "Sulfa"]

  @Column({ name: 'medical_notes', type: 'text', nullable: true })
  medicalNotes?: string | null;

  @Column({
    name: 'credit_limit',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
    transformer: decimalTransformer,
  })
  creditLimit!: number; // In LKR

  @Column({
    name: 'credit_balance',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
    transformer: decimalTransformer,
  })
  creditBalance!: number; // Outstanding balance in LKR

  @Column({ name: 'loyalty_points', type: 'int', default: 0 })
  loyaltyPoints!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => CustomerCreditLedger, (ledger) => ledger.customer)
  creditLedgers?: CustomerCreditLedger[];

  @OneToMany(() => CustomerLoyaltyLedger, (ledger) => ledger.customer)
  loyaltyLedgers?: CustomerLoyaltyLedger[];
}
