import {
  AdvanceStatus,
  PayrollStatus,
  DisbursementMethod,
} from './constants.js';

export interface StaffCompensationDto {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  monthlySalaryLkr: number;
  epfNumber?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankBranch?: string | null;
  isActive: boolean;
  activeAdvanceTotalLkr: number;
}

export interface SalaryAdvanceDto {
  id: string;
  storeId: number;
  userId: string;
  userFullName?: string;
  userEmail?: string;
  advanceDate: string;
  amountLkr: number;
  recoveredAmountLkr: number;
  remainingBalanceLkr: number;
  reason: string;
  paymentMethodId: string;
  paymentMethodName?: string;
  status: AdvanceStatus;
  approvedByUserId: string;
  approvedByUserName?: string;
  createdAt: string;
}

export interface PayrollDeductionItemDto {
  id: string;
  payrollId: string;
  salaryAdvanceId?: string | null;
  description: string;
  amountLkr: number;
  createdAt: string;
}

export interface EmployeePayrollDto {
  id: string;
  storeId: number;
  userId: string;
  userFullName?: string;
  userEmail?: string;
  userRole?: string;
  epfNumber?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  monthYear: string; // "YYYY-MM"
  baseSalaryLkr: number;
  bonusAllowanceLkr: number;
  overtimeLkr: number;
  grossEarningsLkr: number;
  statutoryDeductionsLkr: number;
  advanceDeductedLkr: number;
  otherDeductionsLkr: number;
  netPayableLkr: number;
  advanceCarriedForwardLkr: number;
  status: PayrollStatus;
  disbursedAt?: string | null;
  disbursementMethod?: DisbursementMethod | string | null;
  deductionItems: PayrollDeductionItemDto[];
  createdAt: string;
  updatedAt: string;
}

export interface PayrollMonthSummaryDto {
  monthYear: string;
  totalEmployees: number;
  totalBaseSalaryLkr: number;
  totalBonusLkr: number;
  totalOvertimeLkr: number;
  totalGrossEarningsLkr: number;
  totalStatutoryDeductionsLkr: number;
  totalAdvanceRecoveredLkr: number;
  totalOtherDeductionsLkr: number;
  totalNetPayableLkr: number;
  totalAdvanceCarriedForwardLkr: number;
  payrolls: EmployeePayrollDto[];
}

export interface AdvanceRecoveryItem {
  advanceId: string;
  deductedFromThis: number;
  remainingAfter: number;
}

export interface AdvanceSettlementResult {
  totalDeducted: number;
  remainingCarryForward: number;
  settledAdvances: AdvanceRecoveryItem[];
}
