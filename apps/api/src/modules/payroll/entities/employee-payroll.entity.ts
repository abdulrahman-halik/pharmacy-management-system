import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
  OneToMany,
} from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { User } from '../../users/entities/user.entity';
import { PayrollDeductionItem } from './payroll-deduction-item.entity';
import { PayrollStatus, PAYROLL_STATUSES } from '@pharmacy/shared';

const decimalToNumber = {
  to: (value?: number) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : Number(value),
};

@Entity('employee_payroll')
@Unique('uq_user_payroll_month', ['userId', 'monthYear'])
export class EmployeePayroll extends BaseAppEntity {
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId!: string;

  @Index()
  @Column({ name: 'month_year', type: 'varchar', length: 7 })
  monthYear!: string; // e.g. "2026-10"

  @Column({
    name: 'base_salary_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalToNumber,
  })
  baseSalaryLkr!: number;

  @Column({
    name: 'bonus_allowance_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
    transformer: decimalToNumber,
  })
  bonusAllowanceLkr!: number;

  @Column({
    name: 'overtime_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
    transformer: decimalToNumber,
  })
  overtimeLkr!: number;

  @Column({
    name: 'gross_earnings_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalToNumber,
  })
  grossEarningsLkr!: number; // baseSalary + bonusAllowance + overtime

  @Column({
    name: 'statutory_deductions_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
    transformer: decimalToNumber,
  })
  statutoryDeductionsLkr!: number; // EPF 8% employee contribution

  @Column({
    name: 'advance_deducted_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
    transformer: decimalToNumber,
  })
  advanceDeductedLkr!: number;

  @Column({
    name: 'other_deductions_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
    transformer: decimalToNumber,
  })
  otherDeductionsLkr!: number;

  @Column({
    name: 'net_payable_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalToNumber,
  })
  netPayableLkr!: number; // grossEarnings - statutory - advanceDeducted - otherDeductions (Strictly >= 0)

  @Column({
    name: 'advance_carried_forward_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
    transformer: decimalToNumber,
  })
  advanceCarriedForwardLkr!: number; // Unrecovered advance carried to following month

  @Column({
    type: 'enum',
    enum: PAYROLL_STATUSES,
    default: 'DRAFT',
  })
  status!: PayrollStatus;

  @Column({ name: 'disbursed_at', type: 'datetime', nullable: true })
  disbursedAt?: Date | null;

  @Column({
    name: 'disbursement_method',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  disbursementMethod?: string | null; // 'CASH', 'BANK_TRANSFER'

  @OneToMany(() => PayrollDeductionItem, (item) => item.payroll)
  deductionItems!: PayrollDeductionItem[];
}
