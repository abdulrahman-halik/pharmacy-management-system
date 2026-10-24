export const PURCHASE_ORDER_STATUSES = [
  'DRAFT',
  'ORDERED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED',
] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export const GRN_PAYMENT_STATUSES = [
  'UNPAID',
  'PARTIALLY_PAID',
  'PAID',
] as const;
export type GrnPaymentStatus = (typeof GRN_PAYMENT_STATUSES)[number];

export const SUPPLIER_PAYMENT_METHODS = [
  'CASH',
  'BANK_TRANSFER',
  'CHEQUE',
] as const;
export type SupplierPaymentMethod = (typeof SUPPLIER_PAYMENT_METHODS)[number];

export const PURCHASE_RETURN_REASONS = [
  'EXPIRED',
  'DAMAGED',
  'RECALLED',
  'OVERSTOCK',
  'INCORRECT_ITEM',
  'OTHER',
] as const;
export type PurchaseReturnReason = (typeof PURCHASE_RETURN_REASONS)[number];

export const DEFAULT_SUPPLIER_PAYMENT_TERMS_DAYS = 30;
