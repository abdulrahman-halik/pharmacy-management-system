import { z } from 'zod';
import { LKPhoneSchema, normalizeLKPhone } from '../schemas/lk-validators.js';
import { PERMISSION_MODULES, SPECIAL_ACTIONS, USER_ROLES } from './constants.js';

export const EmailSchema = z.string().trim().toLowerCase().email().max(150);

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one symbol');

export const NormalizedLKPhoneSchema = z
  .string()
  .trim()
  .transform((value) => normalizeLKPhone(value))
  .pipe(LKPhoneSchema);

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1).max(128),
});
export type LoginDto = z.infer<typeof LoginSchema>;

export const ResetPasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: PasswordSchema,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: 'New password must differ from the current password',
    path: ['newPassword'],
  });
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;

export const UserRoleSchema = z.enum(USER_ROLES);

export const CreateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: EmailSchema,
  phone: NormalizedLKPhoneSchema,
  role: UserRoleSchema,
  monthlySalary: z.number().min(0).max(99_999_999.99).default(0),
  initialPassword: PasswordSchema,
});
export type CreateUserDto = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    phone: NormalizedLKPhoneSchema,
    role: UserRoleSchema,
    monthlySalary: z.number().min(0).max(99_999_999.99),
    isActive: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field must be provided' });
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

export const ListUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
});
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

export const PermissionEntrySchema = z
  .object({
    role: UserRoleSchema.exclude(['ADMIN']),
    moduleName: z.enum(PERMISSION_MODULES),
    canView: z.boolean(),
    canAdd: z.boolean(),
    canEdit: z.boolean(),
    canDelete: z.boolean(),
    specialActions: z.array(z.enum(SPECIAL_ACTIONS)).default([]),
  })
  .refine((e) => e.canView || !(e.canAdd || e.canEdit || e.canDelete), {
    message: 'Add/edit/delete access requires view access',
    path: ['canView'],
  });

export const UpdatePermissionMatrixSchema = z.object({
  entries: z
    .array(PermissionEntrySchema)
    .min(1)
    .max(USER_ROLES.length * PERMISSION_MODULES.length)
    .refine((entries) => new Set(entries.map((e) => `${e.role}:${e.moduleName}`)).size === entries.length, {
      message: 'Duplicate role/module entries are not allowed',
    }),
});
export type UpdatePermissionMatrixDto = z.infer<typeof UpdatePermissionMatrixSchema>;

export const AuditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  userId: z.string().trim().max(64).optional(),
  action: z.string().trim().max(64).optional(),
  entityName: z.string().trim().max(64).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;
