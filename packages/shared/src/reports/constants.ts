export const REPORT_TYPES = [
  'SALES_INTELLIGENCE',
  'INVENTORY_VALUATION',
  'EXPIRY_RISK',
  'PRODUCT_PROFITABILITY',
  'CUSTOMER_CREDIT_AGING',
  'SUPPLIER_PAYABLES_AGING',
  'TAX_SUMMARY',
  'NMRA_CONTROLLED_LOG',
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export const EXPORT_FORMATS = ['csv', 'xlsx', 'pdf', 'json'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const SRI_LANKA_TAX_RATES = {
  VAT_PERCENTAGE: 18.0,
  SSCL_PERCENTAGE: 2.5,
} as const;

export const EXPIRY_RISK_THRESHOLDS_DAYS = [2, 30, 60, 90] as const;
