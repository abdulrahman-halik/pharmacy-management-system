export const PAYMENT_METHOD_TYPES = [
  'CASH',
  'CARD',
  'BANK_TRANSFER',
  'CREDIT',
  'LOYALTY_POINTS',
] as const;
export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPES)[number];

export const SALE_STATUSES = [
  'COMPLETED',
  'REFUNDED_PARTIAL',
  'REFUNDED_FULL',
  'VOIDED',
] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export const DEFAULT_VAT_RATE = 0.18; // 18% Sri Lankan Inland Revenue VAT Mandate
export const DEFAULT_SSCL_RATE = 0.025; // 2.5% Social Security Contribution Levy (SSCL)
export const MAX_PARKED_CARTS = 10;

export const POS_HOTKEYS = {
  SEARCH_MEDICINE: 'F2',
  LOOKUP_PATIENT: 'F4',
  CHECKOUT_PAY: 'F8',
  HOLD_PARK_CART: 'F9',
  CLEAR_DISMISS: 'Escape',
} as const;

export const QUICK_CASH_DENOMINATIONS = [100, 500, 1000, 2000, 5000] as const;
