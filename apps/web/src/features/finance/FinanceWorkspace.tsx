import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Badge,
  Button,
  Input,
  Select,
  Modal,
} from '../../components/core';
import {
  DollarSign,
  Wallet,
  Building2,
  TrendingUp,
  Calendar,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Printer,
  ArrowDownRight,
  ArrowUpRight,
  Receipt,
  PlusCircle,
  ArrowRightLeft,
  FileText,
  RefreshCw,
} from 'lucide-react';
import {
  formatLKR,
  calculateDenominationsTotal,
  ProfitAndLossSummaryDto,
  DayClosePreviewDto,
  BankAccountDto,
  CashLedgerEntryDto,
  ExpenseCategoryDto,
} from '@pharmacy/shared';

const API_BASE = 'http://localhost:4000';

export const FinanceWorkspace: React.FC = () => {
  // Navigation sub-tab
  const [activeTab, setActiveTab] = useState<'overview' | 'cashbook' | 'banks' | 'dayclose'>('overview');

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Financial KPI & P&L State
  const [pnlSummary, setPnlSummary] = useState<ProfitAndLossSummaryDto>({
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
  });

  const [cashInDrawer, setCashInDrawer] = useState<number>(34850.0);

  // Bank Accounts State
  const [bankAccounts, setBankAccounts] = useState<BankAccountDto[]>([
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
  ]);

  // Cashbook Ledger State
  const [cashbookEntries, setCashbookEntries] = useState<CashLedgerEntryDto[]>([
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
  ]);

  const [categories, setCategories] = useState<ExpenseCategoryDto[]>([
    { id: 'ec-rent', code: 'RENT', name: 'Store Premises Rent', isActive: true },
    { id: 'ec-electricity', code: 'ELECTRICITY', name: 'CEB Electricity', isActive: true },
    { id: 'ec-delivery', code: 'DELIVERY', name: 'Courier & Delivery', isActive: true },
    { id: 'ec-packaging', code: 'PACKAGING', name: 'Packaging Materials', isActive: true },
    { id: 'ec-staff-meals', code: 'STAFF_MEALS', name: 'Staff Tea & Refreshments', isActive: true },
  ]);

  // Day-Close State
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

  // Denomination Counter State
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

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isZReportModalOpen, setIsZReportModalOpen] = useState(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  // Form State: New Expense
  const [expenseForm, setExpenseForm] = useState({
    expenseDate: new Date().toISOString().split('T')[0],
    categoryId: 'ec-staff-meals',
    amountLkr: 500,
    paymentMethodId: 'pm-cash',
    description: '',
  });

  // Form State: Transfer
  const [transferForm, setTransferForm] = useState({
    fromBankAccountId: 'ba-comb-main',
    toBankAccountId: 'ba-hnb-reserve',
    amountLkr: 5000,
    feeLkr: 30,
    description: 'Internal transfer to reserve account',
  });

  // Computed counted cash total
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

  // Fetch Live Data from Backend API
  const refreshFinanceData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = `${today}T00:00:00.000Z`;
      const endOfDay = `${today}T23:59:59.999Z`;

      // 1. P&L
      const pnlRes = await fetch(
        `${API_BASE}/finance/profit-loss?startDate=${startOfDay}&endDate=${endOfDay}`,
      );
      if (pnlRes.ok) {
        const pnlData = await pnlRes.json();
        setPnlSummary(pnlData);
      }

      // 2. Cash In Drawer
      const cidRes = await fetch(`${API_BASE}/finance/cashbook/cash-in-drawer`);
      if (cidRes.ok) {
        const cidData = await cidRes.json();
        setCashInDrawer(cidData.cashInDrawerLkr);
      }

      // 3. Bank Accounts
      const banksRes = await fetch(`${API_BASE}/finance/banks`);
      if (banksRes.ok) {
        const banksData = await banksRes.json();
        if (banksData.length > 0) setBankAccounts(banksData);
      }

      // 4. Cashbook
      const cbRes = await fetch(`${API_BASE}/finance/cashbook?limit=50`);
      if (cbRes.ok) {
        const cbData = await cbRes.json();
        if (cbData.entries) setCashbookEntries(cbData.entries);
      }

      // 5. Day-Close Preview
      const dcRes = await fetch(`${API_BASE}/finance/day-close/preview?date=${today}`);
      if (dcRes.ok) {
        const dcData = await dcRes.json();
        setDayClosePreview(dcData);
      }

      // 6. Expense Categories
      const catRes = await fetch(`${API_BASE}/finance/expenses/categories`);
      if (catRes.ok) {
        const catData = await catRes.json();
        if (catData.length > 0) setCategories(catData);
      }
    } catch {
      // Offline fallback state operates gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshFinanceData();
  }, []);

  const handleDenominationChange = (denom: string, val: number) => {
    setDenominations((prev) => ({
      ...prev,
      [denom]: Math.max(0, val),
    }));
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/finance/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to record expense');
      }

      setSuccessMsg('Expense recorded and posted to Cashbook successfully');
      setIsExpenseModalOpen(false);
      setExpenseForm((prev) => ({ ...prev, description: '', amountLkr: 500 }));
      refreshFinanceData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/finance/banks/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to record internal transfer');
      }

      setSuccessMsg('Internal bank transfer executed and balances updated');
      setIsTransferModalOpen(false);
      refreshFinanceData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommitDayClose = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const payload = {
        closingDate: dayClosePreview.closingDate,
        countedCashLkr: countedCash,
        denominations,
        varianceReason: isVarianceNonZero ? varianceReason : undefined,
      };

      const res = await fetch(`${API_BASE}/finance/day-close/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to commit Day-Close');
      }

      setSuccessMsg('Register closed successfully. Date is now permanently locked.');
      setIsZReportModalOpen(true);
      refreshFinanceData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReopenDayClose = async () => {
    if (reopenReason.trim().length < 5) {
      setErrorMsg('A detailed reason (at least 5 characters) is required for audit logging');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/finance/day-close/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closingDate: dayClosePreview.closingDate,
          reason: reopenReason,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to reopen register');
      }

      setSuccessMsg('Register reopened by manager. Audit entry recorded.');
      setIsReopenModalOpen(false);
      setReopenReason('');
      refreshFinanceData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-clinical-slate-border">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-clinical-slate-heading tracking-tight">
              Financial Management & Day-Close
            </h2>
            {dayClosePreview.isAlreadyClosed ? (
              <Badge variant="controlled-ii" className="flex items-center gap-1 font-semibold">
                <Lock className="w-3.5 h-3.5" /> DAY LOCKED
              </Badge>
            ) : (
              <Badge variant="otc" className="flex items-center gap-1 font-semibold">
                <Unlock className="w-3.5 h-3.5" /> REGISTER OPEN
              </Badge>
            )}
          </div>
          <p className="text-sm text-clinical-slate-muted mt-1">
            Unified Double-Entry Cashbook, Batch-Allocated COGS, and LKAS / IFRS Day Reconciliation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="solid-neutral"
            size="sm"
            onClick={refreshFinanceData}
            isLoading={isLoading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button
            variant="solid-neutral"
            size="sm"
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex items-center gap-1.5 text-clinical-crimson border-red-200"
          >
            <PlusCircle className="w-4 h-4" /> Record Expense
          </Button>
          <Button
            variant="solid-neutral"
            size="sm"
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-1.5 text-clinical-teal border-teal-200"
          >
            <ArrowRightLeft className="w-4 h-4" /> Bank Transfer
          </Button>
          <Button
            variant="solid-primary"
            size="sm"
            onClick={() => setActiveTab('dayclose')}
            className="flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4" /> Day-Close Wizard
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-clinical-crimson flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-xs underline font-semibold">Dismiss</button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-clinical-emerald-dark flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-xs underline font-semibold">Dismiss</button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-clinical-slate-border gap-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-clinical-emerald text-clinical-emerald'
              : 'border-transparent text-clinical-slate-muted hover:text-clinical-slate-heading'
          }`}
        >
          P&L & Financial Metrics
        </button>
        <button
          onClick={() => setActiveTab('cashbook')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'cashbook'
              ? 'border-clinical-emerald text-clinical-emerald'
              : 'border-transparent text-clinical-slate-muted hover:text-clinical-slate-heading'
          }`}
        >
          Unified Cash Ledger ({cashbookEntries.length})
        </button>
        <button
          onClick={() => setActiveTab('banks')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'banks'
              ? 'border-clinical-emerald text-clinical-emerald'
              : 'border-transparent text-clinical-slate-muted hover:text-clinical-slate-heading'
          }`}
        >
          Commercial Bank Accounts ({bankAccounts.length})
        </button>
        <button
          onClick={() => setActiveTab('dayclose')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'dayclose'
              ? 'border-clinical-emerald text-clinical-emerald'
              : 'border-transparent text-clinical-slate-muted hover:text-clinical-slate-heading'
          }`}
        >
          4-Step Day-Close Reconciliation
          {dayClosePreview.isAlreadyClosed && <Lock className="w-3.5 h-3.5 text-clinical-crimson" />}
        </button>
      </div>

      {/* Tab 1: P&L & KPIs */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top 4 KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 border-l-4 border-l-clinical-emerald">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-clinical-slate-muted tracking-wider">
                  Today's Net Revenue
                </span>
                <span className="p-2 rounded-lg bg-emerald-50 text-clinical-emerald">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-clinical-slate-heading mt-2">
                {formatLKR(pnlSummary.netRevenueLkr)}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-clinical-slate-muted">
                <span>Gross: {formatLKR(pnlSummary.grossSalesLkr)}</span>
                <span>•</span>
                <span>Discounts: {formatLKR(pnlSummary.discountsLkr)}</span>
              </div>
            </Card>

            <Card className="p-5 border-l-4 border-l-clinical-teal">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-clinical-slate-muted tracking-wider">
                  Batch-Allocated COGS
                </span>
                <span className="p-2 rounded-lg bg-teal-50 text-clinical-teal">
                  <Receipt className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-clinical-slate-heading mt-2">
                {formatLKR(pnlSummary.cogsLkr)}
              </div>
              <div className="mt-2 text-xs text-clinical-slate-muted">
                Exact Cost of Goods from FEFO allocations
              </div>
            </Card>

            <Card className="p-5 border-l-4 border-l-teal-600">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-clinical-slate-muted tracking-wider">
                  Net Profit (Real-Time)
                </span>
                <span className="p-2 rounded-lg bg-teal-50 text-teal-700">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-clinical-emerald mt-2">
                {formatLKR(pnlSummary.netProfitLkr)}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-clinical-slate-muted">
                <span>Gross Margin: {pnlSummary.grossMarginPercentage}%</span>
              </div>
            </Card>

            <Card className="p-5 border-l-4 border-l-clinical-amber">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-clinical-slate-muted tracking-wider">
                  Counter Cash In Drawer
                </span>
                <span className="p-2 rounded-lg bg-amber-50 text-clinical-amber">
                  <Wallet className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-clinical-slate-heading mt-2">
                {formatLKR(cashInDrawer)}
              </div>
              <div className="mt-2 text-xs text-clinical-slate-muted">
                Current physical cash drawer balance
              </div>
            </Card>
          </div>

          {/* Profit & Loss Waterfall Breakdown */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-clinical-slate-border">
              <div>
                <h3 className="text-lg font-bold text-clinical-slate-heading flex items-center gap-2">
                  <FileText className="w-5 h-5 text-clinical-emerald" /> Exact Profit & Loss Waterfall (LKR)
                </h3>
                <p className="text-xs text-clinical-slate-muted mt-0.5">
                  Accounting compliance according to Sri Lankan LKAS standards based on verified transaction data
                </p>
              </div>
              <Badge variant="neutral" className="font-mono text-xs">
                Period: Today
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-clinical-slate-border text-sm">
                <span className="font-medium text-clinical-slate-body">1. Gross Sales Revenue</span>
                <span className="font-mono font-semibold text-clinical-slate-heading">
                  {formatLKR(pnlSummary.grossSalesLkr)}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-clinical-slate-border text-sm text-clinical-slate-muted">
                <span className="flex items-center gap-2 pl-4">Less: Bill Level Discounts</span>
                <span className="font-mono text-clinical-crimson">- {formatLKR(pnlSummary.discountsLkr)}</span>
              </div>

              <div className="flex items-center justify-between py-2 bg-slate-50 px-3 rounded font-medium text-sm">
                <span className="text-clinical-slate-heading">Net Sales Revenue</span>
                <span className="font-mono font-bold text-clinical-slate-heading">
                  {formatLKR(pnlSummary.netRevenueLkr)}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-clinical-slate-border text-sm text-clinical-slate-muted">
                <span className="flex items-center gap-2 pl-4">
                  Less: Cost of Goods Sold (Exact FEFO Batch Costs)
                </span>
                <span className="font-mono text-clinical-crimson">- {formatLKR(pnlSummary.cogsLkr)}</span>
              </div>

              <div className="flex items-center justify-between py-2 bg-emerald-50 px-3 rounded font-semibold text-sm">
                <span className="text-clinical-emerald-dark">
                  Gross Profit (Margin: {pnlSummary.grossMarginPercentage}%)
                </span>
                <span className="font-mono text-clinical-emerald">
                  {formatLKR(pnlSummary.grossProfitLkr)}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-clinical-slate-border text-sm text-clinical-slate-muted">
                <span className="flex items-center gap-2 pl-4">Less: Store Operating Expenses</span>
                <span className="font-mono text-clinical-crimson">- {formatLKR(pnlSummary.operatingExpensesLkr)}</span>
              </div>

              <div className="flex items-center justify-between py-3 bg-emerald-100 px-4 rounded-lg font-bold text-base">
                <span className="text-clinical-emerald-dark">Net Operating Profit</span>
                <span className="font-mono text-clinical-emerald">
                  {formatLKR(pnlSummary.netProfitLkr)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Unified Cash Ledger */}
      {activeTab === 'cashbook' && (
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-clinical-slate-heading">
                Unified Cashbook Ledger
              </h3>
              <p className="text-xs text-clinical-slate-muted mt-0.5">
                Single immutable double-entry ledger connecting POS sales, supplier payouts, expenses, and banking
              </p>
            </div>
            <Button
              variant="solid-primary"
              size="sm"
              onClick={() => setIsExpenseModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Add Expense
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-clinical-slate-border text-xs font-semibold text-clinical-slate-muted uppercase tracking-wider bg-slate-50">
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Direction</th>
                  <th className="py-3 px-3">Source Type</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3">Amount (LKR)</th>
                  <th className="py-3 px-3">Cashier / User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {cashbookEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 text-clinical-slate-body">
                      {new Date(entry.entryDate).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      {entry.direction === 'IN' ? (
                        <Badge variant="otc" className="flex items-center gap-1 w-fit">
                          <ArrowDownRight className="w-3.5 h-3.5" /> IN
                        </Badge>
                      ) : (
                        <Badge variant="controlled-ii" className="flex items-center gap-1 w-fit">
                          <ArrowUpRight className="w-3.5 h-3.5" /> OUT
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-3 font-sans font-medium text-clinical-slate-heading">
                      {entry.sourceType}
                    </td>
                    <td className="py-3 px-3 font-sans text-clinical-slate-body">
                      {entry.description}
                    </td>
                    <td className="py-3 px-3 font-bold">
                      <span className={entry.direction === 'IN' ? 'text-clinical-emerald' : 'text-clinical-crimson'}>
                        {entry.direction === 'IN' ? '+' : '-'} {formatLKR(entry.amountLkr)}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans text-clinical-slate-muted">
                      {entry.userId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: Commercial Bank Accounts */}
      {activeTab === 'banks' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-clinical-slate-heading">
                Commercial Bank Accounts
              </h3>
              <p className="text-xs text-clinical-slate-muted mt-0.5">
                Multi-bank settlement accounts with masked numbering and double-entry reconciliation
              </p>
            </div>
            <Button
              variant="solid-primary"
              size="sm"
              onClick={() => setIsTransferModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <ArrowRightLeft className="w-4 h-4" /> Internal Bank Transfer
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bankAccounts.map((acc) => (
              <Card key={acc.id} className="p-6 relative overflow-hidden border-t-4 border-t-clinical-teal">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="p-3 bg-teal-50 text-clinical-teal rounded-lg">
                      <Building2 className="w-6 h-6" />
                    </span>
                    <div>
                      <h4 className="font-bold text-clinical-slate-heading text-base">
                        {acc.bankName}
                      </h4>
                      <p className="text-xs text-clinical-slate-muted">{acc.branchName}</p>
                    </div>
                  </div>
                  <Badge variant={acc.isActive ? 'otc' : 'neutral'}>
                    {acc.isActive ? 'Active' : 'Disabled'}
                  </Badge>
                </div>

                <div className="mt-6 pt-4 border-t border-clinical-slate-border space-y-2">
                  <div className="flex items-center justify-between text-xs text-clinical-slate-muted">
                    <span>Account Number</span>
                    <span className="font-mono font-medium text-clinical-slate-heading">
                      {acc.maskedAccountNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-clinical-slate-muted">
                    <span>Account Name</span>
                    <span className="font-medium text-clinical-slate-heading">{acc.accountName}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-semibold text-clinical-slate-body">
                      Current Live Balance
                    </span>
                    <span className="text-xl font-bold font-mono text-clinical-emerald">
                      {formatLKR(acc.currentBalanceLkr)}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: 4-Step Day-Close Reconciliation Wizard */}
      {activeTab === 'dayclose' && (
        <div className="space-y-6">
          {/* Header Card with Lock Status */}
          <Card className="p-6 bg-slate-50 border border-clinical-slate-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-clinical-slate-heading">
                    Day-Close Reconciliation Wizard
                  </h3>
                  {dayClosePreview.isAlreadyClosed ? (
                    <Badge variant="controlled-ii" className="flex items-center gap-1 font-semibold">
                      <Lock className="w-3.5 h-3.5" /> LOCKED
                    </Badge>
                  ) : (
                    <Badge variant="otc" className="flex items-center gap-1 font-semibold">
                      <Unlock className="w-3.5 h-3.5" /> READY FOR CLOSE
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-clinical-slate-muted mt-1">
                  Reconciles physical counter cash denominations against system theoretical ledger balances.
                  Locking permanently seals sales invoices and register entries for {dayClosePreview.closingDate}.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {dayClosePreview.isAlreadyClosed ? (
                  <>
                    <Button
                      variant="solid-neutral"
                      size="sm"
                      onClick={() => setIsZReportModalOpen(true)}
                      className="flex items-center gap-1.5"
                    >
                      <Printer className="w-4 h-4" /> View Z-Report
                    </Button>
                    <Button
                      variant="solid-neutral"
                      size="sm"
                      onClick={() => setIsReopenModalOpen(true)}
                      className="flex items-center gap-1.5 text-clinical-crimson border-red-200"
                    >
                      <Unlock className="w-4 h-4" /> Manager Unlock
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="solid-primary"
                    size="sm"
                    disabled={!canSubmitDayClose}
                    isLoading={isLoading}
                    onClick={handleCommitDayClose}
                    className="flex items-center gap-1.5"
                  >
                    <Lock className="w-4 h-4" /> Finalize & Lock Register
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Step 1 & 3: Theoretical Calculation & Variance Summary (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Step 1: System Theoretical Expected Cash */}
              <Card className="p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-clinical-slate-muted mb-4 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-clinical-slate-heading flex items-center justify-center text-xs">1</span>
                  System Theoretical Expected Cash
                </h4>

                <div className="space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-clinical-slate-border">
                    <span className="font-sans text-clinical-slate-muted">Opening Drawer Cash</span>
                    <span className="font-semibold">{formatLKR(dayClosePreview.openingCashLkr)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-clinical-slate-border text-clinical-emerald">
                    <span className="font-sans text-clinical-slate-muted">+ Cash Counter Sales</span>
                    <span>+{formatLKR(dayClosePreview.cashSalesLkr)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-clinical-slate-border text-clinical-emerald">
                    <span className="font-sans text-clinical-slate-muted">+ Customer Credit Collections</span>
                    <span>+{formatLKR(dayClosePreview.cashCollectionsLkr)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-clinical-slate-border text-clinical-crimson">
                    <span className="font-sans text-clinical-slate-muted">- Cash Counter Refunds</span>
                    <span>-{formatLKR(dayClosePreview.cashRefundsLkr)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-clinical-slate-border text-clinical-crimson">
                    <span className="font-sans text-clinical-slate-muted">- Cash Operational Expenses</span>
                    <span>-{formatLKR(dayClosePreview.cashExpensesLkr)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 text-sm font-bold text-clinical-slate-heading">
                    <span className="font-sans">Expected Theoretical Total</span>
                    <span>{formatLKR(dayClosePreview.expectedCashLkr)}</span>
                  </div>
                </div>
              </Card>

              {/* Step 3: Real-Time Variance Gate */}
              <Card className={`p-5 border-2 ${
                isVarianceNonZero
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-emerald-400 bg-emerald-50'
              }`}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-clinical-slate-muted mb-4 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-clinical-slate-heading flex items-center justify-center text-xs">3</span>
                  Reconciliation Variance Gate
                </h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-clinical-slate-body">Total Counted Physical Cash:</span>
                    <span className="font-mono font-bold text-base text-clinical-slate-heading">
                      {formatLKR(countedCash)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-clinical-slate-body">System Expected Cash:</span>
                    <span className="font-mono text-clinical-slate-muted">
                      {formatLKR(dayClosePreview.expectedCashLkr)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-clinical-slate-border flex items-center justify-between">
                    <span className="font-semibold text-sm">Cash Variance:</span>
                    <div className="text-right">
                      <span className={`text-lg font-mono font-bold ${
                        variance === 0
                          ? 'text-clinical-emerald'
                          : variance > 0
                          ? 'text-clinical-teal'
                          : 'text-clinical-crimson'
                      }`}>
                        {variance > 0 ? `+${formatLKR(variance)}` : formatLKR(variance)}
                      </span>
                      <div className="text-[10px] text-clinical-slate-muted">
                        {variance === 0
                          ? 'Balanced (Zero Discrepancy)'
                          : variance > 0
                          ? 'Cash Surplus in Drawer'
                          : 'Cash Shortage in Drawer'}
                      </div>
                    </div>
                  </div>

                  {isVarianceNonZero && (
                    <div className="mt-4 pt-4 border-t border-amber-200 space-y-2">
                      <label className="block text-xs font-bold text-clinical-amber">
                        Mandatory Variance Reason Note (Required to submit) *
                      </label>
                      <textarea
                        value={varianceReason}
                        onChange={(e) => setVarianceReason(e.target.value)}
                        placeholder="Explain reason for cash surplus/shortage (e.g. Uncollected change, coin rounding)..."
                        className="w-full text-xs p-2.5 rounded border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-clinical-amber"
                        rows={2}
                      />
                      {varianceReason.trim().length < 5 && (
                        <p className="text-[11px] text-clinical-crimson font-medium">
                          Explanation must be at least 5 characters long.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Step 2: Physical Cash Denomination Counter (7 Cols) */}
            <div className="lg:col-span-7">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-clinical-slate-muted flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-clinical-slate-heading flex items-center justify-center text-xs">2</span>
                    Sri Lankan Cash Denomination Counter
                  </h4>
                  <span className="text-xs text-clinical-slate-muted font-mono">Counted: {formatLKR(countedCash)}</span>
                </div>

                <div className="space-y-3">
                  {[5000, 1000, 500, 100, 50, 20, 10].map((denom) => {
                    const count = denominations[String(denom)] || 0;
                    const subtotal = denom * count;
                    return (
                      <div
                        key={denom}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-clinical-slate-border"
                      >
                        <div className="flex items-center gap-3 w-32">
                          <span className="font-bold text-sm text-clinical-slate-heading font-mono">
                            Rs. {denom}
                          </span>
                          <span className="text-[10px] text-clinical-slate-muted">Note</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDenominationChange(String(denom), count - 1)}
                            className="w-8 h-8 rounded border border-clinical-slate-border flex items-center justify-center hover:bg-slate-200 font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={count}
                            onChange={(e) =>
                              handleDenominationChange(String(denom), parseInt(e.target.value, 10) || 0)
                            }
                            className="w-20 text-center font-mono font-bold text-sm p-1 border border-clinical-slate-border rounded bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleDenominationChange(String(denom), count + 1)}
                            className="w-8 h-8 rounded border border-clinical-slate-border flex items-center justify-center hover:bg-slate-200 font-bold"
                          >
                            +
                          </button>
                        </div>

                        <div className="w-28 text-right font-mono font-bold text-sm text-clinical-slate-heading">
                          {formatLKR(subtotal)}
                        </div>
                      </div>
                    );
                  })}

                  {/* Coin Subtotal Input */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-clinical-slate-border">
                    <div className="flex items-center gap-3 w-32">
                      <span className="font-bold text-sm text-clinical-slate-heading font-mono">
                        Coins
                      </span>
                      <span className="text-[10px] text-clinical-slate-muted">Rs. 1/2/5</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="LKR coins"
                        value={coinInput}
                        onChange={(e) => setCoinInput(parseFloat(e.target.value) || 0)}
                        className="w-36 text-center font-mono font-bold text-sm p-1.5 border border-clinical-slate-border rounded bg-white"
                      />
                    </div>

                    <div className="w-28 text-right font-mono font-bold text-sm text-clinical-slate-heading">
                      {formatLKR(coinInput || 0)}
                    </div>
                  </div>

                  {/* Denomination Total Bar */}
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between mt-4">
                    <span className="font-bold text-clinical-emerald-dark">
                      Total Counted Physical Cash:
                    </span>
                    <span className="text-xl font-bold font-mono text-clinical-emerald">
                      {formatLKR(countedCash)}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Record Operational Expense */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Record Operational Store Expense"
      >
        <form onSubmit={handleRecordExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-clinical-slate-body mb-1">Expense Date</label>
            <Input
              type="date"
              value={expenseForm.expenseDate}
              onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
              required
            />
          </div>

          <div>
            <Select
              label="Expense Category"
              value={expenseForm.categoryId}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              onChange={(e) => setExpenseForm({ ...expenseForm, categoryId: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-clinical-slate-body mb-1">Amount (LKR)</label>
            <Input
              type="number"
              min="1"
              step="0.01"
              value={expenseForm.amountLkr}
              onChange={(e) => setExpenseForm({ ...expenseForm, amountLkr: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div>
            <Select
              label="Payment Method"
              value={expenseForm.paymentMethodId}
              options={[
                { value: 'pm-cash', label: 'Cash Counter Drawer' },
                { value: 'pm-transfer', label: 'Commercial Bank Transfer' },
              ]}
              onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethodId: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-clinical-slate-body mb-1">Description / Memo</label>
            <Input
              type="text"
              placeholder="e.g. Afternoon tea and bread for staff"
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-clinical-slate-border">
            <Button variant="solid-neutral" type="button" onClick={() => setIsExpenseModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="solid-primary" type="submit" isLoading={isLoading}>
              Save & Post to Cashbook
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Internal Bank Transfer */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Execute Internal Bank Transfer"
      >
        <form onSubmit={handleExecuteTransfer} className="space-y-4">
          <div>
            <Select
              label="From Bank Account"
              value={transferForm.fromBankAccountId}
              options={bankAccounts.map((b) => ({
                value: b.id,
                label: `${b.bankName} - ${b.maskedAccountNumber} (${formatLKR(b.currentBalanceLkr)})`,
              }))}
              onChange={(e) => setTransferForm({ ...transferForm, fromBankAccountId: e.target.value })}
              required
            />
          </div>

          <div>
            <Select
              label="To Bank Account"
              value={transferForm.toBankAccountId}
              options={bankAccounts.map((b) => ({
                value: b.id,
                label: `${b.bankName} - ${b.maskedAccountNumber} (${formatLKR(b.currentBalanceLkr)})`,
              }))}
              onChange={(e) => setTransferForm({ ...transferForm, toBankAccountId: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-clinical-slate-body mb-1">Transfer Amount (LKR)</label>
              <Input
                type="number"
                min="1"
                value={transferForm.amountLkr}
                onChange={(e) => setTransferForm({ ...transferForm, amountLkr: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-clinical-slate-body mb-1">Bank Fee (LKR)</label>
              <Input
                type="number"
                min="0"
                value={transferForm.feeLkr}
                onChange={(e) => setTransferForm({ ...transferForm, feeLkr: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-clinical-slate-body mb-1">Description</label>
            <Input
              type="text"
              value={transferForm.description}
              onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-clinical-slate-border">
            <Button variant="solid-neutral" type="button" onClick={() => setIsTransferModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="solid-primary" type="submit" isLoading={isLoading}>
              Execute Transfer
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Printable 80mm ESC/POS Thermal Z-Report Preview */}
      <Modal
        isOpen={isZReportModalOpen}
        onClose={() => setIsZReportModalOpen(false)}
        title="End-of-Day Z-Report (80mm Thermal Receipt Preview)"
      >
        <div className="space-y-4">
          <div className="bg-white p-6 border border-slate-300 rounded shadow font-mono text-xs text-slate-800 max-w-sm mx-auto leading-relaxed">
            <div className="text-center border-b border-dashed border-slate-400 pb-3">
              <h4 className="font-bold text-sm tracking-wider">UNIVERSAL PHARMACY</h4>
              <p className="text-[10px]">No. 120, Galle Road, Colombo 03</p>
              <p className="text-[10px]">Tel: +94 11 234 5678</p>
              <p className="text-[10px]">Tax Reg: 100984920-7000</p>
              <div className="mt-2 font-bold text-xs bg-slate-100 py-1">
                *** END OF DAY Z-REPORT ***
              </div>
            </div>

            <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Closing Date:</span>
                <span className="font-bold">{dayClosePreview.closingDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Closing Time:</span>
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Register Store ID:</span>
                <span>Store #01 (Main Counter)</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-bold text-clinical-crimson">LOCKED (FINAL)</span>
              </div>
            </div>

            <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Opening Cash:</span>
                <span>{formatLKR(dayClosePreview.openingCashLkr)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cash Counter Sales:</span>
                <span>+{formatLKR(dayClosePreview.cashSalesLkr)}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer Collections:</span>
                <span>+{formatLKR(dayClosePreview.cashCollectionsLkr)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cash Expenses:</span>
                <span>-{formatLKR(dayClosePreview.cashExpensesLkr)}</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-dotted border-slate-300">
                <span>Expected Total Cash:</span>
                <span>{formatLKR(dayClosePreview.expectedCashLkr)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Counted Physical Cash:</span>
                <span>{formatLKR(countedCash)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Variance:</span>
                <span>{formatLKR(variance)}</span>
              </div>
            </div>

            <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[10px]">
              <div className="font-bold mb-1">Denomination Breakdown:</div>
              <div className="grid grid-cols-2 gap-x-2">
                <span>Rs. 5000 x {denominations['5000'] || 0}</span>
                <span className="text-right">{formatLKR(5000 * (denominations['5000'] || 0))}</span>
                <span>Rs. 1000 x {denominations['1000'] || 0}</span>
                <span className="text-right">{formatLKR(1000 * (denominations['1000'] || 0))}</span>
                <span>Rs. 500 x {denominations['500'] || 0}</span>
                <span className="text-right">{formatLKR(500 * (denominations['500'] || 0))}</span>
                <span>Rs. 100 x {denominations['100'] || 0}</span>
                <span className="text-right">{formatLKR(100 * (denominations['100'] || 0))}</span>
                <span>Coins Subtotal:</span>
                <span className="text-right">{formatLKR(coinInput || 0)}</span>
              </div>
            </div>

            <div className="pt-4 text-center text-[10px] space-y-4">
              <div className="pt-6 border-b border-slate-400">Cashier Signature</div>
              <div className="pt-6 border-b border-slate-400">Manager Authorization Signature</div>
              <p className="text-[9px] text-slate-400 pt-2">System Generated via Pharmacy Management Core</p>
            </div>
          </div>

          <div className="flex justify-center gap-2 pt-2">
            <Button
              variant="solid-primary"
              onClick={() => window.print()}
              className="flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Print 80mm Z-Report
            </Button>
            <Button variant="solid-neutral" onClick={() => setIsZReportModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: Manager Day Unlock */}
      <Modal
        isOpen={isReopenModalOpen}
        onClose={() => setIsReopenModalOpen(false)}
        title="Manager Register Unlock & Audit Override"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-clinical-amber text-xs">
            <p className="font-semibold mb-1">Security Audit Notice</p>
            Reopening a locked register allows editing closed sales and transactions. An immutable audit record will be logged capturing your manager user credentials, timestamp, and formal reason.
          </div>

          <div>
            <label className="block text-xs font-semibold text-clinical-slate-body mb-1">
              Formal Reason for Reopening (Mandatory) *
            </label>
            <textarea
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="e.g. Late prescription billing adjustment, emergency price audit..."
              className="w-full text-xs p-2.5 rounded border border-clinical-slate-border bg-white focus:outline-none focus:ring-2 focus:ring-clinical-emerald"
              rows={3}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-clinical-slate-border">
            <Button variant="solid-neutral" onClick={() => setIsReopenModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="solid-danger"
              onClick={handleReopenDayClose}
              isLoading={isLoading}
            >
              Confirm Unlock & Log Audit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
