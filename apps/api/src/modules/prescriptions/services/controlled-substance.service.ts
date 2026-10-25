import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ControlledSubstanceRegister } from '../entities/controlled-substance-register.entity';
import { Medicine } from '../../medicines/entities/medicine.entity';
import { InventoryBatch } from '../../inventory/entities/inventory-batch.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { ControlledSubstanceQueryInput } from '@pharmacy/shared';

export interface RecordControlledDispenseDto {
  medicineId: string;
  batchId: string;
  quantityBaseUnits: number;
  customerId: string;
  customerNic: string;
  doctorId: string;
  doctorSlmcRegNo: string;
  prescriptionId: string;
  pharmacistUserId: string;
}

@Injectable()
export class ControlledSubstanceService {
  constructor(
    @InjectRepository(ControlledSubstanceRegister)
    private readonly registerRepo: Repository<ControlledSubstanceRegister>,
    @InjectRepository(InventoryBatch)
    private readonly batchRepo: Repository<InventoryBatch>,
    @InjectRepository(Medicine)
    private readonly medicineRepo: Repository<Medicine>,
    private readonly dataSource: DataSource,
  ) {}

  async recordDispense(dto: RecordControlledDispenseDto): Promise<ControlledSubstanceRegister> {
    if (dto.quantityBaseUnits <= 0) {
      throw new BadRequestException('Dispensed quantity must be positive');
    }

    return this.dataSource.transaction(async (manager) => {
      // 1. Get batch and verify stock
      const batch = await manager.findOne(InventoryBatch, {
        where: { id: dto.batchId },
      });
      if (!batch) {
        throw new BadRequestException(`Batch with ID "${dto.batchId}" not found`);
      }

      // 2. Compute running balance for this medicine across all active batches
      const batchSumResult = await manager
        .createQueryBuilder(InventoryBatch, 'b')
        .select('COALESCE(SUM(b.quantity_base_units), 0)', 'totalStock')
        .where('b.medicine_id = :medId', { medId: dto.medicineId })
        .andWhere('b.status = :status', { status: 'ACTIVE' })
        .getRawOne();

      const currentTotalStock = parseInt(batchSumResult?.totalStock || '0', 10);
      const newRunningBalance = Math.max(0, currentTotalStock - dto.quantityBaseUnits);

      const entry = manager.create(ControlledSubstanceRegister, {
        medicineId: dto.medicineId,
        batchId: dto.batchId,
        quantityBaseUnits: dto.quantityBaseUnits,
        runningBalance: newRunningBalance,
        customerId: dto.customerId,
        customerNic: dto.customerNic,
        doctorId: dto.doctorId,
        doctorSlmcRegNo: dto.doctorSlmcRegNo,
        prescriptionId: dto.prescriptionId,
        pharmacistUserId: dto.pharmacistUserId,
      });

      return manager.save(ControlledSubstanceRegister, entry);
    });
  }

  async listEntries(query: ControlledSubstanceQueryInput) {
    const qb = this.registerRepo
      .createQueryBuilder('reg')
      .leftJoinAndSelect('reg.medicine', 'med')
      .leftJoinAndSelect('reg.batch', 'batch')
      .orderBy('reg.createdAt', 'DESC')
      .take(query.limit || 50)
      .skip(query.offset || 0);

    if (query.medicineId) {
      qb.andWhere('reg.medicine_id = :medicineId', { medicineId: query.medicineId });
    }
    if (query.customerId) {
      qb.andWhere('reg.customer_id = :customerId', { customerId: query.customerId });
    }
    if (query.doctorId) {
      qb.andWhere('reg.doctor_id = :doctorId', { doctorId: query.doctorId });
    }
    if (query.startDate) {
      qb.andWhere('reg.created_at >= :startDate', { startDate: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('reg.created_at <= :endDate', { endDate: query.endDate });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }
}
