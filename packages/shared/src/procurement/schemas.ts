import { z } from 'zod';
import { PACKAGING_LEVELS } from '../utils/packaging.js';
import {
  PURCHASE_ORDER_STATUSES,
  SUPPLIER_PAYMENT_METHODS,
  PURCHASE_RETURN_REASONS,
  DEFAULT_SUPPLIER_PAYMENT_TERMS_DAYS,
} from './constants.js';

// Sri Lankan phone validation for businesses (mobile 07X / +947X or landlines 011X / +9411X, 9 digits after 0 or +94)
export const LK_SUPPLIER_PHONE_REGEX = /^(?:\+94|0)(?:[1-9]\d{8})$/;

export const normalizeLKSupplierPhone = (phone: string): string => {
  const cleaned = phone.replace(/[\s\-]/g, '');
  if (cleaned.startsWith('0')) {
    return '+94' + cleaned.slice(1);
  }
  return cleaned;
};

export const CreateSupplierSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, { message: 'Company name must be at least 2 characters' })
    .max(150),
  contactPerson: z.string().trim().max(100).optional().nullable(),
  phone: z
    .string()
    .trim()
    .regex(LK_SUPPLIER_PHONE_REGEX, {
      message: 'Invalid Sri Lankan phone number (e.g. +94112345678 or 0771234567)',
    })
    .transform(normalizeLKSupplierPhone),
  email: z.string().trim().email({ message: 'Invalid email address' }).optional().nullable().or(z.literal('')),
  address: z.string().trim().max(500).optional().nullable(),
  taxTinNumber: z.string().trim().max(50).optional().nullable(),
  paymentTermsDays: z
    .number()
    .int()
    .min(0)
    .max(365)
    .default(DEFAULT_SUPPLIER_PAYMENT_TERMS_DAYS),
});
export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;

export const UpdateSupplierSchema = CreateSupplierSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateSupplierInput = z.infer<typeof UpdateSupplierSchema>;

export const PurchaseOrderItemInputSchema = z.object({
  medicineId: z.string().uuid(),
  packagingLevel: z.enum(PACKAGING_LEVELS),
  quantity: z.number().int().positive({ message: 'Quantity must be greater than 0' }),
  unitCostLkr: z.number().positive({ message: 'Unit cost must be greater than 0' }),
});
export type PurchaseOrderItemInput = z.infer<typeof PurchaseOrderItemInputSchema>;

export const CreatePurchaseOrderSchema = z.object({
  supplierId: z.string().uuid(),
  orderDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'orderDate must be YYYY-MM-DD' }),
  expectedDeliveryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'expectedDeliveryDate must be YYYY-MM-DD' })
    .optional()
    .nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  items: z
    .array(PurchaseOrderItemInputSchema)
    .min(1, { message: 'Purchase order must have at least one item' }),
});
export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderSchema>;

export const UpdatePurchaseOrderStatusSchema = z.object({
  status: z.enum(PURCHASE_ORDER_STATUSES),
});
export type UpdatePurchaseOrderStatusInput = z.infer<typeof UpdatePurchaseOrderStatusSchema>;

export const CreateGrnItemSchema = z.object({
  medicineId: z.string().uuid(),
  batchNumber: z
    .string()
    .trim()
    .min(1, { message: 'Batch number is required' })
    .max(80),
  mfdDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'mfdDate must be YYYY-MM-DD' })
    .optional()
    .nullable(),
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'expiryDate must be YYYY-MM-DD' }),
  packagingLevel: z.enum(PACKAGING_LEVELS),
  purchasedQuantity: z
    .number()
    .int()
    .positive({ message: 'Purchased quantity must be greater than 0' }),
  bonusQuantity: z
    .number()
    .int()
    .min(0, { message: 'Bonus quantity cannot be negative' })
    .optional()
    .default(0),
  purchasePriceLkr: z
    .number()
    .positive({ message: 'Purchase price must be greater than 0' }),
  batchMrpPerBaseUnit: z
    .number()
    .positive({ message: 'Batch MRP per base unit must be greater than 0' }),
});
export type CreateGrnItemInput = z.input<typeof CreateGrnItemSchema>;

export const CreateGrnSchema = z.object({
  supplierId: z.string().uuid(),
  purchaseOrderId: z.string().uuid().optional().nullable(),
  supplierInvoiceNumber: z
    .string()
    .trim()
    .min(1, { message: 'Supplier physical invoice number is required' })
    .max(80),
  receivedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'receivedDate must be YYYY-MM-DD' }),
  taxVatLkr: z.number().min(0).optional().default(0),
  notes: z.string().trim().max(1000).optional().nullable(),
  items: z
    .array(CreateGrnItemSchema)
    .min(1, { message: 'GRN must contain at least one item' }),
});
export type CreateGrnInput = z.input<typeof CreateGrnSchema>;

export const GrnAllocationInputSchema = z.object({
  grnId: z.string().uuid(),
  amount: z.number().positive({ message: 'Allocation amount must be greater than 0' }),
});
export type GrnAllocationInput = z.infer<typeof GrnAllocationInputSchema>;

export const RecordSupplierPaymentSchema = z.object({
  amountLkr: z.number().positive({ message: 'Payment amount must be greater than 0' }),
  paymentMethod: z.enum(SUPPLIER_PAYMENT_METHODS),
  bankAccountId: z.string().trim().max(100).optional().nullable(),
  reference: z.string().trim().min(1, { message: 'Payment reference or cheque number is required' }).max(100),
  notes: z.string().trim().max(500).optional().nullable(),
  grnAllocations: z.array(GrnAllocationInputSchema).optional(),
});
export type RecordSupplierPaymentInput = z.infer<typeof RecordSupplierPaymentSchema>;

export const PurchaseReturnItemInputSchema = z.object({
  batchId: z.string().uuid(),
  quantityBaseUnits: z
    .number()
    .int()
    .positive({ message: 'Return quantity must be greater than 0 base units' }),
  reason: z.string().trim().max(255).optional().nullable(),
});
export type PurchaseReturnItemInput = z.infer<typeof PurchaseReturnItemInputSchema>;

export const CreatePurchaseReturnSchema = z.object({
  supplierId: z.string().uuid(),
  reason: z.enum(PURCHASE_RETURN_REASONS),
  notes: z.string().trim().max(1000).optional().nullable(),
  items: z
    .array(PurchaseReturnItemInputSchema)
    .min(1, { message: 'Purchase return must include at least one item' }),
});
export type CreatePurchaseReturnInput = z.infer<typeof CreatePurchaseReturnSchema>;
