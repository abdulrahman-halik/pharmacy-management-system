import type {
  BatchStatus,
  MovementType,
  AuditStatus,
  ExpiryRiskTier,
  ExpiryFilterOption,
} from './constants.js';

export type {
  BatchStatus,
  MovementType,
  AuditStatus,
  ExpiryRiskTier,
  ExpiryFilterOption,
};

export interface InventoryBatchDto {
  id: string;
  storeId: number;
  medicineId: string;
  medicineName?: string;
  medicineGenericName?: string;
  batchNumber: string;
  mfdDate?: string | null;
  expiryDate: string;
  quantityBaseUnits: number;
  unitCostPrice: number;
  batchMrp: number;
  supplierId?: string | null;
  status: BatchStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovementDto {
  id: string;
  storeId: number;
  medicineId: string;
  batchId: string;
  movementType: MovementType;
  quantityBaseUnits: number;
  balanceAfter: number;
  unitCostPrice: number;
  referenceType?: string | null;
  referenceId?: string | null;
  reason?: string | null;
  userId: string;
  createdAt: string;
}

export interface AllocatedBatchItem {
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  allocatedUnits: number;
  unitCostPrice: number;
  batchMrp: number;
}

export interface FefoAllocationResult {
  medicineId: string;
  requestedUnits: number;
  allocatedTotalUnits: number;
  shortfallUnits: number;
  allocations: AllocatedBatchItem[];
}

export interface RiskTierSummary {
  riskTier: ExpiryRiskTier;
  batchCount: number;
  totalUnits: number;
  totalCostValueLkr: number;
}

export interface StockHealthSummary {
  totalActiveBatches: number;
  totalStockUnits: number;
  totalStockValueLkr: number;
  quarantinedBatchCount: number;
  lowStockCount: number;
  riskTiers: RiskTierSummary[];
}

export interface LowStockAlertItem {
  medicineId: string;
  medicineName: string;
  genericName: string;
  dosageForm: string;
  currentStockUnits: number;
  reorderLevel: number;
  suggestedReorderQuantity: number;
  unitCostPrice: number;
}

export interface StockAuditItemDto {
  id: string;
  sessionId: string;
  medicineId: string;
  medicineName?: string;
  batchId: string;
  batchNumber?: string;
  systemQuantityBaseUnits: number;
  countedQuantityBaseUnits: number;
  varianceQuantityBaseUnits: number;
  varianceCostLkr: number;
  notes?: string | null;
}

export interface StockAuditSessionDto {
  id: string;
  sessionCode: string;
  status: AuditStatus;
  totalVarianceCostLkr: number;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  items: StockAuditItemDto[];
}

export interface BatchTraceabilityReport {
  batch: InventoryBatchDto;
  totalDispensedUnits: number;
  totalRemainingUnits: number;
  movements: StockMovementDto[];
  salesReferences: Array<{
    invoiceId: string;
    saleDate: string;
    quantityBaseUnits: number;
    userId: string;
  }>;
}
