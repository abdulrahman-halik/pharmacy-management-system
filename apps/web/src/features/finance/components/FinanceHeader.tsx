import React from 'react';
import { Badge, Button } from '../../../components/core';
import {
  Lock,
  Unlock,
  PlusCircle,
  ArrowRightLeft,
  Calendar,
  RefreshCw,
} from 'lucide-react';

interface FinanceHeaderProps {
  isAlreadyClosed: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenExpense: () => void;
  onOpenTransfer: () => void;
  onGoToDayClose: () => void;
}

export const FinanceHeader: React.FC<FinanceHeaderProps> = ({
  isAlreadyClosed,
  isLoading,
  onRefresh,
  onOpenExpense,
  onOpenTransfer,
  onGoToDayClose,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-clinical-slate-border">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-clinical-slate-heading tracking-tight">
            Financial Management & Day-Close
          </h2>
          {isAlreadyClosed ? (
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
          onClick={onRefresh}
          isLoading={isLoading}
          className="flex items-center gap-1.5"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
        <Button
          variant="solid-neutral"
          size="sm"
          onClick={onOpenExpense}
          className="flex items-center gap-1.5 text-clinical-crimson border-red-200"
        >
          <PlusCircle className="w-4 h-4" /> Record Expense
        </Button>
        <Button
          variant="solid-neutral"
          size="sm"
          onClick={onOpenTransfer}
          className="flex items-center gap-1.5 text-clinical-teal border-teal-200"
        >
          <ArrowRightLeft className="w-4 h-4" /> Bank Transfer
        </Button>
        <Button
          variant="solid-primary"
          size="sm"
          onClick={onGoToDayClose}
          className="flex items-center gap-1.5"
        >
          <Calendar className="w-4 h-4" /> Day-Close Wizard
        </Button>
      </div>
    </div>
  );
};
