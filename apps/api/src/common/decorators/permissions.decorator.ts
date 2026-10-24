import { SetMetadata } from '@nestjs/common';
import type { CrudAction, PermissionModuleName, SpecialActionName } from '@pharmacy/shared';

export interface RequiredPermission {
  module: PermissionModuleName;
  action: CrudAction | 'special';
  specialAction?: SpecialActionName;
}

export const PERMISSIONS_KEY = 'permissions';
export const ADMIN_ONLY_KEY = 'adminOnly';
export const IS_PUBLIC_KEY = 'isPublic';
export const ALLOW_PENDING_RESET_KEY = 'allowPendingPasswordReset';

export const RequirePermission = (
  module: PermissionModuleName,
  action: CrudAction | 'special',
  specialAction?: SpecialActionName,
) => SetMetadata(PERMISSIONS_KEY, { module, action, specialAction } satisfies RequiredPermission);

/** Hard ceiling: cannot be granted through the permission matrix. */
export const AdminOnly = () => SetMetadata(ADMIN_ONLY_KEY, true);

/** Opts a route out of the global authentication guard. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Lets a user with a pending forced password reset reach this route. */
export const AllowPendingPasswordReset = () => SetMetadata(ALLOW_PENDING_RESET_KEY, true);
