import { z } from 'zod';
import { EXPORT_FORMATS, REPORT_TYPES } from './constants.js';

export const ReportQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  cashierId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  paymentMethod: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  format: z.enum(EXPORT_FORMATS).default('json'),
});

export const ExpiryRiskQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(90),
  format: z.enum(EXPORT_FORMATS).default('json'),
});

export const NmraLogQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  medicineId: z.string().uuid().optional(),
  format: z.enum(EXPORT_FORMATS).default('json'),
});
