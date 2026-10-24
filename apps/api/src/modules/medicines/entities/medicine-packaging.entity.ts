import { Entity, Column, OneToOne, JoinColumn, Index } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { Medicine } from './medicine.entity';

@Entity('medicine_packaging')
@Index('uq_medicine_packaging_medicine', ['medicineId'], { unique: true })
export class MedicinePackaging extends BaseAppEntity {
  @OneToOne(() => Medicine, (medicine) => medicine.packaging, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'medicine_id' })
  medicine?: Medicine;

  @Column({ name: 'medicine_id', type: 'varchar', length: 36 })
  medicineId!: string;

  @Column({ name: 'base_unit_name', type: 'varchar', length: 32, default: 'Unit' })
  baseUnitName!: string;

  @Column({ name: 'units_per_packet', type: 'int', unsigned: true, default: 1 })
  unitsPerPacket!: number;

  @Column({ name: 'packets_per_box', type: 'int', unsigned: true, nullable: true })
  packetsPerBox!: number | null;

  @Column({ name: 'boxes_per_carton', type: 'int', unsigned: true, nullable: true })
  boxesPerCarton!: number | null;
}
