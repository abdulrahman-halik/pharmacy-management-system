import { Entity, Column, Index } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  PHARMACIST = 'PHARMACIST',
  CASHIER = 'CASHIER',
}

const decimalToNumber = {
  to: (value?: number) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : Number(value)),
};

@Entity('users')
export class User extends BaseAppEntity {
  @Column({ name: 'full_name', type: 'varchar', length: 120 })
  fullName!: string;

  @Index({ unique: true })
  @Column({ name: 'email', type: 'varchar', length: 150 })
  email!: string;

  @Column({ name: 'phone', type: 'varchar', length: 20 })
  phone!: string; // E.164 +94 format

  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CASHIER })
  role!: UserRole;

  @Column({
    name: 'monthly_salary',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
    transformer: decimalToNumber,
  })
  monthlySalary!: number; // In LKR - Restricted to ADMIN/MANAGER views

  @Column({ name: 'epf_number', type: 'varchar', length: 32, nullable: true })
  epfNumber?: string | null;

  @Column({ name: 'bank_name', type: 'varchar', length: 100, nullable: true })
  bankName?: string | null;

  @Column({ name: 'bank_account_number', type: 'varchar', length: 50, nullable: true })
  bankAccountNumber?: string | null;

  @Column({ name: 'bank_branch', type: 'varchar', length: 100, nullable: true })
  bankBranch?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'must_reset_password', type: 'boolean', default: false })
  mustResetPassword!: boolean;

  @Column({ name: 'failed_login_count', type: 'int', default: 0 })
  failedLoginCount!: number;

  @Column({ name: 'locked_until', type: 'datetime', nullable: true })
  lockedUntil?: Date | null;

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true })
  lastLoginAt?: Date | null;
}
