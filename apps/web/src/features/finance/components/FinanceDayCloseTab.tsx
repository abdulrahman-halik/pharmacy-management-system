import React from 'react';
import { Card, Badge, Button, Input } from '../../../components/core';
import {
  Lock,
  Unlock,
  Receipt,
  Printer,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { formatLKR, DayClosePreviewDto } from '@pharmacy/shared';

const DENOM_LIST = ['5000', '1000', '500', '100', '50', '20', '10'];

interface FinanceDayCloseTabProps {
  dayClosePreview: DayClosePreviewDto;
  denominations: Record<string, number>;
  coinInput: number;
  setCoinInput: (val: number) => void;
  varianceReason: string;
  setVarianceReason: (val: string) => void;
  countedCash: number;
  variance: number;
  isVarianceNonZero: boolean;
  canSubmitDayClose: boolean;
  isLoading: boolean;
  onDenominationChange: (denom: string, val: number) => void;
  onCommitDayClose: () => void;
  onOpenZReportModal: () => void;
  onOpenReopenModal: () => void;
}

export const FinanceDayCloseTab: React.FC<FinanceDayCloseTabProps> = ({
  dayClosePreview,
  denominations,
  coinInput,
  setCoinInput,
  varianceReason,
  setVarianceReason,
  countedCash,
  variance,
  isVarianceNonZero,
  canSubmitDayClose,
  isLoading,
  onDenominationChange,
  onCommitDayClose,
  onOpenZReportModal,
  onOpenReopenModal,
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-clinical-slate-border gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-clinical-slate-heading">
                End-of-Day Shift Closeout & Cash Balancing
              </h3>
              {dayClosePreview.isAlreadyClosed ? (
                <Badge variant="controlled-ii" className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> LOCKED
                </Badge>
              ) : (
                <Badge variant="otc" className="flex items-center gap-1">
                  <Unlock className="w-3.5 h-3.5" /> OPEN REGISTER
                </Badge>
              )}
            </div>
            <p className="text-xs text-clinical-slate-muted mt-1">
              Closing Date: <span className="font-semibold text-clinical-slate-heading">{dayClosePreview.closingDate}</span> • Strict Sri Lankan Rupee denomination verification
            </p>
          </div>

          <div className="flex items-center gap-2">
            {dayClosePreview.isAlreadyClosed ? (
              <>
                <Button
                  variant="solid-primary"
                  size="sm"
                  onClick={onOpenZReportModal}
                  className="flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> View 80mm Z-Report
                </Button>
                <Button
                  variant="solid-danger"
                  size="sm"
                  onClick={onOpenReopenModal}
                  className="flex items-center gap-1.5"
                >
                  <Unlock className="w-4 h-4" /> Unlock Register (Manager)
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {/* Expected vs Counted Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
          {/* Left Column: Ledger Calculation */}
          <div className="space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-clinical-slate-muted">
              1. System Expected Cash Ledger
            </h4>
            <div className="bg-slate-50 border border-clinical-slate-border rounded-lg p-4 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-clinical-slate-muted">Opening Float (Shift Start):</span>
                <span className="font-mono font-semibold">{formatLKR(dayClosePreview.openingCashLkr)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 text-clinical-emerald">
                <span>+ Cash OTC & Prescription Sales:</span>
                <span className="font-mono font-semibold">+{formatLKR(dayClosePreview.cashSalesLkr)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 text-teal-700">
                <span>+ Customer Account Collections:</span>
                <span className="font-mono font-semibold">+{formatLKR(dayClosePreview.cashCollectionsLkr)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 text-clinical-crimson">
                <span>- Cash Expenses & Petty Cash:</span>
                <span className="font-mono font-semibold">-{formatLKR(dayClosePreview.cashExpensesLkr)}</span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-slate-300 font-bold text-sm bg-white p-2.5 rounded shadow-sm">
                <span className="text-clinical-slate-heading">Expected Cash in Drawer:</span>
                <span className="font-mono text-clinical-slate-heading">{formatLKR(dayClosePreview.expectedCashLkr)}</span>
              </div>
            </div>

            {/* Reconciliation Variance Summary */}
            <div className={`p-4 rounded-lg border text-xs space-y-2 ${
              isVarianceNonZero
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-emerald-50 border-emerald-300 text-emerald-900'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  {isVarianceNonZero ? <AlertTriangle className="w-4 h-4 text-amber-700" /> : <CheckCircle2 className="w-4 h-4 text-emerald-700" />}
                  Physical Cash Reconciliation
                </span>
                <span className="font-mono text-sm">
                  Variance: {variance > 0 ? `+${formatLKR(variance)} (Overage)` : variance < 0 ? `${formatLKR(variance)} (Shortage)` : 'Rs. 0.00 (Balanced)'}
                </span>
              </div>
              <div className="flex justify-between text-[11px] pt-1">
                <span>Counted: <strong className="font-mono">{formatLKR(countedCash)}</strong></span>
                <span>Expected: <strong className="font-mono">{formatLKR(dayClosePreview.expectedCashLkr)}</strong></span>
              </div>
            </div>

            {isVarianceNonZero && !dayClosePreview.isAlreadyClosed && (
              <div>
                <label className="block text-xs font-semibold text-clinical-slate-body mb-1">
                  Mandatory Discrepancy / Variance Reason *
                </label>
                <textarea
                  value={varianceReason}
                  onChange={(e) => setVarianceReason(e.target.value)}
                  placeholder="Explain why physical cash does not match system ledger..."
                  className="w-full text-xs p-2.5 rounded border border-amber-300 bg-amber-50/30 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  rows={2}
                  required
                />
              </div>
            )}
          </div>

          {/* Right Column: Physical Denominations */}
          <div className="space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-clinical-slate-muted">
              2. Physical Cash Denomination Counter
            </h4>
            <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-clinical-slate-border p-4 rounded-lg">
              {DENOM_LIST.map((denom) => (
                <div key={denom} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-clinical-slate-heading">Rs. {denom} Notes</span>
                    <span className="font-mono text-clinical-slate-muted">
                      {formatLKR(Number(denom) * (denominations[denom] || 0))}
                    </span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    disabled={dayClosePreview.isAlreadyClosed}
                    value={denominations[denom] || 0}
                    onChange={(e) => onDenominationChange(denom, parseInt(e.target.value) || 0)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              ))}

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-semibold text-clinical-slate-heading">Loose Coins (LKR)</span>
                  <span className="font-mono text-clinical-slate-muted">{formatLKR(coinInput || 0)}</span>
                </div>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  disabled={dayClosePreview.isAlreadyClosed}
                  value={coinInput}
                  onChange={(e) => setCoinInput(parseFloat(e.target.value) || 0)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            {!dayClosePreview.isAlreadyClosed && (
              <div className="pt-2">
                <Button
                  variant="solid-primary"
                  className="w-full py-2.5 flex items-center justify-center gap-2"
                  disabled={!canSubmitDayClose}
                  isLoading={isLoading}
                  onClick={onCommitDayClose}
                >
                  <Receipt className="w-4 h-4" /> Finalize & Lock Register for {dayClosePreview.closingDate}
                </Button>
                <p className="text-[11px] text-clinical-slate-muted text-center mt-2">
                  Permanent action. Locking prevents retroactive modifications unless reopened by manager.
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
