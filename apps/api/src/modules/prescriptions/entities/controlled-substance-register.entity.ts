import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { Medicine } from '../../medicines/entities/medicine.entity';
import { InventoryBatch } from '../../inventory/entities/inventory-batch.entity';

@Entity('controlled_substance_register')
@Index('idx_controlled_audit', ['medicineId', 'createdAt'])
export class ControlledSubstanceRegister extends BaseAppEntity {
  @ManyToOne(() => Medicine, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'medicine_id' })
  medicine!: Medicine;

  @Column({ name: 'medicine_id', type: 'varchar', length: 64 })
  medicineId!: string;

  @ManyToOne(() => InventoryBatch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'batch_id' })
  batch!: InventoryBatch;

  @Column({ name: 'batch_id', type: 'varchar', length: 64 })
  batchId!: string;

  @Column({ name: 'quantity_base_units', type: 'int' })
  quantityBaseUnits!: number;

  @Column({ name: 'running_balance', type: 'int' })
  runningBalance!: number;

  @Column({ name: 'customer_id', type: 'varchar', length: 64 })
  customerId!: string;

  @Column({ name: 'customer_nic', type: 'varchar', length: 32 })
  customerNic!: string; // Patient NIC (Sri Lankan Legal Mandate)

  @Column({ name: 'doctor_id', type: 'varchar', length: 64 })
  doctorId!: string;

  @Column({ name: 'doctor_slmc_reg_no', type: 'varchar', length: 40 })
  doctorSlmcRegNo!: string; // Prescribing Doctor's SLMC Registration

  @Column({ name: 'prescription_id', type: 'varchar', length: 64 })
  prescriptionId!: string;

  @Column({ name: 'pharmacist_user_id', type: 'varchar', length: 64 })
  pharmacistUserId!: string; // Dispensing Pharmacist ID
}
