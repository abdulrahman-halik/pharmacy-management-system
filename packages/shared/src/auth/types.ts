import type { PermissionModuleName, SpecialActionName, UserRoleName } from './constants.js';

export interface UserPayload {
  id: string;
  fullName: string;
  email: string;
  role: UserRoleName;
  storeId: number;
}

export interface ModulePermission {
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  specialActions: SpecialActionName[];
}

export type PermissionMap = Partial<Record<PermissionModuleName, ModulePermission>>;

export interface AuthSessionResponse {
  user: UserPayload;
  mustResetPassword: boolean;
  permissions: PermissionMap;
}

export interface PermissionMatrixEntry extends ModulePermission {
  role: UserRoleName;
  moduleName: PermissionModuleName;
}

export interface StaffUserResponse {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRoleName;
  isActive: boolean;
  mustResetPassword: boolean;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  monthlySalary?: number;
}

export interface AuditLogResponse {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entityName: string;
  entityId: string | null;
  beforeStateJson: Record<string, unknown> | null;
  afterStateJson: Record<string, unknown> | null;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}
