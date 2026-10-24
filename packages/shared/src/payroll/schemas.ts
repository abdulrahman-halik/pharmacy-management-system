import { z } from 'zod';
import {
  ADVANCE_STATUSES,
  PAYROLL_STATUSES,
  DISBURSEMENT_METHODS,
} from './constants.js';

export const CreateSalaryAdvanceSchema = z.object({
  userId: z.string().min(1, 'Employee user ID is required'),
  amountLkr: z
    .number({ invalid_type_error: 'Advance amount must be a number' })
    .positive('Advance amount must be greater than zero')
    .max(5000000, 'Advance amount exceeds maximum allowed ceiling'),
  paymentMethodId: z.string().min(1, 'Payment method ID is required'),
  reason: z
    .string()
    .min(3, 'Reason must be at least 3 characters')
    .max(255, 'Reason cannot exceed 255 characters'),
  overrideCap: z.boolean().optional().default(false),
});
export type CreateSalaryAdvanceInput = z.infer<typeof CreateSalaryAdvanceSchema>;

export const SalaryAdvanceQuerySchema = z.object({
  userId: z.string().optional(),
  status: z.enum(ADVANCE_STATUSES).optional(),
  monthYear: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'monthYear must be in YYYY-MM format')
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type SalaryAdvanceQueryInput = z.infer<typeof SalaryAdvanceQuerySchema>;

export const GeneratePayrollSchema = z.object({
  monthYear: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'monthYear must be in YYYY-MM format'),
  userIds: z.array(z.string()).optional(),
});
export type GeneratePayrollInput = z.infer<typeof GeneratePayrollSchema>;

export const PayrollQuerySchema = z.object({
  monthYear: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'monthYear must be in YYYY-MM format')
    .optional(),
  status: z.enum(PAYROLL_STATUSES).optional(),
  userId: z.string().optional(),
});
export type PayrollQueryInput = z.infer<typeof PayrollQuerySchema>;

export const DisbursePayrollSchema = z.object({
  disbursementMethod: z.enum(DISBURSEMENT_METHODS),
  bankAccountId: z.string().optional(),
  paymentMethodId: z.string().optional(),
});
export type DisbursePayrollInput = z.infer<typeof DisbursePayrollSchema>;

export const UpdateStaffCompensationSchema = z.object({
  monthlySalary: z
    .number({ invalid_type_error: 'Monthly salary must be a number' })
    .min(0, 'Monthly salary cannot be negative'),
  epfNumber: z.string().trim().max(32).optional().nullable(),
  bankName: z.string().trim().max(100).optional().nullable(),
  bankAccountNumber: z.string().trim().max(50).optional().nullable(),
  bankBranch: z.string().trim().max(100).optional().nullable(),
});
export type UpdateStaffCompensationInput = z.infer<
  typeof UpdateStaffCompensationSchema
>;

export const AdjustPayrollItemSchema = z.object({
  bonusAllowanceLkr: z.number().min(0).optional(),
  overtimeLkr: z.number().min(0).optional(),
  otherDeductionsLkr: z.number().min(0).optional(),
});
export type AdjustPayrollItemInput = z.infer<typeof AdjustPayrollItemSchema>;
