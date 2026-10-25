import React, { useState } from 'react';
import { Modal, Button, Input, Select } from '../../../components/core';
import { formatLKR, BankAccountDto } from '@pharmacy/shared';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankAccounts: BankAccountDto[];
  isLoading: boolean;
  onSubmit: (form: {
    fromBankAccountId: string;
    toBankAccountId: string;
    amountLkr: number;
    feeLkr: number;
    description: string;
  }) => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  bankAccounts,
  isLoading,
  onSubmit,
}) => {
  const [form, setForm] = useState({
    fromBankAccountId: 'ba-comb-main',
    toBankAccountId: 'ba-hnb-reserve',
    amountLkr: 5000,
    feeLkr: 30,
    description: 'Internal transfer to reserve account',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Execute Internal Bank Transfer">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Select
            label="From Bank Account"
            value={form.fromBankAccountId}
            options={bankAccounts.map((b) => ({
              value: b.id,
              label: `${b.bankName} - ${b.maskedAccountNumber} (${formatLKR(b.currentBalanceLkr)})`,
            }))}
            onChange={(e) => setForm({ ...form, fromBankAccountId: e.target.value })}
            required
          />
        </div>

        <div>
          <Select
            label="To Bank Account"
            value={form.toBankAccountId}
            options={bankAccounts.map((b) => ({
              value: b.id,
              label: `${b.bankName} - ${b.maskedAccountNumber} (${formatLKR(b.currentBalanceLkr)})`,
            }))}
            onChange={(e) => setForm({ ...form, toBankAccountId: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-clinical-slate-body mb-1">Transfer Amount (LKR)</label>
            <Input
              type="number"
              min="1"
              value={form.amountLkr}
              onChange={(e) => setForm({ ...form, amountLkr: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-clinical-slate-body mb-1">Bank Fee (LKR)</label>
            <Input
              type="number"
              min="0"
              value={form.feeLkr}
              onChange={(e) => setForm({ ...form, feeLkr: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-clinical-slate-body mb-1">Description</label>
          <Input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-clinical-slate-border">
          <Button variant="solid-neutral" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="solid-primary" type="submit" isLoading={isLoading}>
            Execute Transfer
          </Button>
        </div>
      </form>
    </Modal>
  );
};
