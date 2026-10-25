import {
  StaffCompensationDto,
  SalaryAdvanceDto,
  PayrollMonthSummaryDto,
} from '@pharmacy/shared';

const API_BASE = 'http://localhost:4000';

export const payrollApi = {
  async getStaffList(): Promise<StaffCompensationDto[]> {
    try {
      const res = await fetch(`${API_BASE}/payroll/staff`, {
        headers: { 'x-user-role': 'ADMIN' },
      });
      return res.ok ? await res.json() : [];
    } catch {
      return [];
    }
  },

  async getAdvancesList(): Promise<SalaryAdvanceDto[]> {
    try {
      const res = await fetch(`${API_BASE}/payroll/advances`, {
        headers: { 'x-user-role': 'ADMIN' },
      });
      if (res.ok) {
        const data = await res.json();
        return data?.items || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async getPayrollSummary(monthYear: string): Promise<PayrollMonthSummaryDto | null> {
    try {
      const res = await fetch(`${API_BASE}/payroll/${monthYear}`, {
        headers: { 'x-user-role': 'ADMIN' },
      });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  },

  async generatePayroll(monthYear: string) {
    const res = await fetch(`${API_BASE}/payroll/generate/${monthYear}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'ADMIN',
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to generate monthly payroll');
    }
    return res.json();
  },

  async createAdvance(payload: {
    userId: string;
    amountLkr: number;
    paymentMethodId: string;
    reason: string;
    overrideCap: boolean;
  }) {
    const res = await fetch(`${API_BASE}/payroll/advances`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'ADMIN',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Advance request rejected');
    }
    return res.json();
  },

  async disbursePayroll(payrollId: string, payload: {
    disbursementMethod: 'CASH' | 'BANK_TRANSFER';
    bankAccountId?: string;
  }) {
    const res = await fetch(`${API_BASE}/payroll/${payrollId}/disburse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'ADMIN',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Disbursement failed');
    }
    return res.json();
  },

  async updateStaffCompensation(userId: string, payload: {
    monthlySalary: number;
    epfNumber?: string | null;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    bankBranch?: string | null;
  }) {
    const res = await fetch(`${API_BASE}/payroll/staff/${userId}/compensation`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'ADMIN',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to update compensation details');
    }
    return res.json();
  },
};
