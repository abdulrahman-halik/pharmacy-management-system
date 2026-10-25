import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useFinanceData } from './hooks/useFinanceData';
import { FinanceHeader } from './components/FinanceHeader';
import { FinanceOverviewTab } from './components/FinanceOverviewTab';
import { FinanceCashbookTab } from './components/FinanceCashbookTab';
import { FinanceBanksTab } from './components/FinanceBanksTab';
import { FinanceDayCloseTab } from './components/FinanceDayCloseTab';
import { ExpenseModal } from './components/ExpenseModal';
import { TransferModal } from './components/TransferModal';
import { ZReportModal } from './components/ZReportModal';
import { ReopenModal } from './components/ReopenModal';
import { financeApi } from './services/financeApi';

export const FinanceWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'cashbook' | 'banks' | 'dayclose'>('overview');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isZReportModalOpen, setIsZReportModalOpen] = useState(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  const finance = useFinanceData();

  const handleRecordExpense = async (form: any) => {
    finance.setIsLoading(true);
    try {
      await financeApi.recordExpense(form);
      finance.setSuccessMsg('Expense recorded and posted to Cashbook successfully');
      setIsExpenseModalOpen(false);
      finance.refreshFinanceData();
    } catch (err: any) {
      finance.setErrorMsg(err.message);
    } finally {
      finance.setIsLoading(false);
    }
  };

  const handleExecuteTransfer = async (form: any) => {
    finance.setIsLoading(true);
    try {
      await financeApi.executeTransfer(form);
      finance.setSuccessMsg('Internal bank transfer executed and balances updated');
      setIsTransferModalOpen(false);
      finance.refreshFinanceData();
    } catch (err: any) {
      finance.setErrorMsg(err.message);
    } finally {
      finance.setIsLoading(false);
    }
  };

  const handleCommitDayClose = async () => {
    finance.setIsLoading(true);
    finance.setErrorMsg(null);
    try {
      await financeApi.commitDayClose({
        closingDate: finance.dayClosePreview.closingDate,
        countedCashLkr: finance.countedCash,
        denominations: finance.denominations,
        varianceReason: finance.isVarianceNonZero ? finance.varianceReason : undefined,
      });
      finance.setSuccessMsg('Register closed successfully. Date is now permanently locked.');
      setIsZReportModalOpen(true);
      finance.refreshFinanceData();
    } catch (err: any) {
      finance.setErrorMsg(err.message);
    } finally {
      finance.setIsLoading(false);
    }
  };

  const handleReopenDayClose = async () => {
    if (reopenReason.trim().length < 5) {
      finance.setErrorMsg('A detailed reason (at least 5 characters) is required for audit logging');
      return;
    }
    finance.setIsLoading(true);
    try {
      await financeApi.reopenDayClose({
        closingDate: finance.dayClosePreview.closingDate,
        reason: reopenReason,
      });
      finance.setSuccessMsg('Register reopened by manager. Audit entry recorded.');
      setIsReopenModalOpen(false);
      setReopenReason('');
      finance.refreshFinanceData();
    } catch (err: any) {
      finance.setErrorMsg(err.message);
    } finally {
      finance.setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <FinanceHeader
        isAlreadyClosed={finance.dayClosePreview.isAlreadyClosed}
        isLoading={finance.isLoading}
        onRefresh={finance.refreshFinanceData}
        onOpenExpense={() => setIsExpenseModalOpen(true)}
        onOpenTransfer={() => setIsTransferModalOpen(true)}
        onGoToDayClose={() => setActiveTab('dayclose')}
      />

      {/* Notifications */}
      {finance.errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-clinical-crimson flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{finance.errorMsg}</span>
          </div>
          <button onClick={() => finance.setErrorMsg(null)} className="text-xs underline font-semibold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}
      {finance.successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-clinical-emerald-dark flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{finance.successMsg}</span>
          </div>
          <button onClick={() => finance.setSuccessMsg(null)} className="text-xs underline font-semibold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-clinical-slate-border gap-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'overview'
              ? 'border-clinical-emerald text-clinical-emerald'
              : 'border-transparent text-clinical-slate-muted hover:text-clinical-slate-heading'
          }`}
        >
          Overview & P&L Statement
        </button>
        <button
          onClick={() => setActiveTab('cashbook')}
          className={`pb-3 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'cashbook'
              ? 'border-clinical-emerald text-clinical-emerald'
              : 'border-transparent text-clinical-slate-muted hover:text-clinical-slate-heading'
          }`}
        >
          Daily Cashbook Ledger
        </button>
        <button
          onClick={() => setActiveTab('banks')}
          className={`pb-3 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'banks'
              ? 'border-clinical-emerald text-clinical-emerald'
              : 'border-transparent text-clinical-slate-muted hover:text-clinical-slate-heading'
          }`}
        >
          Corporate Bank Accounts
        </button>
        <button
          onClick={() => setActiveTab('dayclose')}
          className={`pb-3 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'dayclose'
              ? 'border-clinical-emerald text-clinical-emerald'
              : 'border-transparent text-clinical-slate-muted hover:text-clinical-slate-heading'
          }`}
        >
          End-of-Day Shift Closeout
        </button>
      </div>

      {/* Active Tab Views */}
      {activeTab === 'overview' && (
        <FinanceOverviewTab
          pnlSummary={finance.pnlSummary}
          cashInDrawer={finance.cashInDrawer}
        />
      )}

      {activeTab === 'cashbook' && (
        <FinanceCashbookTab
          entries={finance.cashbookEntries}
          onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
        />
      )}

      {activeTab === 'banks' && (
        <FinanceBanksTab
          bankAccounts={finance.bankAccounts}
          onOpenTransferModal={() => setIsTransferModalOpen(true)}
        />
      )}

      {activeTab === 'dayclose' && (
        <FinanceDayCloseTab
          dayClosePreview={finance.dayClosePreview}
          denominations={finance.denominations}
          coinInput={finance.coinInput}
          setCoinInput={finance.setCoinInput}
          varianceReason={finance.varianceReason}
          setVarianceReason={finance.setVarianceReason}
          countedCash={finance.countedCash}
          variance={finance.variance}
          isVarianceNonZero={finance.isVarianceNonZero}
          canSubmitDayClose={finance.canSubmitDayClose}
          isLoading={finance.isLoading}
          onDenominationChange={finance.handleDenominationChange}
          onCommitDayClose={handleCommitDayClose}
          onOpenZReportModal={() => setIsZReportModalOpen(true)}
          onOpenReopenModal={() => setIsReopenModalOpen(true)}
        />
      )}

      {/* Modals */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        categories={finance.categories}
        isLoading={finance.isLoading}
        onSubmit={handleRecordExpense}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        bankAccounts={finance.bankAccounts}
        isLoading={finance.isLoading}
        onSubmit={handleExecuteTransfer}
      />

      <ZReportModal
        isOpen={isZReportModalOpen}
        onClose={() => setIsZReportModalOpen(false)}
        dayClosePreview={finance.dayClosePreview}
        countedCash={finance.countedCash}
        variance={finance.variance}
        denominations={finance.denominations}
        coinInput={finance.coinInput}
      />

      <ReopenModal
        isOpen={isReopenModalOpen}
        onClose={() => setIsReopenModalOpen(false)}
        reason={reopenReason}
        setReason={setReopenReason}
        isLoading={finance.isLoading}
        onConfirm={handleReopenDayClose}
      />
    </div>
  );
};
