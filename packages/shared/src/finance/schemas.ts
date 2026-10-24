import { z } from 'zod';
import {
  CASH_DIRECTIONS,
  CASH_SOURCE_TYPES,
  SRI_LANKAN_CURRENCY_DENOMINATIONS,
} from './constants.js';

export const maskBankAccountNumber = (accNo: string): string => {
  const trimmed = (accNo || '').trim();
  if (trimmed.length <= 4) return trimmed;
  const lastFour = trimmed.slice(-4);
  return '•'.repeat(Math.max(trimmed.length - 4, 4)) + ' ' + lastFour;
};

export const calculateDenominationsTotal = (
  denominations: Record<string, number>,
): number => {
  if (!denominations || typeof denominations !== 'object') return 0;
  let total = 0;
  for (const [denomStr, count] of Object.entries(denominations)) {
    const denom = Number(denomStr);
    const qty = Number(count);
    if (!isNaN(denom) && !isNaN(qty) && qty > 0) {
      total += denom * qty;
    }
  }
  return Math.round(total * 100) / 100;
};

export const CreateBankAccountSchema = z.object({
  bankName: z
    .string()
    .trim()
    .min(2, { message: 'Bank name must be at least 2 characters' })
    .max(100),
  branchName: z
    .string()
    .trim()
    .min(2, { message: 'Branch name must be at least 2 characters' })
    .max(80),
  accountNumber: z
    .string()
    .trim()
    .min(4, { message: 'Account number must be at least 4 digits' })
    .max(40),
  accountName: z
    .string()
    .trim()
    .min(2, { message: 'Account holder name must be at least 2 characters' })
    .max(120),
  openingBalanceLkr: z
    .number()
    .nonnegative({ message: 'Opening balance must be zero or positive' })
    .default(0.0),
});
export type CreateBankAccountInput = z.infer<typeof CreateBankAccountSchema>;

export const BankTransferSchema = z
  .object({
    fromBankAccountId: z.string().uuid({ message: 'Source bank account ID is required' }),
    toBankAccountId: z.string().uuid({ message: 'Destination bank account ID is required' }),
    amountLkr: z
      .number()
      .positive({ message: 'Transfer amount must be greater than zero' }),
    feeLkr: z
      .number()
      .nonnegative({ message: 'Bank fee cannot be negative' })
      .default(0.0),
    description: z
      .string()
      .trim()
      .min(3, { message: 'Transfer description must be at least 3 characters' })
      .max(255),
  })
  .refine((data) => data.fromBankAccountId !== data.toBankAccountId, {
    message: 'Source and destination bank accounts must be different',
    path: ['toBankAccountId'],
  });
export type BankTransferInput = z.infer<typeof BankTransferSchema>;

export const CreateExpenseSchema = z.object({
  expenseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/, { message: 'Expense date must be YYYY-MM-DD format' }),
  categoryId: z.string().uuid({ message: 'Category ID is required' }),
  amountLkr: z
    .number()
    .positive({ message: 'Expense amount must be greater than zero' }),
  paymentMethodId: z.string().uuid({ message: 'Payment method ID is required' }),
  bankAccountId: z.string().uuid().optional().nullable(),
  description: z
    .string()
    .trim()
    .min(3, { message: 'Description must be at least 3 characters' })
    .max(255),
  receiptImageUrl: z.string().trim().url().optional().nullable().or(z.literal('')),
});
export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;

export const DenominationsMapSchema = z.record(
  z.string(),
  z.number().int().nonnegative({ message: 'Denomination count cannot be negative' }),
);

export const DayCloseCommitSchema = z
  .object({
    closingDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}/, { message: 'Closing date must be YYYY-MM-DD format' }),
    countedCashLkr: z
      .number()
      .nonnegative({ message: 'Counted cash cannot be negative' }),
    denominations: DenominationsMapSchema,
    varianceReason: z.string().trim().max(255).optional().nullable(),
    expectedCashLkr: z.number().optional(),
  })
  .refine(
    (data) => {
      if (data.expectedCashLkr !== undefined) {
        const diff = Math.abs(data.countedCashLkr - data.expectedCashLkr);
        if (diff > 0.01) {
          return !!data.varianceReason && data.varianceReason.trim().length >= 5;
        }
      }
      return true;
    },
    {
      message:
        'A mandatory explanation (at least 5 characters) is required when counted cash differs from expected cash',
      path: ['varianceReason'],
    },
  );
export type DayCloseCommitInput = z.infer<typeof DayCloseCommitSchema>;

export const DayCloseReopenSchema = z.object({
  closingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/, { message: 'Closing date must be YYYY-MM-DD format' }),
  reason: z
    .string()
    .trim()
    .min(5, { message: 'Reopening reason must be at least 5 characters for audit logging' })
    .max(255),
});
export type DayCloseReopenInput = z.infer<typeof DayCloseReopenSchema>;

export const CashbookQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  paymentMethodId: z.string().optional(),
  bankAccountId: z.string().optional(),
  sourceType: z.enum(CASH_SOURCE_TYPES).optional(),
  direction: z.enum(CASH_DIRECTIONS).optional(),
  limit: z.coerce.number().int().positive().max(500).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type CashbookQueryInput = z.infer<typeof CashbookQuerySchema>;

export const ProfitLossQuerySchema = z.object({
  startDate: z.string().min(10, { message: 'Start date is required' }),
  endDate: z.string().min(10, { message: 'End date is required' }),
});
export type ProfitLossQueryInput = z.infer<typeof ProfitLossQuerySchema>;
