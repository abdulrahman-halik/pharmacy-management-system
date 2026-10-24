import type {
  InventoryBatchDto,
  StockMovementDto,
  StockHealthSummary,
  LowStockAlertItem,
  StockAuditSessionDto,
  BatchTraceabilityReport,
} from '@pharmacy/shared';

export interface InventoryState {
  batches: InventoryBatchDto[];
  stockHealth: StockHealthSummary | null;
  lowStockItems: LowStockAlertItem[];
  auditSessions: StockAuditSessionDto[];
  activeAuditSession: StockAuditSessionDto | null;
}
