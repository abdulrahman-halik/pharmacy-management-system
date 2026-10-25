import React, { useState } from 'react';
import { Badge, Button } from '../../components/core';
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { usePayrollData } from './hooks/usePayrollData';
import { PayrollMonthTab } from './components/PayrollMonthTab';
import { PayrollAdvancesTab } from './components/PayrollAdvancesTab';
import { PayrollStaffTab } from './components/PayrollStaffTab';
import { AdvanceModal } from './components/AdvanceModal';
import { DisburseModal } from './components/DisburseModal';
import { CompensationModal } from './components/CompensationModal';
import { payrollApi } from './services/payrollApi';
import { EmployeePayrollDto, StaffCompensationDto } from '@pharmacy/shared';

export const PayrollWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'payroll' | 'advances' | 'staff'>('payroll');
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [disburseTarget, setDisburseTarget] = useState<EmployeePayrollDto | null>(null);
  const [isCompensationModalOpen, setIsCompensationModalOpen] = useState(false);
  const [compensationTarget, setCompensationTarget] = useState<StaffCompensationDto | null>(null);

  const payroll = usePayrollData();

  const handleCreateAdvance = async (form: any) => {
    payroll.setErrorMsg(null);
    try {
      await payrollApi.createAdvance(form);
      payroll.setSuccessMsg('Salary advance successfully issued and posted to cashbook!');
      setIsAdvanceModalOpen(false);
      await payroll.fetchPayrollData();
    } catch (err: any) {
      payroll.setErrorMsg(err.message || 'Failed to issue advance');
    }
  };

  const handleDisburseConfirm = async (method: 'CASH' | 'BANK_TRANSFER') => {
    if (!disburseTarget) return;
    payroll.setErrorMsg(null);
    try {
      await payrollApi.disbursePayroll(disburseTarget.id, {
        disbursementMethod: method,
      });
      payroll.setSuccessMsg(`Salary disbursed for ${disburseTarget.userFullName}!`);
      setIsDisburseModalOpen(false);
      setDisburseTarget(null);
      await payroll.fetchPayrollData();
    } catch (err: any) {
      payroll.setErrorMsg(err.message || 'Disbursement could not be completed');
    }
  };

  const handleCompensationSubmit = async (form: any) => {
    payroll.setErrorMsg(null);
    try {
      await payrollApi.updateStaffCompensation(form.userId, {
        monthlySalary: form.monthlySalary,
        epfNumber: form.epfNumber,
        bankName: form.bankName,
        bankAccountNumber: form.bankAccountNumber,
        bankBranch: form.bankBranch,
      });
      payroll.setSuccessMsg(`Updated compensation for ${form.fullName}`);
      setIsCompensationModalOpen(false);
      setCompensationTarget(null);
      await payroll.fetchPayrollData();
    } catch (err: any) {
      payroll.setErrorMsg(err.message || 'Could not update details');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-clinical-slate-border">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-clinical-slate-heading tracking-tight">
              Human Resources & Payroll Engine
            </h2>
            <Badge variant="rx" className="flex items-center gap-1 font-semibold">
              <Users className="w-3.5 h-3.5" /> STATUTORY EPF/ETF (15%+8%)
            </Badge>
          </div>
          <p className="text-sm text-clinical-slate-muted mt-1">
            Automated Sri Lanka Central Bank Statutory Deductions, Advance Tracking, and Direct Banking Exports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="solid-neutral"
            size="sm"
            onClick={payroll.fetchPayrollData}
            isLoading={payroll.isLoading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button
            variant="solid-neutral"
            size="sm"
            onClick={() => setIsAdvanceModalOpen(true)}
            className="flex items-center gap-1.5 text-amber-800 border-amber-200"
          >
            <PlusCircle className="w-4 h-4" /> Issue Advance
          </Button>
          <Button
            variant="solid-primary"
            size="sm"
            onClick={payroll.handleGeneratePayroll}
            isLoading={payroll.isGenerating}
            className="flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" /> 1-Click Payroll Run
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {payroll.errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-clinical-crimson flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{payroll.errorMsg}</span>
          </div>
          <button onClick={() => payroll.setErrorMsg(null)} className="text-xs underline font-semibold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}
      {payroll.successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-clinical-emerald-dark flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{payroll.successMsg}</span>
          </div>
          <button onClick={() => payroll.setSuccessMsg(null)} className="text-xs underline font-semibold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-clinical-slate-border gap-6">
        <button
          onClick={() => setActiveTab('payroll')}
          className={`pb-3 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'payroll'
              ? 'border-clinical-emerald text-clinical-emerald'
              : 'border-transparent text-clinical-slate-muted hover:text-clinical-slate-heading'
          }`}
        >
          Monthly Payroll Run
        </button>
        <button
          onClick={() => setActiveTab('advances')}
          className={`pb-3 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'advances'
              ? 'border-clinical-emerald text-clinical-emerald'
              : 'border-transparent text-clinical-slate-muted hover:text-clinical-slate-heading'
          }`}
        >
          Salary Advances & Loans
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`pb-3 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'staff'
              ? 'border-clinical-emerald text-clinical-emerald'
              : 'border-transparent text-clinical-slate-muted hover:text-clinical-slate-heading'
          }`}
        >
          Staff Compensation Roster
        </button>
      </div>

      {/* Active Tab Views */}
      {activeTab === 'payroll' && (
        <PayrollMonthTab
          selectedMonth={payroll.selectedMonth}
          setSelectedMonth={payroll.setSelectedMonth}
          payrollSummary={payroll.payrollSummary}
          isGenerating={payroll.isGenerating}
          onGeneratePayroll={payroll.handleGeneratePayroll}
          onOpenDisburseModal={(p) => {
            setDisburseTarget(p);
            setIsDisburseModalOpen(true);
          }}
          onDownloadPayslip={payroll.handleDownloadPayslip}
        />
      )}

      {activeTab === 'advances' && (
        <PayrollAdvancesTab
          advancesList={payroll.advancesList}
          onOpenAdvanceModal={() => setIsAdvanceModalOpen(true)}
        />
      )}

      {activeTab === 'staff' && (
        <PayrollStaffTab
          staffList={payroll.staffList}
          onOpenCompensationModal={(staff) => {
            setCompensationTarget(staff);
            setIsCompensationModalOpen(true);
          }}
        />
      )}

      {/* Modals */}
      <AdvanceModal
        isOpen={isAdvanceModalOpen}
        onClose={() => setIsAdvanceModalOpen(false)}
        staffList={payroll.staffList}
        onSubmit={handleCreateAdvance}
      />

      <DisburseModal
        isOpen={isDisburseModalOpen}
        onClose={() => {
          setIsDisburseModalOpen(false);
          setDisburseTarget(null);
        }}
        target={disburseTarget}
        onConfirm={handleDisburseConfirm}
      />

      <CompensationModal
        isOpen={isCompensationModalOpen}
        onClose={() => {
          setIsCompensationModalOpen(false);
          setCompensationTarget(null);
        }}
        staff={compensationTarget}
        onSubmit={handleCompensationSubmit}
      />
    </div>
  );
};
