import { Entity, Column, Index, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { SaleItem } from './sale-item.entity';
import { PaymentMethodType, SaleStatus, SplitPayment } from '@pharmacy/shared';
import { decimalTransformer } from '../../../database/transformers';

@Entity('sales')
export class Sale extends BaseAppEntity {
  @Index({ unique: true })
  @Column({ name: 'invoice_number', type: 'varchar', length: 40 })
  invoiceNumber!: string;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer | null;

  @Index()
  @Column({ name: 'customer_id', type: 'varchar', length: 64, nullable: true })
  customerId?: string | null;

  @Column({ name: 'cashier_user_id', type: 'varchar', length: 64 })
  cashierUserId!: string;

  @Column({
    name: 'subtotal_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  subtotalLkr!: number;

  @Column({
    name: 'discount_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
    transformer: decimalTransformer,
  })
  discountLkr!: number;

  @Column({
    name: 'tax_vat_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
    transformer: decimalTransformer,
  })
  taxVatLkr!: number;

  @Column({
    name: 'tax_sscl_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
    transformer: decimalTransformer,
  })
  taxSsclLkr!: number;

  @Column({
    name: 'loyalty_redeemed_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
    transformer: decimalTransformer,
  })
  loyaltyRedeemedLkr!: number;

  @Column({
    name: 'round_off_lkr',
    type: 'decimal',
    precision: 6,
    scale: 2,
    default: 0.0,
    transformer: decimalTransformer,
  })
  roundOffLkr!: number;

  @Column({
    name: 'grand_total_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  grandTotalLkr!: number;

  @Column({
    name: 'paid_amount_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  paidAmountLkr!: number;

  @Column({
    name: 'change_given_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
    transformer: decimalTransformer,
  })
  changeGivenLkr!: number;

  @Column({ name: 'split_payments', type: 'json' })
  splitPayments!: SplitPayment[];

  @Column({
    type: 'enum',
    enum: ['COMPLETED', 'REFUNDED_PARTIAL', 'REFUNDED_FULL', 'VOIDED'],
    default: 'COMPLETED',
  })
  status!: SaleStatus;

  @Column({ name: 'prescription_id', type: 'varchar', length: 64, nullable: true })
  prescriptionId?: string | null;

  @Index({ unique: true })
  @Column({ name: 'idempotency_key', type: 'varchar', length: 128, nullable: true })
  idempotencyKey?: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string | null;

  @OneToMany(() => SaleItem, (item) => item.sale, { cascade: true })
  items!: SaleItem[];
}
