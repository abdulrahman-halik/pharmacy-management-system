import { z } from 'zod';
import {
  BATCH_STATUSES,
  MOVEMENT_TYPES,
  AUDIT_STATUSES,
  EXPIRY_FILTER_OPTIONS,
} from './constants.js';

export const BatchStatusSchema = z.enum(BATCH_STATUSES);
export const MovementTypeSchema = z.enum(MOVEMENT_TYPES);
export const AuditStatusSchema = z.enum(AUDIT_STATUSES);
export const ExpiryFilterSchema = z.enum(EXPIRY_FILTER_OPTIONS);

export const CreateBatchSchema = z
  .object({
    medicineId: z.string().min(1, 'Medicine ID is required'),
    batchNumber: z
      .string()
      .trim()
      .min(1, 'Batch number is required')
      .max(80, 'Batch number must not exceed 80 characters'),
    mfdDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Manufacturing date must be in YYYY-MM-DD format')
      .optional()
      .nullable(),
    expiryDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expiry date must be in YYYY-MM-DD format'),
    quantityBaseUnits: z
      .number({ invalid_type_error: 'Quantity must be a valid number' })
      .int('Quantity must be an integer')
      .min(0, 'Quantity cannot be negative')
      .default(0),
    unitCostPrice: z
      .number({ invalid_type_error: 'Cost price must be a valid number' })
      .positive('Cost price must be greater than zero'),
    batchMrp: z
      .number({ invalid_type_error: 'MRP must be a valid number' })
      .positive('Batch MRP must be greater than zero'),
    supplierId: z.string().trim().max(64).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.mfdDate && data.expiryDate) {
      const mfd = new Date(data.mfdDate);
      const exp = new Date(data.expiryDate);
      if (!Number.isNaN(mfd.getTime()) && !Number.isNaN(exp.getTime()) && exp <= mfd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expiryDate'],
          message: 'Expiry date must be after manufacturing date',
        });
      }
    }
  });

export type CreateBatchInput = z.infer<typeof CreateBatchSchema>;

export const StockAdjustmentSchema = z
  .object({
    batchId: z.string().min(1, 'Batch ID is required'),
    adjustmentType: z.enum(['ADD', 'REDUCE'], {
      required_error: 'Adjustment type is required (ADD or REDUCE)',
    }),
    quantityBaseUnits: z
      .number({ invalid_type_error: 'Quantity must be a valid number' })
      .int('Quantity must be an integer')
      .positive('Quantity must be greater than zero'),
    reason: z
      .string()
      .trim()
      .min(3, 'Audit reason must be at least 3 characters')
      .max(255, 'Audit reason cannot exceed 255 characters'),
    managerApprovedBy: z.string().trim().max(64).optional().nullable(),
    estimatedCostLkr: z.number().nonnegative().optional(),
  })
  .superRefine((data, ctx) => {
    // If estimated cost is provided and exceeds Rs. 25,000, manager approval is mandatory
    if (data.estimatedCostLkr !== undefined && data.estimatedCostLkr > 25000 && !data.managerApprovedBy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['managerApprovedBy'],
        message: 'Stock adjustment exceeding Rs. 25,000 requires Manager sign-off',
      });
    }
  });

export type StockAdjustmentInput = z.infer<typeof StockAdjustmentSchema>;

export const BatchRecallSchema = z.object({
  batchId: z.string().min(1, 'Batch ID is required'),
  reason: z
    .string()
    .trim()
    .min(5, 'Recall reason must be at least 5 characters')
    .max(255, 'Recall reason cannot exceed 255 characters'),
});

export type BatchRecallInput = z.infer<typeof BatchRecallSchema>;

export const BatchFilterQuerySchema = z.object({
  medicineId: z.string().optional(),
  status: BatchStatusSchema.optional(),
  expiryFilter: ExpiryFilterSchema.optional().default('all'),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type BatchFilterQueryInput = z.infer<typeof BatchFilterQuerySchema>;

export const FefoPreviewQuerySchema = z.object({
  requestedUnits: z.coerce
    .number({ invalid_type_error: 'Requested units must be a number' })
    .int('Requested units must be an integer')
    .positive('Requested units must be greater than zero'),
});

export type FefoPreviewQueryInput = z.infer<typeof FefoPreviewQuerySchema>;

export const StartAuditSessionSchema = z.object({
  sessionCode: z.string().trim().max(32).optional(),
  notes: z.string().trim().max(255).optional(),
});

export type StartAuditSessionInput = z.infer<typeof StartAuditSessionSchema>;

export const RecordAuditCountSchema = z.object({
  batchId: z.string().min(1, 'Batch ID is required'),
  countedQuantityBaseUnits: z
    .number({ invalid_type_error: 'Counted quantity must be a number' })
    .int('Counted quantity must be an integer')
    .min(0, 'Counted quantity cannot be negative'),
  notes: z.string().trim().max(255).optional().nullable(),
});

export type RecordAuditCountInput = z.infer<typeof RecordAuditCountSchema>;

export const ApproveAuditSessionSchema = z.object({
  approvedBy: z.string().trim().min(1, 'Approver user identifier is required'),
  decision: z.enum(['APPROVED', 'REJECTED']),
});

export type ApproveAuditSessionInput = z.infer<typeof ApproveAuditSessionSchema>;
