import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { Sale } from './sale.entity';
import { Medicine } from '../../medicines/entities/medicine.entity';
import { PackagingLevel } from '@pharmacy/shared';
import { SaleItemAllocation } from './sale-item-allocation.entity';
import { decimalTransformer } from '../../../database/transformers';

@Entity('sale_items')
export class SaleItem extends BaseAppEntity {
  @ManyToOne(() => Sale, (sale) => sale.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_id' })
  sale!: Sale;

  @Column({ name: 'sale_id', type: 'varchar', length: 64 })
  saleId!: string;

  @ManyToOne(() => Medicine)
  @JoinColumn({ name: 'medicine_id' })
  medicine!: Medicine;

  @Column({ name: 'medicine_id', type: 'varchar', length: 64 })
  medicineId!: string;

  @Column({
    name: 'packaging_level',
    type: 'enum',
    enum: ['CARTON', 'BOX', 'PACKET', 'UNIT'],
    default: 'UNIT',
  })
  packagingLevel!: PackagingLevel;

  @Column({ name: 'quantity_sold', type: 'int' })
  quantitySold!: number;

  @Column({ name: 'total_base_units', type: 'int' })
  totalBaseUnits!: number;

  @Column({
    name: 'unit_price_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  unitPriceLkr!: number;

  @Column({
    name: 'total_price_lkr',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  totalPriceLkr!: number;

  @OneToMany(() => SaleItemAllocation, (alloc) => alloc.saleItem, { cascade: true })
  allocations!: SaleItemAllocation[];
}
