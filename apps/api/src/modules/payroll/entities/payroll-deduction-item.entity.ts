import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { EmployeePayroll } from './employee-payroll.entity';
import { SalaryAdvance } from './salary-advance.entity';

const decimalToNumber = {
  to: (value?: number) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : Number(value),
};

@Entity('payroll_deduction_items')
export class PayrollDeductionItem extends BaseAppEntity {
  @ManyToOne(() => EmployeePayroll, (p) => p.deductionItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'payroll_id' })
  payroll!: EmployeePayroll;

  @Column({ name: 'payroll_id', type: 'varchar', length: 64 })
  payrollId!: string;

  @ManyToOne(() => SalaryAdvance, { nullable: true })
  @JoinColumn({ name: 'salary_advance_id' })
  salaryAdvance?: SalaryAdvance;

  @Column({
    name: 'salary_advance_id',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  salaryAdvanceId?: string | null;

  @Column({ type: 'varchar', length: 100 })
  description!: string;

  @Column({
    name: 'amount_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalToNumber,
  })
  amountLkr!: number;
}
