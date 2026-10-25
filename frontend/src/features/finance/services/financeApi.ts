import {
  ProfitAndLossSummaryDto,
  DayClosePreviewDto,
  BankAccountDto,
  CashLedgerEntryDto,
  ExpenseCategoryDto,
} from '@pharmacy/shared';

const API_BASE = 'http://localhost:4000';

export const financeApi = {
  async getProfitLoss(startDate: string, endDate: string): Promise<ProfitAndLossSummaryDto | null> {
    try {
      const res = await fetch(`${API_BASE}/finance/profit-loss?startDate=${startDate}&endDate=${endDate}`);
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  },

  async getCashInDrawer(): Promise<number | null> {
    try {
      const res = await fetch(`${API_BASE}/finance/cashbook/cash-in-drawer`);
      if (res.ok) {
        const data = await res.json();
        return data.cashInDrawerLkr;
      }
      return null;
    } catch {
      return null;
    }
  },

  async getBankAccounts(): Promise<BankAccountDto[]> {
    try {
      const res = await fetch(`${API_BASE}/finance/banks`);
      return res.ok ? await res.json() : [];
    } catch {
      return [];
    }
  },

  async getCashbookEntries(limit = 50): Promise<CashLedgerEntryDto[]> {
    try {
      const res = await fetch(`${API_BASE}/finance/cashbook?limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        return data.entries || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async getDayClosePreview(date: string): Promise<DayClosePreviewDto | null> {
    try {
      const res = await fetch(`${API_BASE}/finance/day-close/preview?date=${date}`);
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  },

  async getExpenseCategories(): Promise<ExpenseCategoryDto[]> {
    try {
      const res = await fetch(`${API_BASE}/finance/expenses/categories`);
      return res.ok ? await res.json() : [];
    } catch {
      return [];
    }
  },

  async recordExpense(payload: {
    expenseDate: string;
    categoryId: string;
    amountLkr: number;
    paymentMethodId: string;
    description: string;
  }) {
    const res = await fetch(`${API_BASE}/finance/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to record expense');
    }
    return res.json();
  },

  async executeTransfer(payload: {
    fromBankAccountId: string;
    toBankAccountId: string;
    amountLkr: number;
    feeLkr: number;
    description: string;
  }) {
    const res = await fetch(`${API_BASE}/finance/banks/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to record internal transfer');
    }
    return res.json();
  },

  async commitDayClose(payload: {
    closingDate: string;
    countedCashLkr: number;
    denominations: Record<string, number>;
    varianceReason?: string;
  }) {
    const res = await fetch(`${API_BASE}/finance/day-close/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to commit Day-Close');
    }
    return res.json();
  },

  async reopenDayClose(payload: { closingDate: string; reason: string }) {
    const res = await fetch(`${API_BASE}/finance/day-close/reopen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to reopen register');
    }
    return res.json();
  },
};
