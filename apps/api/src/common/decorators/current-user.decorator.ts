import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { UserRole } from '../../modules/users/entities/user.entity';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  storeId: number;
  mustResetPassword: boolean;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser =>
    (ctx.switchToHttp().getRequest<Request>() as Request & { user: AuthenticatedUser }).user,
);
