import React from 'react';
import { Card, Badge, Button, Input } from '../../../components/core';
import {
  Users,
  DollarSign,
  Printer,
  ShieldCheck,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';
import { formatLKR, PayrollMonthSummaryDto, EmployeePayrollDto } from '@pharmacy/shared';

interface PayrollMonthTabProps {
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  payrollSummary: PayrollMonthSummaryDto;
  isGenerating: boolean;
  onGeneratePayroll: () => void;
  onOpenDisburseModal: (p: EmployeePayrollDto) => void;
  onDownloadPayslip: (payrollId: string, name: string) => void;
}

export const PayrollMonthTab: React.FC<PayrollMonthTabProps> = ({
  selectedMonth,
  setSelectedMonth,
  payrollSummary,
  isGenerating,
  onGeneratePayroll,
  onOpenDisburseModal,
  onDownloadPayslip,
}) => {
  return (
    <div className="space-y-6">
      {/* Month Control & Actions */}
      <Card className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-clinical-slate-heading uppercase tracking-wider">
            Payroll Month:
          </label>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-40 text-xs font-mono font-bold"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="solid-primary"
            size="sm"
            onClick={onGeneratePayroll}
            isLoading={isGenerating}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Compute & Generate Payroll ({selectedMonth})
          </Button>
        </div>
      </Card>

      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-clinical-emerald">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-clinical-slate-muted uppercase">Gross Salary Pool</span>
            <Users className="w-4 h-4 text-clinical-emerald" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-clinical-slate-heading">
              {formatLKR(payrollSummary.totalGrossEarningsLkr)}
            </span>
          </div>
          <p className="text-[11px] text-clinical-slate-muted mt-1">{payrollSummary.totalEmployees} Registered Staff</p>
        </Card>

        <Card className="border-l-4 border-l-clinical-teal">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-clinical-slate-muted uppercase">Employee EPF (8%)</span>
            <ShieldCheck className="w-4 h-4 text-clinical-teal" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-clinical-teal-text">
              {formatLKR(payrollSummary.totalStatutoryDeductionsLkr)}
            </span>
          </div>
          <p className="text-[11px] text-clinical-slate-muted mt-1">Central Bank Statutory Deduction</p>
        </Card>

        <Card className="border-l-4 border-l-clinical-amber">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-clinical-slate-muted uppercase">Advances Recovered</span>
            <TrendingDown className="w-4 h-4 text-clinical-amber" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-800">
              {formatLKR(payrollSummary.totalAdvanceRecoveredLkr)}
            </span>
          </div>
          <p className="text-[11px] text-clinical-slate-muted mt-1">Carried Forward: {formatLKR(payrollSummary.totalAdvanceCarriedForwardLkr)}</p>
        </Card>

        <Card className="border-l-4 border-l-emerald-600 bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase">Net Pay Disbursable</span>
            <DollarSign className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-800">
              {formatLKR(payrollSummary.totalNetPayableLkr)}
            </span>
          </div>
          <p className="text-[11px] text-emerald-700 mt-1">Final Bank & Cash Disbursement</p>
        </Card>
      </div>

      {/* Staff Payslips Table */}
      <Card>
        <div className="flex items-center justify-between pb-4 border-b border-clinical-slate-border">
          <div>
            <h3 className="font-bold text-sm text-clinical-slate-heading">Staff Monthly Payroll Summary</h3>
            <p className="text-xs text-clinical-slate-muted">Calculated take-home earnings with statutory EPF (8%) and advance recoveries</p>
          </div>
          <Badge variant="rx" size="sm">{payrollSummary.payrolls.length} Records</Badge>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-clinical-slate-muted font-semibold uppercase border-y border-clinical-slate-border">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Role & EPF</th>
                <th className="py-3 px-4 text-right">Base Salary</th>
                <th className="py-3 px-4 text-right">Bonus / OT</th>
                <th className="py-3 px-4 text-right">EPF (8%)</th>
                <th className="py-3 px-4 text-right">Advance Rec.</th>
                <th className="py-3 px-4 text-right font-black text-clinical-emerald-text">Net Pay</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payrollSummary.payrolls.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-bold text-clinical-slate-heading">{p.userFullName}</p>
                    <p className="text-[11px] text-clinical-slate-muted">
                      {p.bankName ? `${p.bankName} (...${p.bankAccountNumber?.slice(-4)})` : 'Cash Payout'}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-clinical-slate-heading">{p.userRole}</span>
                    <p className="text-[11px] text-clinical-slate-muted font-mono">{p.epfNumber || 'No EPF'}</p>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium">
                    {formatLKR(p.baseSalaryLkr)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-clinical-slate-muted">
                    {formatLKR(Number(p.bonusAllowanceLkr) + Number(p.overtimeLkr))}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-clinical-teal-text">
                    {formatLKR(p.statutoryDeductionsLkr)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-clinical-amber-text font-semibold">
                    {formatLKR(p.advanceDeductedLkr)}
                    {Number(p.advanceCarriedForwardLkr) > 0 && (
                      <span className="block text-[10px] text-clinical-crimson">
                        Carryover: {formatLKR(p.advanceCarriedForwardLkr)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-clinical-emerald-dark text-sm bg-clinical-emerald-light/20">
                    {formatLKR(p.netPayableLkr)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {p.status === 'DISBURSED' ? (
                      <Badge variant="in-stock" size="sm">DISBURSED</Badge>
                    ) : (
                      <Badge variant="near-expiry" size="sm">DRAFT</Badge>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      {p.status !== 'DISBURSED' ? (
                        <Button
                          size="sm"
                          variant="solid-primary"
                          onClick={() => onOpenDisburseModal(p)}
                          className="text-xs py-1 px-2.5"
                        >
                          Disburse
                        </Button>
                      ) : (
                        <span className="text-[11px] text-clinical-slate-muted font-medium">Disbursed</span>
                      )}
                      <Button
                        size="sm"
                        variant="solid-neutral"
                        onClick={() => onDownloadPayslip(p.id, p.userFullName || 'Staff')}
                        className="text-xs py-1 px-2.5 flex items-center gap-1"
                        title="Download Branded PDF Payslip"
                      >
                        <Printer className="w-3.5 h-3.5 text-clinical-teal" /> PDF
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
