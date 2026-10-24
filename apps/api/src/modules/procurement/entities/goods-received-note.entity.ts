import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany, Unique } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { decimalTransformer } from '../../../database/transformers';
import { Supplier } from './supplier.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { GoodsReceivedNoteItem } from './goods-received-note-item.entity';
import { GrnPaymentStatus, GRN_PAYMENT_STATUSES } from '@pharmacy/shared';

@Entity('goods_received_notes')
@Unique('uq_supplier_invoice', ['supplierId', 'supplierInvoiceNumber'])
export class GoodsReceivedNote extends BaseAppEntity {
  @Index({ unique: true })
  @Column({ name: 'grn_number', type: 'varchar', length: 40 })
  grnNumber!: string;

  @ManyToOne(() => Supplier, (s) => s.goodsReceivedNotes, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: Supplier;

  @Column({ name: 'supplier_id', type: 'varchar', length: 36 })
  supplierId!: string;

  @ManyToOne(() => PurchaseOrder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder?: PurchaseOrder | null;

  @Column({ name: 'purchase_order_id', type: 'varchar', length: 36, nullable: true })
  purchaseOrderId?: string | null;

  @Index()
  @Column({ name: 'supplier_invoice_number', type: 'varchar', length: 80 })
  supplierInvoiceNumber!: string;

  @Column({ name: 'received_date', type: 'date' })
  receivedDate!: Date | string;

  @Column({
    name: 'subtotal_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  subtotalLkr!: number;

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
    default: 0.0,
    transformer: decimalTransformer,
  })
  paidAmountLkr!: number;

  @Column({
    type: 'enum',
    enum: GRN_PAYMENT_STATUSES,
    default: 'UNPAID',
  })
  paymentStatus!: GrnPaymentStatus;

  @Column({ name: 'received_by_user_id', type: 'varchar', length: 64 })
  receivedByUserId!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @OneToMany(() => GoodsReceivedNoteItem, (item) => item.grn, { cascade: true })
  items!: GoodsReceivedNoteItem[];
}
