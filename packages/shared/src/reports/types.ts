import { ExportFormat, ReportType } from './constants.js';

export interface ReportQueryFilter {
  startDate?: string;
  endDate?: string;
  cashierId?: string;
  categoryId?: string;
  paymentMethod?: string;
  limit?: number;
  offset?: number;
  format?: ExportFormat;
}

export interface SalesIntelligenceItem {
  date: string;
  hour?: number;
  invoiceNumber: string;
  cashierId: string;
  cashierName: string;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  netTotalCents: number;
  paymentMethod: string;
  itemsCount: number;
}

export interface SalesIntelligenceSummary {
  totalInvoices: number;
  grossSalesCents: number;
  totalDiscountCents: number;
  totalTaxCents: number;
  netRevenueCents: number;
  averageBasketValueCents: number;
  breakdownByPaymentMethod: Record<string, number>;
  items: SalesIntelligenceItem[];
}

export interface InventoryValuationItem {
  medicineId: string;
  name: string;
  genericName?: string | null;
  categoryName?: string | null;
  baseUnitsInStock: number;
  weightedAvgUnitCostCents: number;
  unitMrpCents: number;
  totalCostValueCents: number;
  totalRetailValueCents: number;
  potentialProfitCents: number;
}

export interface InventoryValuationSummary {
  totalMedicinesCount: number;
  totalUnitsInStock: number;
  totalCostValueCents: number;
  totalRetailValueCents: number;
  totalUnrealizedMarginCents: number;
  items: InventoryValuationItem[];
}

export interface ExpiryRiskItem {
  batchId: string;
  batchNumber: string;
  medicineId: string;
  medicineName: string;
  genericName?: string | null;
  expiryDate: string;
  daysRemaining: number;
  remainingUnits: number;
  unitCostCents: number;
  totalValueAtRiskCents: number;
  riskTier: 'CRITICAL_2D' | 'HIGH_30D' | 'MEDIUM_60D' | 'LOW_90D';
}

export interface ExpiryRiskSummary {
  critical2dValueCents: number;
  high30dValueCents: number;
  medium60dValueCents: number;
  low90dValueCents: number;
  totalValueAtRiskCents: number;
  items: ExpiryRiskItem[];
}

export interface ProductProfitabilityItem {
  medicineId: string;
  medicineName: string;
  categoryName?: string | null;
  unitsSold: number;
  grossRevenueCents: number;
  cogsCents: number;
  grossProfitCents: number;
  grossMarginPercentage: number;
}

export interface ProductProfitabilitySummary {
  totalUnitsSold: number;
  totalRevenueCents: number;
  totalCogsCents: number;
  totalProfitCents: number;
  overallMarginPercentage: number;
  items: ProductProfitabilityItem[];
}

export interface CustomerCreditAgingItem {
  customerId: string;
  customerName: string;
  phone: string;
  creditLimitCents: number;
  currentBalanceCents: number;
  bucketCurrentCents: number; // 0-30 days
  bucket30to60Cents: number;  // 31-60 days
  bucket60to90Cents: number;  // 61-90 days
  bucketOver90Cents: number;  // 90+ days
}

export interface CustomerCreditAgingSummary {
  totalReceivablesCents: number;
  totalCurrentCents: number;
  total30to60Cents: number;
  total60to90Cents: number;
  totalOver90Cents: number;
  customersCount: number;
  items: CustomerCreditAgingItem[];
}

export interface SupplierPayablesAgingItem {
  supplierId: string;
  supplierName: string;
  paymentTermsDays: number;
  totalPayableCents: number;
  bucketCurrentCents: number; // 0-30 days
  bucket30to60Cents: number;  // 31-60 days
  bucket60to90Cents: number;  // 61-90 days
  bucketOver90Cents: number;  // 90+ days
}

export interface SupplierPayablesAgingSummary {
  totalPayablesCents: number;
  totalCurrentCents: number;
  total30to60Cents: number;
  total60to90Cents: number;
  totalOver90Cents: number;
  suppliersCount: number;
  items: SupplierPayablesAgingItem[];
}

export interface TaxComplianceSummary {
  taxableSalesCents: number;
  exemptSalesCents: number;
  vatCollectedCents: number;  // 18%
  ssclCollectedCents: number; // 2.5%
  totalTaxCollectedCents: number;
  taxInvoicesCount: number;
  exemptInvoicesCount: number;
}

export interface NmraControlledDrugLogItem {
  saleDate: string;
  invoiceNumber: string;
  drugName: string;
  schedule: string;
  batchNumber: string;
  expiryDate: string;
  quantityDispensed: number;
  patientName: string;
  patientNic: string;
  doctorName: string;
  doctorSlmcNumber: string;
  pharmacistName: string;
}

export interface NmraControlledDrugsReport {
  generatedAt: string;
  reportingPeriod: {
    startDate: string;
    endDate: string;
  };
  totalScheduleItemsDispensed: number;
  items: NmraControlledDrugLogItem[];
}
