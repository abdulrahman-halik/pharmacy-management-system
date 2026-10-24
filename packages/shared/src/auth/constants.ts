export const USER_ROLES = ['ADMIN', 'MANAGER', 'PHARMACIST', 'CASHIER'] as const;
export type UserRoleName = (typeof USER_ROLES)[number];

export const PERMISSION_MODULES = [
  'DASHBOARD',
  'POS',
  'INVENTORY',
  'MEDICINES',
  'SALES',
  'PRESCRIPTIONS',
  'CUSTOMERS',
  'DOCTORS',
  'PURCHASES',
  'FINANCE',
  'PAYROLL',
  'REPORTS',
  'SETTINGS',
  'USERS',
  'AI_ASSISTANT',
] as const;
export type PermissionModuleName = (typeof PERMISSION_MODULES)[number];

export const SPECIAL_ACTIONS = [
  'PRICE_OVERRIDE',
  'APPROVE_ADJUSTMENT',
  'REOPEN_DAY',
  'VOID_SALE',
  'VIEW_COST_PRICE',
  'EXPORT_DATA',
] as const;
export type SpecialActionName = (typeof SPECIAL_ACTIONS)[number];

export const CRUD_ACTIONS = ['view', 'add', 'edit', 'delete'] as const;
export type CrudAction = (typeof CRUD_ACTIONS)[number];

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const ACCOUNT_LOCK_MINUTES = 30;
