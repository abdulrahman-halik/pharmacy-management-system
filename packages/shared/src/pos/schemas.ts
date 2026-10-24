import { z } from 'zod';
import { PACKAGING_LEVELS } from '../utils/packaging.js';
import { PAYMENT_METHOD_TYPES, SALE_STATUSES } from './constants.js';

export const SplitPaymentSchema = z.object({
  method: z.enum(PAYMENT_METHOD_TYPES, {
    errorMap: () => ({ message: 'Invalid payment method' }),
  }),
  amount: z
    .number()
    .positive({ message: 'Payment amount must be greater than zero' })
    .max(10_000_000, { message: 'Payment amount exceeds maximum single transaction limit' }),
  reference: z.string().trim().max(100).optional(),
});

export const CheckoutItemSchema = z.object({
  medicineId: z.string().uuid({ message: 'Valid medicine UUID is required' }),
  packagingLevel: z.enum(PACKAGING_LEVELS, {
    errorMap: () => ({ message: 'Invalid packaging level' }),
  }),
  quantity: z
    .number()
    .int({ message: 'Quantity must be an integer' })
    .positive({ message: 'Quantity must be at least 1' })
    .max(50_000, { message: 'Quantity exceeds maximum single line limit' }),
  unitPriceLkr: z
    .number()
    .nonnegative({ message: 'Unit price cannot be negative' })
    .max(1_000_000, { message: 'Unit price exceeds ceiling' }),
});

export const CheckoutSchema = z
  .object({
    customerId: z.string().uuid().nullable().optional(),
    prescriptionId: z.string().uuid().nullable().optional(),
    items: z
      .array(CheckoutItemSchema)
      .min(1, { message: 'Checkout cart must contain at least one item' })
      .max(200, { message: 'Cart exceeds 200 items ceiling' }),
    discountLkr: z.number().nonnegative().default(0),
    isVatApplicable: z.boolean().default(false),
    isSsclApplicable: z.boolean().default(false),
    loyaltyRedeemedLkr: z.number().nonnegative().default(0),
    splitPayments: z
      .array(SplitPaymentSchema)
      .min(1, { message: 'At least one payment method is required' }),
    idempotencyKey: z.string().trim().min(8).max(128).nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // If credit is one of the payment methods, customerId MUST be provided
    const creditPayment = data.splitPayments.find((p) => p.method === 'CREDIT');
    if (creditPayment && !data.customerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customerId'],
        message: 'Customer ID is strictly required when paying with Store Credit',
      });
    }

    // Check for duplicate medicine IDs with the same packaging tier in the cart
    const seen = new Set<string>();
    data.items.forEach((item, idx) => {
      const key = `${item.medicineId}-${item.packagingLevel}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', idx],
          message: `Duplicate item for medicine and tier "${item.packagingLevel}". Combine quantities instead.`,
        });
      }
      seen.add(key);
    });
  });

export const SaleQuerySchema = z.object({
  search: z.string().trim().optional(),
  customerId: z.string().uuid().optional(),
  cashierUserId: z.string().trim().optional(),
  status: z.enum(SALE_STATUSES).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD format required').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD format required').optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
