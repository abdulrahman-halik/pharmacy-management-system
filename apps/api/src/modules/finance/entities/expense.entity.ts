import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { ExpenseCategory } from './expense-category.entity';
import { PaymentMethod } from './payment-method.entity';
import { BankAccount } from './bank-account.entity';

@Entity('expenses')
export class Expense extends BaseAppEntity {
  @Index()
  @Column({ name: 'expense_date', type: 'date' })
  expenseDate!: Date | string;

  @ManyToOne(() => ExpenseCategory, { nullable: false })
  @JoinColumn({ name: 'category_id' })
  category!: ExpenseCategory;

  @Column({ name: 'category_id', type: 'varchar', length: 64 })
  categoryId!: string;

  @Column({ name: 'amount_lkr', type: 'decimal', precision: 12, scale: 2 })
  amountLkr!: number;

  @ManyToOne(() => PaymentMethod, { nullable: false })
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethod!: PaymentMethod;

  @Column({ name: 'payment_method_id', type: 'varchar', length: 64 })
  paymentMethodId!: string;

  @ManyToOne(() => BankAccount, { nullable: true })
  @JoinColumn({ name: 'bank_account_id' })
  bankAccount?: BankAccount;

  @Column({ name: 'bank_account_id', type: 'varchar', length: 64, nullable: true })
  bankAccountId?: string;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({ name: 'receipt_image_url', type: 'varchar', length: 255, nullable: true })
  receiptImageUrl?: string;

  @Column({ name: 'created_by_user_id', type: 'varchar', length: 64 })
  createdByUserId!: string;
}
