import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { GoodsReceivedNote } from '../entities/goods-received-note.entity';
import { GoodsReceivedNoteItem } from '../entities/goods-received-note-item.entity';
import { Supplier } from '../entities/supplier.entity';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';
import { Medicine } from '../../medicines/entities/medicine.entity';
import { InventoryBatch } from '../../inventory/entities/inventory-batch.entity';
import { StockMovement } from '../../inventory/entities/stock-movement.entity';
import { ProcurementSequenceService } from './sequence.service';
import {
  CreateGrnInput,
  GoodsReceivedNoteDto,
  convertToUnits,
  computePackagingMultipliers,
} from '@pharmacy/shared';

@Injectable()
export class GrnIntakeService {
  constructor(
    @InjectRepository(GoodsReceivedNote)
    private readonly grnRepo: Repository<GoodsReceivedNote>,
    @InjectRepository(GoodsReceivedNoteItem)
    private readonly grnItemRepo: Repository<GoodsReceivedNoteItem>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
    @InjectRepository(Medicine)
    private readonly medicineRepo: Repository<Medicine>,
    @InjectRepository(InventoryBatch)
    private readonly batchRepo: Repository<InventoryBatch>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    private readonly dataSource: DataSource,
    private readonly sequenceService: ProcurementSequenceService,
  ) {}

  async processGrn(input: CreateGrnInput, userId: string): Promise<GoodsReceivedNoteDto> {
    const receivedDateTime = new Date(input.receivedDate).getTime();

    // 1. Validate Expired Goods Intake Gate
    for (const item of input.items) {
      const expiryDateTime = new Date(item.expiryDate).getTime();
      if (expiryDateTime <= receivedDateTime) {
        throw new BadRequestException(
          `Cannot receive expired pharmaceuticals: Item with batch ${item.batchNumber} has expiry date ${item.expiryDate} which is on or before received date ${input.receivedDate}`,
        );
      }
    }

    // 2. Validate Supplier exists
    const supplier = await this.supplierRepo.findOne({ where: { id: input.supplierId } });
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${input.supplierId} not found`);
    }

    // 3. Duplicate Invoice Guard
    const existingInvoice = await this.grnRepo.findOne({
      where: {
        supplierId: input.supplierId,
        supplierInvoiceNumber: input.supplierInvoiceNumber,
      },
    });

    if (existingInvoice) {
      throw new ConflictException(
        `Supplier invoice number ${input.supplierInvoiceNumber} already registered for this distributor`,
      );
    }

    // Load medicines with packaging hierarchies
    const medicineIds = input.items.map((i) => i.medicineId);
    const medicines = await this.medicineRepo.find({
      where: { id: In(medicineIds) },
      relations: ['packaging'],
    });
    const medicineMap = new Map(medicines.map((m) => [m.id, m]));

    for (const item of input.items) {
      const med = medicineMap.get(item.medicineId);
      if (!med) {
        throw new NotFoundException(`Medicine with ID ${item.medicineId} not found`);
      }
      if (!med.packaging) {
        throw new BadRequestException(
          `Packaging hierarchy is not configured for medicine ${med.name}`,
        );
      }
    }

    // Execute atomic transaction for stock intake, moving-average cost, movements, and payables
    return this.dataSource.transaction(async (manager) => {
      const grnNumber = await this.sequenceService.getNextGrnNumber(manager);

      let subtotalLkr = 0;
      const grnItems: GoodsReceivedNoteItem[] = [];
      const stockMovementEntities: StockMovement[] = [];

      for (const item of input.items) {
        const med = medicineMap.get(item.medicineId)!;
        const lineTotal = Math.round(item.purchasedQuantity * item.purchasePriceLkr * 100) / 100;
        subtotalLkr += lineTotal;

        // Total physical volume arriving (purchased + bonus units)
        const bonusQuantity = item.bonusQuantity || 0;
        const totalPhysicalCount = item.purchasedQuantity + bonusQuantity;
        const totalReceivedBaseUnits = convertToUnits(
          totalPhysicalCount,
          item.packagingLevel,
          med.packaging,
        );

        if (totalReceivedBaseUnits <= 0) {
          throw new BadRequestException(`Calculated total received base units must be positive`);
        }

        // Net landed cost per base unit: absorbs bonus stock into total cost basis
        const netLandedCostPerBaseUnit =
          Math.round((lineTotal / totalReceivedBaseUnits) * 10000) / 10000;

        const grnItem = manager.create(GoodsReceivedNoteItem, {
          medicineId: item.medicineId,
          batchNumber: item.batchNumber,
          mfdDate: item.mfdDate ? new Date(item.mfdDate) : null,
          expiryDate: new Date(item.expiryDate),
          packagingLevel: item.packagingLevel,
          purchasedQuantity: item.purchasedQuantity,
          bonusQuantity,
          totalReceivedBaseUnits,
          purchasePriceLkr: item.purchasePriceLkr,
          lineTotalLkr: lineTotal,
          netLandedCostPerBaseUnit,
          batchMrpPerBaseUnit: item.batchMrpPerBaseUnit,
          createdBy: userId,
        });
        grnItems.push(grnItem);

        // Check if batch already exists in inventory_batches with pessimistic lock
        let batch = await manager.findOne(InventoryBatch, {
          where: {
            medicineId: item.medicineId,
            batchNumber: item.batchNumber,
          },
          lock: { mode: 'pessimistic_write' },
        });

        if (batch) {
          // Recompute Moving Average Cost (MAC) across existing and incoming stock
          const existingQty = batch.quantityBaseUnits;
          const existingCost = Number(batch.unitCostPrice);
          const addedQty = totalReceivedBaseUnits;
          const addedCost = netLandedCostPerBaseUnit;

          const totalQty = existingQty + addedQty;
          const weightedCost =
            totalQty > 0
              ? Math.round(
                  (((existingQty * existingCost) + (addedQty * addedCost)) / totalQty) * 10000,
                ) / 10000
              : netLandedCostPerBaseUnit;

          batch.quantityBaseUnits = totalQty;
          batch.unitCostPrice = weightedCost;
          batch.batchMrp = item.batchMrpPerBaseUnit;
          if (batch.status === 'DEPLETED' && totalQty > 0) {
            batch.status = 'ACTIVE';
          }
          batch.updatedBy = userId;
          await manager.save(InventoryBatch, batch);
        } else {
          // Create new batch with ACTIVE status
          batch = manager.create(InventoryBatch, {
            storeId: med.storeId || 1,
            medicineId: item.medicineId,
            batchNumber: item.batchNumber,
            mfdDate: item.mfdDate ? new Date(item.mfdDate) : null,
            expiryDate: new Date(item.expiryDate),
            quantityBaseUnits: totalReceivedBaseUnits,
            unitCostPrice: netLandedCostPerBaseUnit,
            batchMrp: item.batchMrpPerBaseUnit,
            supplierId: input.supplierId,
            status: 'ACTIVE',
            createdBy: userId,
          });
          batch = await manager.save(InventoryBatch, batch);
        }

        // Append immutable PURCHASE row to stock_movements ledger
        const movement = manager.create(StockMovement, {
          storeId: batch.storeId || 1,
          medicineId: item.medicineId,
          batchId: batch.id,
          movementType: 'PURCHASE',
          quantityBaseUnits: totalReceivedBaseUnits,
          balanceAfter: batch.quantityBaseUnits,
          unitCostPrice: netLandedCostPerBaseUnit,
          referenceType: 'GRN',
          referenceId: grnNumber,
          reason: `Goods Received Note intake (Invoice #${input.supplierInvoiceNumber})`,
          userId,
          createdBy: userId,
        });
        stockMovementEntities.push(movement);
      }

      await manager.save(StockMovement, stockMovementEntities);

      // Finalize financial calculations
      subtotalLkr = Math.round(subtotalLkr * 100) / 100;
      const taxVatLkr = Math.round((input.taxVatLkr || 0) * 100) / 100;
      const grandTotalLkr = Math.round((subtotalLkr + taxVatLkr) * 100) / 100;

      // Create GoodsReceivedNote
      const grn = manager.create(GoodsReceivedNote, {
        grnNumber,
        supplierId: input.supplierId,
        purchaseOrderId: input.purchaseOrderId || null,
        supplierInvoiceNumber: input.supplierInvoiceNumber,
        receivedDate: new Date(input.receivedDate),
        subtotalLkr,
        taxVatLkr,
        grandTotalLkr,
        paidAmountLkr: 0.0,
        paymentStatus: 'UNPAID',
        receivedByUserId: userId,
        notes: input.notes || null,
        createdBy: userId,
        items: grnItems,
      });

      const savedGrn = await manager.save(GoodsReceivedNote, grn);

      // If linked to a PO, update line item received quantities and PO status
      let poNumber: string | null = null;
      if (input.purchaseOrderId) {
        const po = await manager.findOne(PurchaseOrder, {
          where: { id: input.purchaseOrderId },
          relations: ['items'],
          lock: { mode: 'pessimistic_write' },
        });

        if (po) {
          poNumber = po.poNumber;
          for (const grnItem of input.items) {
            const matchedPoItem = po.items.find(
              (pItem) =>
                pItem.medicineId === grnItem.medicineId &&
                pItem.packagingLevel === grnItem.packagingLevel,
            );
            if (matchedPoItem) {
              matchedPoItem.receivedQuantity =
                (matchedPoItem.receivedQuantity || 0) + grnItem.purchasedQuantity;
              await manager.save(PurchaseOrderItem, matchedPoItem);
            }
          }

          // Evaluate overall PO fulfillment
          const allFulfilled = po.items.every(
            (item) => (item.receivedQuantity || 0) >= item.quantity,
          );
          const anyReceived = po.items.some((item) => (item.receivedQuantity || 0) > 0);

          if (allFulfilled) {
            po.status = 'RECEIVED';
          } else if (anyReceived) {
            po.status = 'PARTIALLY_RECEIVED';
          }
          await manager.save(PurchaseOrder, po);
        }
      }

      // Update supplier running payable balance
      const lockedSupplier = await manager.findOne(Supplier, {
        where: { id: input.supplierId },
        lock: { mode: 'pessimistic_write' },
      });

      if (lockedSupplier) {
        const currentPayable = Number(lockedSupplier.outstandingPayableLkr || 0);
        lockedSupplier.outstandingPayableLkr =
          Math.round((currentPayable + grandTotalLkr) * 100) / 100;
        lockedSupplier.updatedBy = userId;
        await manager.save(Supplier, lockedSupplier);
      }

      return this.mapToDto(savedGrn, supplier.companyName, poNumber, medicineMap);
    });
  }

  async getGrnById(id: string): Promise<GoodsReceivedNoteDto> {
    const grn = await this.grnRepo.findOne({
      where: { id },
      relations: ['supplier', 'purchaseOrder', 'items', 'items.medicine'],
    });

    if (!grn) {
      throw new NotFoundException(`GRN with ID ${id} not found`);
    }

    const medicineMap = new Map(grn.items.map((i) => [i.medicineId, i.medicine]));
    return this.mapToDto(
      grn,
      grn.supplier?.companyName,
      grn.purchaseOrder?.poNumber,
      medicineMap,
    );
  }

  async getGrns(query?: {
    supplierId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<GoodsReceivedNoteDto[]> {
    const qb = this.grnRepo
      .createQueryBuilder('grn')
      .leftJoinAndSelect('grn.supplier', 'supplier')
      .leftJoinAndSelect('grn.purchaseOrder', 'po')
      .leftJoinAndSelect('grn.items', 'item')
      .leftJoinAndSelect('item.medicine', 'medicine')
      .orderBy('grn.createdAt', 'DESC');

    if (query?.supplierId) {
      qb.andWhere('grn.supplierId = :supplierId', { supplierId: query.supplierId });
    }

    if (query?.search) {
      qb.andWhere(
        '(grn.grnNumber LIKE :search OR grn.supplierInvoiceNumber LIKE :search OR supplier.companyName LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query?.startDate) {
      qb.andWhere('grn.receivedDate >= :startDate', { startDate: query.startDate });
    }

    if (query?.endDate) {
      qb.andWhere('grn.receivedDate <= :endDate', { endDate: query.endDate });
    }

    const grns = await qb.getMany();

    return grns.map((grn) => {
      const medicineMap = new Map(grn.items.map((i) => [i.medicineId, i.medicine]));
      return this.mapToDto(
        grn,
        grn.supplier?.companyName,
        grn.purchaseOrder?.poNumber,
        medicineMap,
      );
    });
  }

  private mapToDto(
    grn: GoodsReceivedNote,
    supplierName?: string,
    poNumber?: string | null,
    medicineMap?: Map<string, Medicine>,
  ): GoodsReceivedNoteDto {
    return {
      id: grn.id,
      grnNumber: grn.grnNumber,
      supplierId: grn.supplierId,
      supplierName,
      purchaseOrderId: grn.purchaseOrderId,
      poNumber: poNumber || grn.purchaseOrder?.poNumber,
      supplierInvoiceNumber: grn.supplierInvoiceNumber,
      receivedDate:
        typeof grn.receivedDate === 'string'
          ? grn.receivedDate
          : grn.receivedDate.toISOString().slice(0, 10),
      subtotalLkr: Number(grn.subtotalLkr),
      taxVatLkr: Number(grn.taxVatLkr),
      grandTotalLkr: Number(grn.grandTotalLkr),
      paidAmountLkr: Number(grn.paidAmountLkr),
      paymentStatus: grn.paymentStatus,
      receivedByUserId: grn.receivedByUserId,
      notes: grn.notes,
      items: (grn.items || []).map((item) => {
        const med = medicineMap?.get(item.medicineId) || (item as any).medicine;
        return {
          id: item.id,
          grnId: item.grnId,
          medicineId: item.medicineId,
          medicineName: med?.name,
          genericName: med?.genericName,
          batchNumber: item.batchNumber,
          mfdDate: item.mfdDate
            ? typeof item.mfdDate === 'string'
              ? item.mfdDate
              : item.mfdDate.toISOString().slice(0, 10)
            : null,
          expiryDate:
            typeof item.expiryDate === 'string'
              ? item.expiryDate
              : item.expiryDate.toISOString().slice(0, 10),
          packagingLevel: item.packagingLevel,
          purchasedQuantity: item.purchasedQuantity,
          bonusQuantity: item.bonusQuantity,
          totalReceivedBaseUnits: item.totalReceivedBaseUnits,
          purchasePriceLkr: Number(item.purchasePriceLkr),
          lineTotalLkr: Number(item.lineTotalLkr),
          netLandedCostPerBaseUnit: Number(item.netLandedCostPerBaseUnit),
          batchMrpPerBaseUnit: Number(item.batchMrpPerBaseUnit),
        };
      }),
      createdAt: grn.createdAt.toISOString(),
      updatedAt: grn.updatedAt.toISOString(),
    };
  }
}
