import { Entity, Column, Index } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';

@Entity('bank_accounts')
export class BankAccount extends BaseAppEntity {
  @Column({ name: 'bank_name', type: 'varchar', length: 100 })
  bankName!: string;

  @Column({ name: 'branch_name', type: 'varchar', length: 80 })
  branchName!: string;

  @Index({ unique: true })
  @Column({ name: 'account_number', type: 'varchar', length: 40 })
  accountNumber!: string;

  @Column({ name: 'account_name', type: 'varchar', length: 120 })
  accountName!: string;

  @Column({
    name: 'opening_balance_lkr',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0.0,
  })
  openingBalanceLkr!: number;

  @Column({
    name: 'current_balance_lkr',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0.0,
  })
  currentBalanceLkr!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
