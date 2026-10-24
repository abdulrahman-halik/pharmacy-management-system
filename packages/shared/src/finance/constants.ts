export const CASH_DIRECTIONS = ['IN', 'OUT'] as const;
export type CashDirection = (typeof CASH_DIRECTIONS)[number];

export const CASH_SOURCE_TYPES = [
  'SALE',
  'SALE_RETURN',
  'CUSTOMER_COLLECTION',
  'SUPPLIER_PAYMENT',
  'PURCHASE_RETURN_REFUND',
  'EXPENSE',
  'OTHER_INCOME',
  'SALARY',
  'ADVANCE',
  'OPENING',
  'TRANSFER',
] as const;
export type CashSourceType = (typeof CASH_SOURCE_TYPES)[number];

export const PAYMENT_METHOD_CODES = [
  'CASH',
  'VISA_MASTER',
  'LANKA_QR',
  'CUSTOMER_CREDIT',
  'LOYALTY_POINTS',
  'CHEQUE',
  'BANK_TRANSFER',
] as const;
export type PaymentMethodCode = (typeof PAYMENT_METHOD_CODES)[number];

export const EXPENSE_CATEGORY_CODES = [
  'RENT',
  'ELECTRICITY',
  'WATER',
  'INTERNET',
  'DELIVERY',
  'PACKAGING',
  'STAFF_MEALS',
  'MAINTENANCE',
  'PRINTING_STATIONERY',
  'MARKETING',
  'TAX_LEGAL',
  'OTHER',
] as const;
export type ExpenseCategoryCode = (typeof EXPENSE_CATEGORY_CODES)[number];

export const SRI_LANKAN_CURRENCY_DENOMINATIONS = [
  5000, 1000, 500, 100, 50, 20, 10,
] as const;
export type SriLankanCurrencyDenomination =
  (typeof SRI_LANKAN_CURRENCY_DENOMINATIONS)[number];
