import React, { useState, useMemo } from 'react';
import { Modal, Button, Input, Select } from '../../../components/core';
import { AlertTriangle } from 'lucide-react';
import {
  formatLKR,
  StaffCompensationDto,
  DEFAULT_ADVANCE_CAP_RATIO,
} from '@pharmacy/shared';

interface AdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffCompensationDto[];
  onSubmit: (form: {
    userId: string;
    amountLkr: number;
    paymentMethodId: string;
    reason: string;
    overrideCap: boolean;
  }) => void;
}

export const AdvanceModal: React.FC<AdvanceModalProps> = ({
  isOpen,
  onClose,
  staffList,
  onSubmit,
}) => {
  const [userId, setUserId] = useState('');
  const [amountLkr, setAmountLkr] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('pm-cash');
  const [reason, setReason] = useState('');
  const [overrideCap, setOverrideCap] = useState(false);

  const selectedUser = useMemo(() => {
    return staffList.find((u) => u.userId === userId);
  }, [userId, staffList]);

  const capInfo = useMemo(() => {
    if (!selectedUser) return null;
    const base = selectedUser.monthlySalaryLkr;
    const cap = base * DEFAULT_ADVANCE_CAP_RATIO;
    const requested = parseFloat(amountLkr) || 0;
    const isExceeded = requested > cap;
    return { base, cap, requested, isExceeded };
  }, [selectedUser, amountLkr]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountLkr);
    if (isNaN(amount) || amount <= 0) return;
    onSubmit({
      userId,
      amountLkr: amount,
      paymentMethodId,
      reason,
      overrideCap,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Issue Mid-Month Salary Advance">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Select
            label="Select Employee / Staff Member"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            options={[
              { value: '', label: '-- Select Registered Staff --' },
              ...staffList.map((s) => ({
                value: s.userId,
                label: `${s.fullName} (${s.role}) - Base: ${formatLKR(s.monthlySalaryLkr)}`,
              })),
            ]}
            required
            className="w-full text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-clinical-slate-heading uppercase tracking-wider mb-1">
            Advance Amount (LKR)
          </label>
          <Input
            type="number"
            min="100"
            step="100"
            required
            placeholder="e.g. 20000"
            value={amountLkr}
            onChange={(e) => setAmountLkr(e.target.value)}
            className="w-full text-sm font-mono font-bold"
          />
        </div>

        {capInfo && (
          <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${
            capInfo.isExceeded ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex justify-between">
              <span>Standard 50% Advance Cap:</span>
              <strong className="font-mono">{formatLKR(capInfo.cap)}</strong>
            </div>
            {capInfo.isExceeded && (
              <div className="pt-2 border-t border-amber-200 text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Warning: Amount exceeds standard 50% cap
                </p>
                <label className="flex items-center gap-2 cursor-pointer font-medium mt-1">
                  <input
                    type="checkbox"
                    checked={overrideCap}
                    onChange={(e) => setOverrideCap(e.target.checked)}
                    className="rounded text-clinical-emerald"
                  />
                  <span>Manager Override: Authorize exceptional advance</span>
                </label>
              </div>
            )}
          </div>
        )}

        <div>
          <Select
            label="Payment Source Method"
            value={paymentMethodId}
            onChange={(e) => setPaymentMethodId(e.target.value)}
            options={[
              { value: 'pm-cash', label: 'Cash In Drawer (Registers)' },
              { value: 'pm-bank', label: 'Bank Transfer (Commercial Bank Account)' },
            ]}
            className="w-full text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-clinical-slate-heading uppercase tracking-wider mb-1">
            Advance Reason / Notes
          </label>
          <textarea
            rows={2}
            required
            placeholder="e.g. Urgent family medical emergency, house repairs..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2.5 text-xs border border-clinical-slate-border rounded-md focus:outline-none focus:ring-2 focus:ring-clinical-emerald"
          />
        </div>

        <div className="pt-3 flex justify-end gap-3 border-t border-clinical-slate-border">
          <Button type="button" variant="solid-neutral" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="solid-primary">
            Disburse Advance Now
          </Button>
        </div>
      </form>
    </Modal>
  );
};
