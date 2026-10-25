import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';
import { Supplier } from '../entities/supplier.entity';
import { Medicine } from '../../medicines/entities/medicine.entity';
import { InventoryBatch } from '../../inventory/entities/inventory-batch.entity';
import { ProcurementSequenceService } from './sequence.service';
import {
  CreatePurchaseOrderInput,
  PurchaseOrderStatus,
  PurchaseOrderDto,
  computePackagingMultipliers,
  PackagingLevel,
} from '@pharmacy/shared';

@Injectable()
export class PurchaseOrderService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private readonly poItemRepo: Repository<PurchaseOrderItem>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(Medicine)
    private readonly medicineRepo: Repository<Medicine>,
    @InjectRepository(InventoryBatch)
    private readonly batchRepo: Repository<InventoryBatch>,
    private readonly dataSource: DataSource,
    private readonly sequenceService: ProcurementSequenceService,
  ) {}

  async createPurchaseOrder(
    input: CreatePurchaseOrderInput,
    userId: string,
  ): Promise<PurchaseOrderDto> {
    const supplier = await this.supplierRepo.findOne({ where: { id: input.supplierId } });
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${input.supplierId} not found`);
    }

    if (!supplier.isActive) {
      throw new BadRequestException(`Supplier ${supplier.companyName} is deactivated`);
    }

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
      if (med.packaging) {
        const multipliers = computePackagingMultipliers(med.packaging);
        if (multipliers[item.packagingLevel] == null) {
          throw new BadRequestException(
            `Packaging level ${item.packagingLevel} is not configured for medicine ${med.name}`,
          );
        }
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const poNumber = await this.sequenceService.getNextPoNumber(manager);

      let totalAmountLkr = 0;
      const poItems: PurchaseOrderItem[] = [];

      for (const item of input.items) {
        const lineTotal = Math.round(item.quantity * item.unitCostLkr * 100) / 100;
        totalAmountLkr += lineTotal;

        const poItem = manager.create(PurchaseOrderItem, {
          medicineId: item.medicineId,
          packagingLevel: item.packagingLevel,
          quantity: item.quantity,
          unitCostLkr: item.unitCostLkr,
          lineTotalLkr: lineTotal,
          receivedQuantity: 0,
          createdBy: userId,
        });
        poItems.push(poItem);
      }

      totalAmountLkr = Math.round(totalAmountLkr * 100) / 100;

      const po = manager.create(PurchaseOrder, {
        poNumber,
        supplierId: input.supplierId,
        orderDate: new Date(input.orderDate),
        expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null,
        status: 'DRAFT',
        totalAmountLkr,
        notes: input.notes || null,
        createdBy: userId,
        items: poItems,
      });

      const savedPo = await manager.save(PurchaseOrder, po);

      return this.mapToDto(savedPo, supplier.companyName, medicineMap);
    });
  }

  async getPurchaseOrders(query?: {
    supplierId?: string;
    status?: PurchaseOrderStatus;
    search?: string;
  }): Promise<PurchaseOrderDto[]> {
    const qb = this.poRepo
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .leftJoinAndSelect('po.items', 'item')
      .leftJoinAndSelect('item.medicine', 'medicine')
      .orderBy('po.createdAt', 'DESC');

    if (query?.supplierId) {
      qb.andWhere('po.supplierId = :supplierId', { supplierId: query.supplierId });
    }

    if (query?.status) {
      qb.andWhere('po.status = :status', { status: query.status });
    }

    if (query?.search) {
      qb.andWhere(
        '(po.poNumber LIKE :search OR supplier.companyName LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const pos = await qb.getMany();

    return pos.map((po) => {
      const medicineMap = new Map(po.items.map((i) => [i.medicineId, i.medicine]));
      return this.mapToDto(po, po.supplier?.companyName, medicineMap);
    });
  }

  async getPurchaseOrderById(id: string): Promise<PurchaseOrderDto> {
    const po = await this.poRepo.findOne({
      where: { id },
      relations: ['supplier', 'items', 'items.medicine'],
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID ${id} not found`);
    }

    const medicineMap = new Map(po.items.map((i) => [i.medicineId, i.medicine]));
    return this.mapToDto(po, po.supplier?.companyName, medicineMap);
  }

  async updateStatus(
    id: string,
    status: PurchaseOrderStatus,
    userId: string,
  ): Promise<PurchaseOrderDto> {
    const po = await this.poRepo.findOne({
      where: { id },
      relations: ['supplier', 'items', 'items.medicine'],
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID ${id} not found`);
    }

    po.status = status;
    po.updatedBy = userId;
    const saved = await this.poRepo.save(po);

    const medicineMap = new Map(saved.items.map((i) => [i.medicineId, i.medicine]));
    return this.mapToDto(saved, saved.supplier?.companyName, medicineMap);
  }

  /**
   * Identifies medicines whose stock is below their configured reorder level,
   * and auto-generates a DRAFT Purchase Order grouped for a given supplier.
   */
  async generateFromLowStock(
    supplierId: string,
    userId: string,
  ): Promise<PurchaseOrderDto | null> {
    const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${supplierId} not found`);
    }

    // Query all medicines with their active batch stocks
    const medicines = await this.medicineRepo.find({
      relations: ['packaging'],
      order: { name: 'ASC' },
    });

    const lowStockItems: {
      medicineId: string;
      packagingLevel: PackagingLevel;
      quantity: number;
      unitCostLkr: number;
    }[] = [];

    for (const med of medicines) {
      // Calculate active base units from inventory_batches
      const batches = await this.batchRepo.find({
        where: { medicineId: med.id, status: 'ACTIVE' },
      });
      const currentStockBaseUnits = batches.reduce(
        (sum, b) => sum + (b.quantityBaseUnits || 0),
        0,
      );

      if (currentStockBaseUnits < med.reorderLevel) {
        const deficitBaseUnits = Math.max(med.reorderLevel - currentStockBaseUnits, 1);
        const pkg = med.packaging;
        const multipliers = pkg ? computePackagingMultipliers(pkg) : { UNIT: 1, PACKET: 1, BOX: null, CARTON: null };

        // Prefer ordering in BOX if configured, else PACKET, else UNIT
        let chosenLevel: PackagingLevel = 'UNIT';
        let unitsPerTier = 1;

        if (multipliers.BOX) {
          chosenLevel = 'BOX';
          unitsPerTier = multipliers.BOX;
        } else if (multipliers.PACKET && multipliers.PACKET > 1) {
          chosenLevel = 'PACKET';
          unitsPerTier = multipliers.PACKET;
        }

        const orderQty = Math.ceil(deficitBaseUnits / unitsPerTier);
        // Unit cost estimated from catalogue MRP (defaulting to 70% of MRP as wholesale cost if available)
        const unitCostEstimate = med.mrp ? Math.round(med.mrp * unitsPerTier * 0.7 * 100) / 100 : 100;

        lowStockItems.push({
          medicineId: med.id,
          packagingLevel: chosenLevel,
          quantity: orderQty,
          unitCostLkr: unitCostEstimate,
        });
      }
    }

    if (lowStockItems.length === 0) {
      return null;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    return this.createPurchaseOrder(
      {
        supplierId,
        orderDate: todayStr,
        notes: `Auto-generated purchase order from inventory reorder alerts (${lowStockItems.length} low-stock medicines)`,
        items: lowStockItems,
      },
      userId,
    );
  }

  private mapToDto(
    po: PurchaseOrder,
    supplierName?: string,
    medicineMap?: Map<string, Medicine>,
  ): PurchaseOrderDto {
    return {
      id: po.id,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      supplierName,
      orderDate: typeof po.orderDate === 'string' ? po.orderDate : po.orderDate.toISOString().slice(0, 10),
      expectedDeliveryDate: po.expectedDeliveryDate
        ? typeof po.expectedDeliveryDate === 'string'
          ? po.expectedDeliveryDate
          : po.expectedDeliveryDate.toISOString().slice(0, 10)
        : null,
      status: po.status,
      totalAmountLkr: Number(po.totalAmountLkr),
      notes: po.notes,
      items: (po.items || []).map((item) => {
        const med = medicineMap?.get(item.medicineId) || (item as any).medicine;
        return {
          id: item.id,
          purchaseOrderId: item.purchaseOrderId,
          medicineId: item.medicineId,
          medicineName: med?.name,
          genericName: med?.genericName,
          packagingLevel: item.packagingLevel,
          quantity: item.quantity,
          unitCostLkr: Number(item.unitCostLkr),
          lineTotalLkr: Number(item.lineTotalLkr),
          receivedQuantity: item.receivedQuantity || 0,
        };
      }),
      createdAt: po.createdAt.toISOString(),
      updatedAt: po.updatedAt.toISOString(),
    };
  }
}
