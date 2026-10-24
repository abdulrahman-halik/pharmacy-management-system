export const BatchStatus = {
  ACTIVE: 'ACTIVE',
  QUARANTINED: 'QUARANTINED',
  EXPIRED: 'EXPIRED',
  DEPLETED: 'DEPLETED',
} as const;
export type BatchStatus = (typeof BatchStatus)[keyof typeof BatchStatus];
export const BATCH_STATUSES = ['ACTIVE', 'QUARANTINED', 'EXPIRED', 'DEPLETED'] as const;

export const MovementType = {
  OPENING: 'OPENING',
  PURCHASE: 'PURCHASE',
  SALE: 'SALE',
  SALE_RETURN_RESTOCK: 'SALE_RETURN_RESTOCK',
  PURCHASE_RETURN: 'PURCHASE_RETURN',
  ADJUST_ADD: 'ADJUST_ADD',
  ADJUST_REDUCE: 'ADJUST_REDUCE',
  DAMAGE: 'DAMAGE',
  EXPIRED_WRITEOFF: 'EXPIRED_WRITEOFF',
  AUDIT_CORRECTION: 'AUDIT_CORRECTION',
} as const;
export type MovementType = (typeof MovementType)[keyof typeof MovementType];
export const MOVEMENT_TYPES = [
  'OPENING',
  'PURCHASE',
  'SALE',
  'SALE_RETURN_RESTOCK',
  'PURCHASE_RETURN',
  'ADJUST_ADD',
  'ADJUST_REDUCE',
  'DAMAGE',
  'EXPIRED_WRITEOFF',
  'AUDIT_CORRECTION',
] as const;

export const AuditStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type AuditStatus = (typeof AuditStatus)[keyof typeof AuditStatus];
export const AUDIT_STATUSES = ['IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'] as const;

export const ExpiryRiskTier = {
  CRITICAL_2D: 'CRITICAL_2D',
  EXPIRING_30D: 'EXPIRING_30D',
  EXPIRING_60D: 'EXPIRING_60D',
  EXPIRING_90D: 'EXPIRING_90D',
  HEALTHY: 'HEALTHY',
  EXPIRED: 'EXPIRED',
} as const;
export type ExpiryRiskTier = (typeof ExpiryRiskTier)[keyof typeof ExpiryRiskTier];
export const EXPIRY_RISK_TIERS = [
  'CRITICAL_2D',
  'EXPIRING_30D',
  'EXPIRING_60D',
  'EXPIRING_90D',
  'HEALTHY',
  'EXPIRED',
] as const;

export const EXPIRY_FILTER_OPTIONS = [
  'all',
  'critical',
  '30days',
  '60days',
  '90days',
  'expired',
] as const;
export type ExpiryFilterOption = (typeof EXPIRY_FILTER_OPTIONS)[number];

/** Maximum single adjustment cost value (in LKR) permitted without Manager sign-off */
export const MANAGER_APPROVAL_THRESHOLD_LKR = 25000;
