import React from 'react';
import { Card, Badge } from '../../../components/core';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  Wallet,
} from 'lucide-react';
import { formatLKR, ProfitAndLossSummaryDto } from '@pharmacy/shared';

interface FinanceOverviewTabProps {
  pnlSummary: ProfitAndLossSummaryDto;
  cashInDrawer: number;
}

export const FinanceOverviewTab: React.FC<FinanceOverviewTabProps> = ({
  pnlSummary,
  cashInDrawer,
}) => {
  return (
    <div className="space-y-6">
      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-clinical-emerald">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-clinical-slate-muted uppercase">Gross Revenue (Today)</span>
            <DollarSign className="w-4 h-4 text-clinical-emerald" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-clinical-slate-heading">
              {formatLKR(pnlSummary.grossSalesLkr)}
            </span>
          </div>
          <p className="text-[11px] text-clinical-slate-muted mt-1">Discounts: -{formatLKR(pnlSummary.discountsLkr)}</p>
        </Card>

        <Card className="border-l-4 border-l-clinical-teal">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-clinical-slate-muted uppercase">Gross Profit (COGS Deducted)</span>
            <TrendingUp className="w-4 h-4 text-clinical-teal" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-clinical-teal-text">
              {formatLKR(pnlSummary.grossProfitLkr)}
            </span>
            <Badge variant="in-stock" size="sm">{pnlSummary.grossMarginPercentage}% Margin</Badge>
          </div>
          <p className="text-[11px] text-clinical-slate-muted mt-1">Landed COGS: {formatLKR(pnlSummary.cogsLkr)}</p>
        </Card>

        <Card className="border-l-4 border-l-clinical-amber">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-clinical-slate-muted uppercase">Operating Expenses</span>
            <TrendingDown className="w-4 h-4 text-clinical-amber" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-800">
              {formatLKR(pnlSummary.operatingExpensesLkr)}
            </span>
          </div>
          <p className="text-[11px] text-clinical-slate-muted mt-1">Petty cash vouchers & store overhead</p>
        </Card>

        <Card className="border-l-4 border-l-emerald-600 bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase">Net Operating Profit</span>
            <Building2 className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-800">
              {formatLKR(pnlSummary.netProfitLkr)}
            </span>
          </div>
          <p className="text-[11px] text-emerald-700 mt-1">Final bottom line after all deductions</p>
        </Card>
      </div>

      {/* Main Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-Time Cash Drawer Status */}
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between pb-3 border-b border-clinical-slate-border">
            <h3 className="font-bold text-sm text-clinical-slate-heading flex items-center gap-2">
              <Wallet className="w-4 h-4 text-clinical-emerald" /> Real-Time Physical Cash in Drawer
            </h3>
            <Badge variant="in-stock" size="sm">ACTIVE REGISTER</Badge>
          </div>
          <div className="mt-4 p-4 bg-slate-50 border border-clinical-slate-border rounded-lg text-center space-y-1">
            <span className="text-xs text-clinical-slate-muted uppercase font-bold tracking-wider">Live Drawer Total</span>
            <div className="text-3xl font-mono font-bold text-clinical-emerald">
              {formatLKR(cashInDrawer)}
            </div>
            <p className="text-[11px] text-clinical-slate-muted">Calculated from opening float + cash sales - cash expenses</p>
          </div>
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-clinical-slate-muted">Authorized Cashier:</span>
              <span className="font-semibold text-clinical-slate-heading">Cashier #01 (Samantha S.)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-clinical-slate-muted">Dispensary Station:</span>
              <span className="font-semibold text-clinical-slate-heading">Main Prescription Counter</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-clinical-slate-muted">Physical Audit Threshold:</span>
              <span className="font-semibold text-clinical-slate-heading">Max Rs. 50,000 float</span>
            </div>
          </div>
        </Card>

        {/* P&L Statement Details */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-clinical-slate-border">
            <h3 className="font-bold text-sm text-clinical-slate-heading flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-clinical-emerald" /> Income Statement / P&L (Current Shift)
            </h3>
            <span className="text-xs text-clinical-slate-muted font-mono">Currency: LKR</span>
          </div>
          <div className="mt-4 space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="font-medium text-clinical-slate-body">1. Gross OTC & Rx Medicine Sales</span>
              <span className="font-mono font-semibold text-clinical-slate-heading">{formatLKR(pnlSummary.grossSalesLkr)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 text-clinical-crimson">
              <span className="font-medium">2. Less: Counter Promotional & Senior Discounts</span>
              <span className="font-mono font-semibold">({formatLKR(pnlSummary.discountsLkr)})</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 font-bold bg-slate-50 px-2 rounded">
              <span>3. Net Sales Revenue</span>
              <span className="font-mono text-clinical-emerald">{formatLKR(pnlSummary.netRevenueLkr)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-700">
              <span className="font-medium">4. Less: Cost of Goods Sold (FEFO Batch Landed Cost)</span>
              <span className="font-mono font-semibold">({formatLKR(pnlSummary.cogsLkr)})</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 font-bold bg-teal-50/50 px-2 rounded text-clinical-teal-text">
              <span>5. Gross Margin / Gross Operating Profit</span>
              <span className="font-mono">{formatLKR(pnlSummary.grossProfitLkr)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 text-amber-800">
              <span className="font-medium">6. Less: Direct Operational Expenses (Cashbook Petty Cash)</span>
              <span className="font-mono font-semibold">({formatLKR(pnlSummary.operatingExpensesLkr)})</span>
            </div>
            <div className="flex justify-between py-2 border-t-2 border-slate-200 font-bold bg-emerald-50 px-2 rounded text-emerald-800 text-sm">
              <span>Net Profit (EBITDA)</span>
              <span className="font-mono text-base">{formatLKR(pnlSummary.netProfitLkr)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
