import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { Medicine } from '../../medicines/entities/medicine.entity';
import {
  BatchStatus,
  ExpiryRiskTier,
  StockHealthSummary,
  RiskTierSummary,
  LowStockAlertItem,
} from '@pharmacy/shared';

@Injectable()
export class StockHealthService {
  constructor(
    @InjectRepository(InventoryBatch)
    private readonly batchRepo: Repository<InventoryBatch>,
    @InjectRepository(Medicine)
    private readonly medicineRepo: Repository<Medicine>,
  ) {}

  /**
   * Real-time stock health summary and financial expiry risk valuation in LKR.
   */
  async getStockHealthSummary(): Promise<StockHealthSummary> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeBatches = await this.batchRepo
      .createQueryBuilder('batch')
      .where('batch.quantityBaseUnits > 0')
      .getMany();

    const quarantinedBatches = await this.batchRepo.count({
      where: { status: BatchStatus.QUARANTINED },
    });

    const tierMap: Record<ExpiryRiskTier, { count: number; units: number; costLkr: number }> = {
      CRITICAL_2D: { count: 0, units: 0, costLkr: 0 },
      EXPIRING_30D: { count: 0, units: 0, costLkr: 0 },
      EXPIRING_60D: { count: 0, units: 0, costLkr: 0 },
      EXPIRING_90D: { count: 0, units: 0, costLkr: 0 },
      HEALTHY: { count: 0, units: 0, costLkr: 0 },
      EXPIRED: { count: 0, units: 0, costLkr: 0 },
    };

    let totalActiveBatches = 0;
    let totalStockUnits = 0;
    let totalStockValueLkr = 0;

    const msPerDay = 1000 * 60 * 60 * 24;

    for (const batch of activeBatches) {
      if (batch.status === BatchStatus.ACTIVE) {
        totalActiveBatches++;
        totalStockUnits += batch.quantityBaseUnits;
        totalStockValueLkr += batch.quantityBaseUnits * batch.unitCostPrice;
      }

      const expiry = new Date(batch.expiryDate);
      expiry.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / msPerDay);

      let tier: ExpiryRiskTier;
      if (diffDays <= 0 || batch.status === BatchStatus.EXPIRED) {
        tier = 'EXPIRED';
      } else if (diffDays <= 2) {
        tier = 'CRITICAL_2D';
      } else if (diffDays <= 30) {
        tier = 'EXPIRING_30D';
      } else if (diffDays <= 60) {
        tier = 'EXPIRING_60D';
      } else if (diffDays <= 90) {
        tier = 'EXPIRING_90D';
      } else {
        tier = 'HEALTHY';
      }

      const entry = tierMap[tier];
      entry.count++;
      entry.units += batch.quantityBaseUnits;
      entry.costLkr += batch.quantityBaseUnits * batch.unitCostPrice;
    }

    const lowStockAlerts = await this.getLowStockAlerts();

    const riskTiers: RiskTierSummary[] = (Object.keys(tierMap) as ExpiryRiskTier[]).map((tier) => ({
      riskTier: tier,
      batchCount: tierMap[tier].count,
      totalUnits: tierMap[tier].units,
      totalCostValueLkr: Math.round(tierMap[tier].costLkr * 100) / 100,
    }));

    return {
      totalActiveBatches,
      totalStockUnits,
      totalStockValueLkr: Math.round(totalStockValueLkr * 100) / 100,
      quarantinedBatchCount: quarantinedBatches,
      lowStockCount: lowStockAlerts.length,
      riskTiers,
    };
  }

  /**
   * Retrieves all medicines whose current active stock is below or equal to reorder level.
   */
  async getLowStockAlerts(): Promise<LowStockAlertItem[]> {
    const rawResults = await this.medicineRepo
      .createQueryBuilder('med')
      .leftJoin(
        'inventory_batches',
        'batch',
        'batch.medicine_id = med.id AND batch.status = :status AND batch.expiry_date > CURRENT_DATE()',
        { status: BatchStatus.ACTIVE },
      )
      .select('med.id', 'medicineId')
      .addSelect('med.name', 'medicineName')
      .addSelect('med.generic_name', 'genericName')
      .addSelect('med.dosage_form', 'dosageForm')
      .addSelect('med.reorder_level', 'reorderLevel')
      .addSelect('COALESCE(SUM(batch.quantity_base_units), 0)', 'currentStockUnits')
      .addSelect('AVG(batch.unit_cost_price)', 'avgUnitCost')
      .groupBy('med.id')
      .having('currentStockUnits <= med.reorder_level')
      .getRawMany();

    return rawResults.map((r) => {
      const currentStock = parseInt(r.currentStockUnits, 10);
      const reorderLevel = parseInt(r.reorderLevel, 10);
      // Suggested reorder: top up to 2.5x reorder level
      const suggestedReorderQuantity = Math.max(reorderLevel * 2 - currentStock, reorderLevel);
      const unitCostPrice = r.avgUnitCost ? parseFloat(r.avgUnitCost) : 0;

      return {
        medicineId: r.medicineId,
        medicineName: r.medicineName,
        genericName: r.genericName,
        dosageForm: r.dosageForm,
        currentStockUnits: currentStock,
        reorderLevel,
        suggestedReorderQuantity,
        unitCostPrice: Math.round(unitCostPrice * 100) / 100,
      };
    });
  }
}
