import React, { useState } from 'react';
import { Modal, Button, Input, Select } from '../../../components/core';
import { ExpenseCategoryDto } from '@pharmacy/shared';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ExpenseCategoryDto[];
  isLoading: boolean;
  onSubmit: (form: {
    expenseDate: string;
    categoryId: string;
    amountLkr: number;
    paymentMethodId: string;
    description: string;
  }) => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  categories,
  isLoading,
  onSubmit,
}) => {
  const [form, setForm] = useState({
    expenseDate: new Date().toISOString().split('T')[0],
    categoryId: 'ec-staff-meals',
    amountLkr: 500,
    paymentMethodId: 'pm-cash',
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Counter Expense Voucher">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Select
            label="Expense Category"
            value={form.categoryId}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-clinical-slate-body mb-1">Amount (LKR)</label>
          <Input
            type="number"
            min="1"
            step="0.01"
            value={form.amountLkr}
            onChange={(e) => setForm({ ...form, amountLkr: parseFloat(e.target.value) || 0 })}
            required
          />
        </div>

        <div>
          <Select
            label="Payment Method"
            value={form.paymentMethodId}
            options={[
              { value: 'pm-cash', label: 'Cash Counter Drawer' },
              { value: 'pm-transfer', label: 'Commercial Bank Transfer' },
            ]}
            onChange={(e) => setForm({ ...form, paymentMethodId: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-clinical-slate-body mb-1">Description / Memo</label>
          <Input
            type="text"
            placeholder="e.g. Afternoon tea and bread for staff"
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
            Save & Post to Cashbook
          </Button>
        </div>
      </form>
    </Modal>
  );
};
