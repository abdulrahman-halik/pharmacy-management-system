export const PrescriptionStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  FULLY_DISPENSED: 'FULLY_DISPENSED',
} as const;
export type PrescriptionStatus = (typeof PrescriptionStatus)[keyof typeof PrescriptionStatus];
export const PRESCRIPTION_STATUSES = [
  'PENDING',
  'VERIFIED',
  'REJECTED',
  'EXPIRED',
  'FULLY_DISPENSED',
] as const;

export const PrescriptionItemStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type PrescriptionItemStatus = (typeof PrescriptionItemStatus)[keyof typeof PrescriptionItemStatus];
export const PRESCRIPTION_ITEM_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export const PrescriptionRejectionReason = {
  ILLEGIBLE_HANDWRITING: 'ILLEGIBLE_HANDWRITING',
  EXPIRED_PRESCRIPTION: 'EXPIRED_PRESCRIPTION',
  DOCTOR_UNVERIFIED: 'DOCTOR_UNVERIFIED',
  INCORRECT_DOSAGE: 'INCORRECT_DOSAGE',
  SUSPECTED_FORGERY: 'SUSPECTED_FORGERY',
  OTHER: 'OTHER',
} as const;
export type PrescriptionRejectionReason = (typeof PrescriptionRejectionReason)[keyof typeof PrescriptionRejectionReason];
export const PRESCRIPTION_REJECTION_REASONS = [
  'ILLEGIBLE_HANDWRITING',
  'EXPIRED_PRESCRIPTION',
  'DOCTOR_UNVERIFIED',
  'INCORRECT_DOSAGE',
  'SUSPECTED_FORGERY',
  'OTHER',
] as const;

export const CustomerCreditLedgerType = {
  CREDIT_PURCHASE: 'CREDIT_PURCHASE',
  PAYMENT: 'PAYMENT',
  ADJUSTMENT: 'ADJUSTMENT',
} as const;
export type CustomerCreditLedgerType = (typeof CustomerCreditLedgerType)[keyof typeof CustomerCreditLedgerType];
export const CUSTOMER_CREDIT_LEDGER_TYPES = ['CREDIT_PURCHASE', 'PAYMENT', 'ADJUSTMENT'] as const;

export const CustomerLoyaltyLedgerType = {
  EARNED: 'EARNED',
  REDEEMED: 'REDEEMED',
  EXPIRED: 'EXPIRED',
  ADJUSTMENT: 'ADJUSTMENT',
} as const;
export type CustomerLoyaltyLedgerType = (typeof CustomerLoyaltyLedgerType)[keyof typeof CustomerLoyaltyLedgerType];
export const CUSTOMER_LOYALTY_LEDGER_TYPES = ['EARNED', 'REDEEMED', 'EXPIRED', 'ADJUSTMENT'] as const;

export const PRESCRIPTION_BUCKET_NAME = 'pharmacy-prescriptions';
export const PRESCRIPTION_URL_EXPIRATION_SECONDS = 3600; // 60 minutes
