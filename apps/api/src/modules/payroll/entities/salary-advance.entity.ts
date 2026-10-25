import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { User } from '../../users/entities/user.entity';
import { PaymentMethod } from '../../finance/entities/payment-method.entity';
import { AdvanceStatus, ADVANCE_STATUSES } from '@pharmacy/shared';
export { AdvanceStatus, ADVANCE_STATUSES };

const decimalToNumber = {
  to: (value?: number) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : Number(value),
};

@Entity('salary_advances')
@Index('idx_user_advance_status', ['userId', 'status'])
@Index('idx_advance_date', ['advanceDate'])
export class SalaryAdvance extends BaseAppEntity {
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId!: string;

  @Column({ name: 'advance_date', type: 'date' })
  advanceDate!: Date | string;

  @Column({
    name: 'amount_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalToNumber,
  })
  amountLkr!: number;

  @Column({
    name: 'recovered_amount_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
    transformer: decimalToNumber,
  })
  recoveredAmountLkr!: number;

  @Column({
    name: 'remaining_balance_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalToNumber,
  })
  remainingBalanceLkr!: number;

  @Column({ type: 'varchar', length: 255 })
  reason!: string;

  @ManyToOne(() => PaymentMethod, { nullable: true })
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethod?: PaymentMethod;

  @Column({ name: 'payment_method_id', type: 'varchar', length: 64 })
  paymentMethodId!: string;

  @Column({
    type: 'enum',
    enum: ADVANCE_STATUSES,
    default: 'OUTSTANDING',
  })
  status!: AdvanceStatus;

  @Column({ name: 'approved_by_user_id', type: 'varchar', length: 64 })
  approvedByUserId!: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by_user_id' })
  approvedByUser?: User;
}
