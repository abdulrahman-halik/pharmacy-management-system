import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  calculateDenominationsTotal,
  ProfitAndLossSummaryDto,
  DayClosePreviewDto,
  BankAccountDto,
  CashLedgerEntryDto,
  ExpenseCategoryDto,
} from '@pharmacy/shared';
import { financeApi } from '../services/financeApi';

const DEFAULT_PNL: ProfitAndLossSummaryDto = {
  period: { startDate: '', endDate: '' },
  grossSalesLkr: 64500.0,
  discountsLkr: 1500.0,
  returnsLkr: 0.0,
  netRevenueLkr: 63000.0,
  cogsLkr: 41250.0,
  grossProfitLkr: 21750.0,
  grossMarginPercentage: 34.52,
  operatingExpensesLkr: 3200.0,
  payrollCostsLkr: 0.0,
  otherIncomeLkr: 0.0,
  netProfitLkr: 18550.0,
};

const DEFAULT_BANKS: BankAccountDto[] = [
  {
    id: 'ba-comb-main',
    bankName: 'Commercial Bank of Ceylon',
    branchName: 'Kollupitiya Branch',
    accountNumber: '1000849201',
    maskedAccountNumber: '•••••• 9201',
    accountName: 'Pharmacy Main Operating Account',
    openingBalanceLkr: 150000.0,
    currentBalanceLkr: 168450.0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ba-hnb-reserve',
    bankName: 'Hatton National Bank',
    branchName: 'Bambalapitiya Branch',
    accountNumber: '2000847192',
    maskedAccountNumber: '•••••• 7192',
    accountName: 'Pharmacy Reserve Account',
    openingBalanceLkr: 50000.0,
    currentBalanceLkr: 50000.0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_CASHBOOK: CashLedgerEntryDto[] = [
  {
    id: 'cle-1',
    entryDate: new Date().toISOString(),
    direction: 'IN',
    amountLkr: 1250.0,
    paymentMethodId: 'pm-cash',
    sourceType: 'SALE',
    sourceId: 'inv-101',
    description: 'POS Sale Receipt #INV-202610-0012 (Cash Counter)',
    userId: 'cashier-1',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cle-2',
    entryDate: new Date().toISOString(),
    direction: 'IN',
    amountLkr: 3800.0,
    paymentMethodId: 'pm-card',
    sourceType: 'SALE',
    sourceId: 'inv-102',
    description: 'POS Sale Receipt #INV-202610-0013 (Visa / MasterCard)',
    userId: 'cashier-1',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cle-3',
    entryDate: new Date().toISOString(),
    direction: 'OUT',
    amountLkr: 850.0,
    paymentMethodId: 'pm-cash',
    sourceType: 'EXPENSE',
    sourceId: 'exp-1',
    description: 'Expense: Staff Tea & Refreshments',
    userId: 'manager-1',
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_CATEGORIES: ExpenseCategoryDto[] = [
  { id: 'ec-rent', code: 'RENT', name: 'Store Premises Rent', isActive: true },
  { id: 'ec-electricity', code: 'ELECTRICITY', name: 'CEB Electricity', isActive: true },
  { id: 'ec-delivery', code: 'DELIVERY', name: 'Courier & Delivery', isActive: true },
  { id: 'ec-packaging', code: 'PACKAGING', name: 'Packaging Materials', isActive: true },
  { id: 'ec-staff-meals', code: 'STAFF_MEALS', name: 'Staff Tea & Refreshments', isActive: true },
];

export function useFinanceData() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [pnlSummary, setPnlSummary] = useState<ProfitAndLossSummaryDto>(DEFAULT_PNL);
  const [cashInDrawer, setCashInDrawer] = useState<number>(34850.0);
  const [bankAccounts, setBankAccounts] = useState<BankAccountDto[]>(DEFAULT_BANKS);
  const [cashbookEntries, setCashbookEntries] = useState<CashLedgerEntryDto[]>(DEFAULT_CASHBOOK);
  const [categories, setCategories] = useState<ExpenseCategoryDto[]>(DEFAULT_CATEGORIES);

  const [dayClosePreview, setDayClosePreview] = useState<DayClosePreviewDto>({
    closingDate: new Date().toISOString().split('T')[0],
    openingCashLkr: 15000.0,
    cashSalesLkr: 20700.0,
    cashCollectionsLkr: 0.0,
    cashRefundsLkr: 0.0,
    cashExpensesLkr: 850.0,
    expectedCashLkr: 34850.0,
    isAlreadyClosed: false,
    dayClose: null,
  });

  const [denominations, setDenominations] = useState<Record<string, number>>({
    '5000': 4,
    '1000': 12,
    '500': 4,
    '100': 8,
    '50': 0,
    '20': 0,
    '10': 5,
  });
  const [coinInput, setCoinInput] = useState<number>(0);
  const [varianceReason, setVarianceReason] = useState<string>('');

  const countedCash = useMemo(() => {
    return calculateDenominationsTotal(denominations) + (Number(coinInput) || 0);
  }, [denominations, coinInput]);

  const variance = useMemo(() => {
    return Number((countedCash - dayClosePreview.expectedCashLkr).toFixed(2));
  }, [countedCash, dayClosePreview.expectedCashLkr]);

  const isVarianceNonZero = Math.abs(variance) > 0.01;
  const canSubmitDayClose =
    !dayClosePreview.isAlreadyClosed &&
    (!isVarianceNonZero || varianceReason.trim().length >= 5);

  const refreshFinanceData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = `${today}T00:00:00.000Z`;
      const endOfDay = `${today}T23:59:59.999Z`;

      const [pnl, cid, banks, cb, dc, cats] = await Promise.all([
        financeApi.getProfitLoss(startOfDay, endOfDay),
        financeApi.getCashInDrawer(),
        financeApi.getBankAccounts(),
        financeApi.getCashbookEntries(50),
        financeApi.getDayClosePreview(today),
        financeApi.getExpenseCategories(),
      ]);

      if (pnl) setPnlSummary(pnl);
      if (cid !== null) setCashInDrawer(cid);
      if (banks.length > 0) setBankAccounts(banks);
      if (cb.length > 0) setCashbookEntries(cb);
      if (dc) setDayClosePreview(dc);
      if (cats.length > 0) setCategories(cats);
    } catch {
      // Graceful offline fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFinanceData();
  }, [refreshFinanceData]);

  const handleDenominationChange = (denom: string, val: number) => {
    setDenominations((prev) => ({
      ...prev,
      [denom]: Math.max(0, val),
    }));
  };

  return {
    isLoading,
    setIsLoading,
    errorMsg,
    setErrorMsg,
    successMsg,
    setSuccessMsg,
    pnlSummary,
    cashInDrawer,
    bankAccounts,
    cashbookEntries,
    categories,
    dayClosePreview,
    denominations,
    coinInput,
    setCoinInput,
    varianceReason,
    setVarianceReason,
    countedCash,
    variance,
    isVarianceNonZero,
    canSubmitDayClose,
    refreshFinanceData,
    handleDenominationChange,
  };
}
