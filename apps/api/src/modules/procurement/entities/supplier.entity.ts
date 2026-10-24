import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { decimalTransformer } from '../../../database/transformers';
import { PurchaseOrder } from './purchase-order.entity';
import { GoodsReceivedNote } from './goods-received-note.entity';

@Entity('suppliers')
export class Supplier extends BaseAppEntity {
  @Index()
  @Column({ name: 'company_name', type: 'varchar', length: 150 })
  companyName!: string;

  @Column({ name: 'contact_person', type: 'varchar', length: 100, nullable: true })
  contactPerson?: string | null;

  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email?: string | null;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column({ name: 'tax_tin_number', type: 'varchar', length: 50, nullable: true })
  taxTinNumber?: string | null;

  @Column({ name: 'payment_terms_days', type: 'int', default: 30 })
  paymentTermsDays!: number;

  @Column({
    name: 'outstanding_payable_lkr',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0.0,
    transformer: decimalTransformer,
  })
  outstandingPayableLkr!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => PurchaseOrder, (po) => po.supplier)
  purchaseOrders!: PurchaseOrder[];

  @OneToMany(() => GoodsReceivedNote, (grn) => grn.supplier)
  goodsReceivedNotes!: GoodsReceivedNote[];
}
