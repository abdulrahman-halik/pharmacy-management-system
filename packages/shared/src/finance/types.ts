import {
  CashDirection,
  CashSourceType,
  PaymentMethodCode,
  ExpenseCategoryCode,
} from './constants.js';

export interface PaymentMethodDto {
  id: string;
  code: PaymentMethodCode | string;
  name: string;
  requiresReference: boolean;
  isActive: boolean;
}

export interface BankAccountDto {
  id: string;
  bankName: string;
  branchName: string;
  accountNumber: string;
  maskedAccountNumber: string;
  accountName: string;
  openingBalanceLkr: number;
  currentBalanceLkr: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCategoryDto {
  id: string;
  code: ExpenseCategoryCode | string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface ExpenseDto {
  id: string;
  expenseDate: string;
  categoryId: string;
  category?: ExpenseCategoryDto;
  amountLkr: number;
  paymentMethodId: string;
  paymentMethod?: PaymentMethodDto;
  bankAccountId?: string | null;
  bankAccount?: BankAccountDto | null;
  description: string;
  receiptImageUrl?: string | null;
  createdByUserId: string;
  createdAt: string;
}

export interface CashLedgerEntryDto {
  id: string;
  entryDate: string;
  direction: CashDirection;
  amountLkr: number;
  paymentMethodId: string;
  paymentMethod?: PaymentMethodDto;
  bankAccountId?: string | null;
  bankAccount?: BankAccountDto | null;
  sourceType: CashSourceType;
  sourceId?: string | null;
  description: string;
  userId: string;
  createdAt: string;
}

export type DenominationCounts = Record<string, number>;

export interface DayCloseDto {
  id: string;
  closingDate: string;
  openingCashLkr: number;
  cashSalesLkr: number;
  cashCollectionsLkr: number;
  cashRefundsLkr: number;
  cashExpensesLkr: number;
  expectedCashLkr: number;
  countedCashLkr: number;
  cashVarianceLkr: number;
  varianceReason?: string | null;
  denominationsJson: DenominationCounts;
  isLocked: boolean;
  closedByUserId: string;
  reopenedByUserId?: string | null;
  reopenReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DayClosePreviewDto {
  closingDate: string;
  openingCashLkr: number;
  cashSalesLkr: number;
  cashCollectionsLkr: number;
  cashRefundsLkr: number;
  cashExpensesLkr: number;
  expectedCashLkr: number;
  isAlreadyClosed: boolean;
  dayClose?: DayCloseDto | null;
}

export interface ProfitAndLossSummaryDto {
  period: { startDate: string; endDate: string };
  grossSalesLkr: number;
  discountsLkr: number;
  returnsLkr: number;
  netRevenueLkr: number;
  cogsLkr: number;
  grossProfitLkr: number;
  grossMarginPercentage: number;
  operatingExpensesLkr: number;
  payrollCostsLkr: number;
  otherIncomeLkr: number;
  netProfitLkr: number;
}

export interface CashbookFilterDto {
  startDate?: string;
  endDate?: string;
  paymentMethodId?: string;
  bankAccountId?: string;
  sourceType?: CashSourceType;
  direction?: CashDirection;
  limit?: number;
  offset?: number;
}
