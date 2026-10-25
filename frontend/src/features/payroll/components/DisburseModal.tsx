import React, { useState } from 'react';
import { Modal, Button, Select } from '../../../components/core';
import { Building2 } from 'lucide-react';
import { formatLKR, EmployeePayrollDto } from '@pharmacy/shared';

interface DisburseModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: EmployeePayrollDto | null;
  onConfirm: (method: 'CASH' | 'BANK_TRANSFER') => void;
}

export const DisburseModal: React.FC<DisburseModalProps> = ({
  isOpen,
  onClose,
  target,
  onConfirm,
}) => {
  const [method, setMethod] = useState<'CASH' | 'BANK_TRANSFER'>('BANK_TRANSFER');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Disburse Monthly Salary: ${target?.userFullName || 'Staff'}`}
    >
      <div className="space-y-4">
        <div className="bg-slate-50 p-3 rounded-lg border border-clinical-slate-border text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-clinical-slate-muted">Gross Earnings:</span>
            <span className="font-mono font-bold text-clinical-slate-heading">
              {formatLKR(target?.grossEarningsLkr || 0)}
            </span>
          </div>
          <div className="flex justify-between text-clinical-teal-text">
            <span>Statutory EPF (8%):</span>
            <span className="font-mono">-{formatLKR(target?.statutoryDeductionsLkr || 0)}</span>
          </div>
          <div className="flex justify-between text-clinical-amber-text">
            <span>Advance Deductions:</span>
            <span className="font-mono">-{formatLKR(target?.advanceDeductedLkr || 0)}</span>
          </div>
          <div className="pt-2 border-t border-clinical-slate-border flex justify-between font-bold text-sm text-clinical-emerald-dark">
            <span>Net Take-Home Payable:</span>
            <span className="font-mono text-base">{formatLKR(target?.netPayableLkr || 0)}</span>
          </div>
        </div>

        <div>
          <Select
            label="Select Disbursement Channel"
            value={method}
            onChange={(e) => setMethod(e.target.value as any)}
            options={[
              { value: 'BANK_TRANSFER', label: 'Bank Direct Transfer (CSV / Online Banking)' },
              { value: 'CASH', label: 'Cash In Hand (Drawer Payout)' },
            ]}
            className="w-full text-sm"
          />
        </div>

        {method === 'BANK_TRANSFER' && target?.bankName && (
          <div className="p-3 bg-clinical-teal-light border border-clinical-teal/20 rounded-lg text-xs text-clinical-teal-text space-y-0.5">
            <p className="font-bold flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-clinical-teal" />
              Employee Bank Account Details
            </p>
            <p>Bank: {target.bankName}</p>
            <p className="font-mono">Account Number: {target.bankAccountNumber}</p>
          </div>
        )}

        <div className="pt-3 flex justify-end gap-3 border-t border-clinical-slate-border">
          <Button type="button" variant="solid-neutral" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="solid-primary"
            onClick={() => onConfirm(method)}
          >
            Confirm Disbursement & Post Cashbook
          </Button>
        </div>
      </div>
    </Modal>
  );
};
