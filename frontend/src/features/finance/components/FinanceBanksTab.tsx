import React from 'react';
import { Card, Badge, Button } from '../../../components/core';
import { Building2, ArrowRightLeft } from 'lucide-react';
import { formatLKR, BankAccountDto } from '@pharmacy/shared';

interface FinanceBanksTabProps {
  bankAccounts: BankAccountDto[];
  onOpenTransferModal: () => void;
}

export const FinanceBanksTab: React.FC<FinanceBanksTabProps> = ({
  bankAccounts,
  onOpenTransferModal,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-clinical-slate-heading">Corporate Bank Accounts</h3>
          <p className="text-xs text-clinical-slate-muted">Commercial bank reconciliations and liquid cash reserves</p>
        </div>
        <Button
          variant="solid-primary"
          size="sm"
          onClick={onOpenTransferModal}
          className="flex items-center gap-1.5"
        >
          <ArrowRightLeft className="w-4 h-4" /> Transfer Between Accounts
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bankAccounts.map((account) => (
          <Card key={account.id} className="border border-clinical-slate-border">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-teal-50 rounded-lg text-clinical-teal">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-clinical-slate-heading">{account.bankName}</h4>
                  <p className="text-xs text-clinical-slate-muted">{account.accountName}</p>
                </div>
              </div>
              <Badge variant="in-stock" size="sm">ACTIVE</Badge>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-baseline justify-between">
              <div>
                <span className="text-[11px] text-clinical-slate-muted block">Account Number</span>
                <span className="font-mono font-semibold text-xs text-clinical-slate-body">
                  {account.maskedAccountNumber}
                </span>
                <span className="text-[11px] text-clinical-slate-muted block mt-1">Branch: {account.branchName}</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-clinical-slate-muted block">Ledger Balance</span>
                <span className="text-xl font-bold font-mono text-clinical-slate-heading">
                  {formatLKR(account.currentBalanceLkr)}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
