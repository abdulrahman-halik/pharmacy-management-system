import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { Medicine } from '../../medicines/entities/medicine.entity';
import {
  CreateBatchInput,
  BatchFilterQueryInput,
  BatchStatus,
} from '@pharmacy/shared';

@Injectable()
export class InventoryBatchService {
  constructor(
    @InjectRepository(InventoryBatch)
    private readonly batchRepo: Repository<InventoryBatch>,
    @InjectRepository(Medicine)
    private readonly medicineRepo: Repository<Medicine>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Registers a new batch and immediately appends an OPENING stock movement in the same transaction.
   */
  async createBatch(input: CreateBatchInput, userId: string): Promise<InventoryBatch> {
    const medicine = await this.medicineRepo.findOne({ where: { id: input.medicineId } });
    if (!medicine) {
      throw new NotFoundException(`Medicine with ID ${input.medicineId} not found`);
    }

    // Verify composite unique constraint (medicineId, batchNumber, expiryDate)
    const existing = await this.batchRepo.findOne({
      where: {
        medicineId: input.medicineId,
        batchNumber: input.batchNumber,
        expiryDate: new Date(input.expiryDate),
      },
    });

    if (existing) {
      throw new ConflictException(
        `Batch ${input.batchNumber} with expiry ${input.expiryDate} already registered for this medicine`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const isExpired = new Date(input.expiryDate).getTime() <= new Date().setHours(0, 0, 0, 0);
      let status: BatchStatus = BatchStatus.ACTIVE;
      if (isExpired) {
        status = BatchStatus.EXPIRED;
      } else if (input.quantityBaseUnits === 0) {
        status = BatchStatus.DEPLETED;
      }

      const batch = manager.create(InventoryBatch, {
        storeId: medicine.storeId,
        medicineId: medicine.id,
        batchNumber: input.batchNumber,
        mfdDate: input.mfdDate ? new Date(input.mfdDate) : null,
        expiryDate: new Date(input.expiryDate),
        quantityBaseUnits: input.quantityBaseUnits,
        unitCostPrice: input.unitCostPrice,
        batchMrp: input.batchMrp,
        supplierId: input.supplierId || null,
        status,
        createdBy: userId,
      });

      const savedBatch = await manager.save(InventoryBatch, batch);

      // If initial stock is positive, write the initial OPENING stock movement
      if (input.quantityBaseUnits > 0) {
        const openingMovement = manager.create(StockMovement, {
          storeId: savedBatch.storeId,
          medicineId: savedBatch.medicineId,
          batchId: savedBatch.id,
          movementType: 'OPENING',
          quantityBaseUnits: input.quantityBaseUnits,
          balanceAfter: input.quantityBaseUnits,
          unitCostPrice: savedBatch.unitCostPrice,
          referenceType: 'OPENING_BALANCE',
          reason: 'Initial batch opening registration',
          userId,
        });

        await manager.save(StockMovement, openingMovement);
      }

      return savedBatch;
    });
  }

  /**
   * Search and filter batches with FEFO risk filters and fulltext medicine search.
   */
  async getBatches(query: BatchFilterQueryInput) {
    const qb: SelectQueryBuilder<InventoryBatch> = this.batchRepo
      .createQueryBuilder('batch')
      .leftJoinAndSelect('batch.medicine', 'med')
      .orderBy('batch.expiryDate', 'ASC')
      .addOrderBy('batch.createdAt', 'DESC');

    if (query.medicineId) {
      qb.andWhere('batch.medicineId = :medicineId', { medicineId: query.medicineId });
    }

    if (query.status) {
      qb.andWhere('batch.status = :status', { status: query.status });
    }

    if (query.search) {
      qb.andWhere(
        '(batch.batchNumber LIKE :search OR med.name LIKE :search OR med.genericName LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const todayStr = new Date().toISOString().split('T')[0];

    if (query.expiryFilter === 'critical') {
      qb.andWhere('batch.expiryDate > :todayStr AND batch.expiryDate <= DATE_ADD(:todayStr, INTERVAL 2 DAY)', {
        todayStr,
      });
    } else if (query.expiryFilter === '30days') {
      qb.andWhere('batch.expiryDate > :todayStr AND batch.expiryDate <= DATE_ADD(:todayStr, INTERVAL 30 DAY)', {
        todayStr,
      });
    } else if (query.expiryFilter === '60days') {
      qb.andWhere('batch.expiryDate > :todayStr AND batch.expiryDate <= DATE_ADD(:todayStr, INTERVAL 60 DAY)', {
        todayStr,
      });
    } else if (query.expiryFilter === '90days') {
      qb.andWhere('batch.expiryDate > :todayStr AND batch.expiryDate <= DATE_ADD(:todayStr, INTERVAL 90 DAY)', {
        todayStr,
      });
    } else if (query.expiryFilter === 'expired') {
      qb.andWhere('batch.expiryDate <= :todayStr', { todayStr });
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getBatchById(id: string): Promise<InventoryBatch> {
    const batch = await this.batchRepo.findOne({
      where: { id },
      relations: ['medicine'],
    });

    if (!batch) {
      throw new NotFoundException(`Inventory batch with ID ${id} not found`);
    }

    return batch;
  }
}
