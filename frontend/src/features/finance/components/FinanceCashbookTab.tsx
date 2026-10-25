import React from 'react';
import { Card, Badge, Button } from '../../../components/core';
import { ArrowDownRight, ArrowUpRight, PlusCircle } from 'lucide-react';
import { formatLKR, CashLedgerEntryDto } from '@pharmacy/shared';

interface FinanceCashbookTabProps {
  entries: CashLedgerEntryDto[];
  onOpenExpenseModal: () => void;
}

export const FinanceCashbookTab: React.FC<FinanceCashbookTabProps> = ({
  entries,
  onOpenExpenseModal,
}) => {
  return (
    <Card>
      <div className="flex items-center justify-between pb-4 border-b border-clinical-slate-border">
        <div>
          <h3 className="font-bold text-sm text-clinical-slate-heading">Cashbook Daily Journal</h3>
          <p className="text-xs text-clinical-slate-muted">Immutable double-entry log of cash inflows and counter expenses</p>
        </div>
        <Button
          variant="solid-primary"
          size="sm"
          onClick={onOpenExpenseModal}
          className="flex items-center gap-1.5"
        >
          <PlusCircle className="w-4 h-4" /> Add Expense Voucher
        </Button>
      </div>

      <div className="overflow-x-auto mt-4">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-clinical-slate-muted font-semibold uppercase border-y border-clinical-slate-border">
            <tr>
              <th className="py-2.5 px-3">Direction</th>
              <th className="py-2.5 px-3">Date / Timestamp</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Description / Memo</th>
              <th className="py-2.5 px-3">Payment Method</th>
              <th className="py-2.5 px-3 text-right">Amount (LKR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-clinical-slate-muted">
                  No cashbook entries recorded for this reporting period.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-2.5 px-3">
                    {entry.direction === 'IN' ? (
                      <span className="flex items-center gap-1 text-clinical-emerald font-bold">
                        <ArrowDownRight className="w-4 h-4" /> INFLOW
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-clinical-crimson font-bold">
                        <ArrowUpRight className="w-4 h-4" /> OUTFLOW
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-clinical-slate-muted font-mono">
                    {new Date(entry.entryDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge variant={entry.sourceType === 'SALE' ? 'rx' : 'controlled-ii'} size="sm">
                      {entry.sourceType}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-clinical-slate-heading">
                    {entry.description}
                  </td>
                  <td className="py-2.5 px-3 text-clinical-slate-muted uppercase font-mono text-[11px]">
                    {entry.paymentMethodId}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold">
                    <span className={entry.direction === 'IN' ? 'text-clinical-emerald' : 'text-clinical-crimson'}>
                      {entry.direction === 'IN' ? '+' : '-'}{formatLKR(entry.amountLkr)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
