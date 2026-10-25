import React from 'react';
import { Card, Badge, Button } from '../../../components/core';
import { PlusCircle, Clock, ShieldCheck } from 'lucide-react';
import { formatLKR, SalaryAdvanceDto } from '@pharmacy/shared';

interface PayrollAdvancesTabProps {
  advancesList: SalaryAdvanceDto[];
  onOpenAdvanceModal: () => void;
}

export const PayrollAdvancesTab: React.FC<PayrollAdvancesTabProps> = ({
  advancesList,
  onOpenAdvanceModal,
}) => {
  const totalOutstanding = advancesList
    .filter((a) => a.status === 'OUTSTANDING')
    .reduce((sum, a) => sum + Number(a.remainingBalanceLkr), 0);

  const totalRecovered = advancesList
    .reduce((sum, a) => sum + Number(a.recoveredAmountLkr), 0);

  return (
    <div className="space-y-6">
      {/* Advance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-clinical-amber">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-clinical-slate-muted uppercase">Active Outstanding Advances</span>
            <Clock className="w-4 h-4 text-clinical-amber" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-amber-800">
              {formatLKR(totalOutstanding)}
            </span>
          </div>
          <p className="text-[11px] text-clinical-slate-muted mt-1">Deductible in upcoming payroll cycle</p>
        </Card>

        <Card className="border-l-4 border-l-clinical-emerald">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-clinical-slate-muted uppercase">Total Recovered History</span>
            <ShieldCheck className="w-4 h-4 text-clinical-emerald" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-clinical-emerald">
              {formatLKR(totalRecovered)}
            </span>
          </div>
          <p className="text-[11px] text-clinical-slate-muted mt-1">Successfully settled advances</p>
        </Card>

        <Card className="flex flex-col justify-center items-center p-6 bg-slate-50 border border-clinical-slate-border">
          <Button
            variant="solid-primary"
            onClick={onOpenAdvanceModal}
            leftIcon={<PlusCircle className="w-4 h-4" />}
            className="w-full justify-center"
          >
            Issue Mid-Month Salary Advance
          </Button>
          <span className="text-[11px] text-clinical-slate-muted text-center mt-2">
            Subject to statutory 50% salary cap policy
          </span>
        </Card>
      </div>

      {/* Advances Table */}
      <Card>
        <div className="flex items-center justify-between pb-4 border-b border-clinical-slate-border">
          <div>
            <h3 className="font-bold text-sm text-clinical-slate-heading">Mid-Month Salary Advance Vault</h3>
            <p className="text-xs text-clinical-slate-muted">Formal advance ledger linked to cash drawer and bank payouts</p>
          </div>
          <Badge variant="rx" size="sm">{advancesList.length} Active Records</Badge>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-clinical-slate-muted font-semibold uppercase border-y border-clinical-slate-border">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Date Issued</th>
                <th className="py-3 px-4 text-right">Advance Amount</th>
                <th className="py-3 px-4 text-right">Remaining Balance</th>
                <th className="py-3 px-4">Payout Method</th>
                <th className="py-3 px-4">Reason / Notes</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Authorized By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {advancesList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-clinical-slate-muted">
                    No mid-month advances recorded.
                  </td>
                </tr>
              ) : (
                advancesList.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-clinical-slate-heading">
                      {a.userFullName}
                    </td>
                    <td className="py-3 px-4 font-mono text-clinical-slate-muted">
                      {a.advanceDate}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-800">
                      {formatLKR(a.amountLkr)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-clinical-crimson">
                      {formatLKR(a.remainingBalanceLkr)}
                    </td>
                    <td className="py-3 px-4 text-clinical-slate-body font-medium">
                      {a.paymentMethodName || 'Cash In Drawer'}
                    </td>
                    <td className="py-3 px-4 text-clinical-slate-muted max-w-xs truncate" title={a.reason}>
                      {a.reason}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={a.status === 'OUTSTANDING' ? 'near-expiry' : 'in-stock'} size="sm">
                        {a.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-clinical-slate-muted text-[11px]">
                      {a.approvedByUserName || 'Admin'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
