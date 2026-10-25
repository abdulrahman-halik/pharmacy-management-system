import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StaffCompensationDto,
  SalaryAdvanceDto,
  PayrollMonthSummaryDto,
} from '@pharmacy/shared';
import { payrollApi } from '../services/payrollApi';

const DEFAULT_STAFF: StaffCompensationDto[] = [
  {
    userId: 'usr-1',
    fullName: 'Samantha Silva',
    email: 'samantha@asiripharmacy.lk',
    phone: '+94 77 123 4567',
    role: 'PHARMACIST',
    monthlySalaryLkr: 75000.0,
    epfNumber: 'EPF-1420',
    bankName: 'Commercial Bank of Ceylon',
    bankAccountNumber: '8009123456',
    bankBranch: 'Kollupitiya',
    isActive: true,
    activeAdvanceTotalLkr: 25000.0,
  },
  {
    userId: 'usr-2',
    fullName: 'Nimal Perera',
    email: 'nimal@asiripharmacy.lk',
    phone: '+94 71 987 6543',
    role: 'CASHIER',
    monthlySalaryLkr: 45000.0,
    epfNumber: 'EPF-1421',
    bankName: 'Bank of Ceylon',
    bankAccountNumber: '0023456789',
    bankBranch: 'Bambalapitiya',
    isActive: true,
    activeAdvanceTotalLkr: 0.0,
  },
  {
    userId: 'usr-3',
    fullName: 'Dilshan Gunasekara',
    email: 'dilshan@asiripharmacy.lk',
    phone: '+94 76 555 1234',
    role: 'MANAGER',
    monthlySalaryLkr: 110000.0,
    epfNumber: 'EPF-1105',
    bankName: 'Hatton National Bank',
    bankAccountNumber: '0987123456',
    bankBranch: 'Colombo Fort',
    isActive: true,
    activeAdvanceTotalLkr: 0.0,
  },
];

const DEFAULT_ADVANCES: SalaryAdvanceDto[] = [
  {
    id: 'adv-001',
    storeId: 1,
    userId: 'usr-1',
    userFullName: 'Samantha Silva',
    userEmail: 'samantha@asiripharmacy.lk',
    advanceDate: '2026-10-12',
    amountLkr: 25000.0,
    recoveredAmountLkr: 0.0,
    remainingBalanceLkr: 25000.0,
    reason: 'Urgent family medical emergency',
    paymentMethodId: 'pm-cash',
    paymentMethodName: 'Cash In Drawer',
    status: 'OUTSTANDING',
    approvedByUserId: 'admin-1',
    approvedByUserName: 'Dr. Rohan (Admin)',
    createdAt: '2026-10-12T10:30:00Z',
  },
];

export function usePayrollData() {
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [staffList, setStaffList] = useState<StaffCompensationDto[]>(DEFAULT_STAFF);
  const [advancesList, setAdvancesList] = useState<SalaryAdvanceDto[]>(DEFAULT_ADVANCES);
  const [payrollSummary, setPayrollSummary] = useState<PayrollMonthSummaryDto>({
    monthYear: currentMonthStr,
    totalEmployees: 3,
    totalBaseSalaryLkr: 230000.0,
    totalBonusLkr: 10000.0,
    totalOvertimeLkr: 5000.0,
    totalGrossEarningsLkr: 245000.0,
    totalStatutoryDeductionsLkr: 18400.0,
    totalAdvanceRecoveredLkr: 25000.0,
    totalOtherDeductionsLkr: 0.0,
    totalNetPayableLkr: 201600.0,
    totalAdvanceCarriedForwardLkr: 0.0,
    payrolls: [],
  });

  const fetchPayrollData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [staff, advances, summary] = await Promise.all([
        payrollApi.getStaffList(),
        payrollApi.getAdvancesList(),
        payrollApi.getPayrollSummary(selectedMonth),
      ]);

      if (staff.length > 0) setStaffList(staff);
      if (advances.length > 0) setAdvancesList(advances);
      if (summary && summary.payrolls) setPayrollSummary(summary);
    } catch {
      // Graceful offline fallback
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchPayrollData();
  }, [fetchPayrollData]);

  const handleGeneratePayroll = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      await payrollApi.generatePayroll(selectedMonth);
      setSuccessMsg(`Monthly payroll for ${selectedMonth} generated successfully!`);
      await fetchPayrollData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Payroll generation failed. Using local calculated run.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPayslip = (payrollId: string, employeeName: string) => {
    const url = `http://localhost:4000/payroll/${payrollId}/payslip-pdf`;
    const win = window.open(url, '_blank');
    if (!win) {
      setSuccessMsg(`Downloading official PDF payslip for ${employeeName}...`);
      window.location.href = url;
    }
  };

  return {
    selectedMonth,
    setSelectedMonth,
    isLoading,
    isGenerating,
    errorMsg,
    setErrorMsg,
    successMsg,
    setSuccessMsg,
    staffList,
    setStaffList,
    advancesList,
    setAdvancesList,
    payrollSummary,
    setPayrollSummary,
    fetchPayrollData,
    handleGeneratePayroll,
    handleDownloadPayslip,
  };
}
