import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '../../../components/core';
import { StaffCompensationDto } from '@pharmacy/shared';

interface CompensationModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffCompensationDto | null;
  onSubmit: (form: {
    userId: string;
    fullName: string;
    monthlySalary: number;
    epfNumber?: string | null;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    bankBranch?: string | null;
  }) => void;
}

export const CompensationModal: React.FC<CompensationModalProps> = ({
  isOpen,
  onClose,
  staff,
  onSubmit,
}) => {
  const [monthlySalary, setMonthlySalary] = useState('');
  const [epfNumber, setEpfNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankBranch, setBankBranch] = useState('');

  useEffect(() => {
    if (staff) {
      setMonthlySalary(String(staff.monthlySalaryLkr));
      setEpfNumber(staff.epfNumber || '');
      setBankName(staff.bankName || '');
      setBankAccountNumber(staff.bankAccountNumber || '');
      setBankBranch(staff.bankBranch || '');
    }
  }, [staff]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;
    onSubmit({
      userId: staff.userId,
      fullName: staff.fullName,
      monthlySalary: parseFloat(monthlySalary) || 0,
      epfNumber: epfNumber || null,
      bankName: bankName || null,
      bankAccountNumber: bankAccountNumber || null,
      bankBranch: bankBranch || null,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Update Compensation: ${staff?.fullName || ''}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-clinical-slate-heading uppercase tracking-wider mb-1">
            Monthly Base Salary (LKR)
          </label>
          <Input
            type="number"
            min="0"
            step="100"
            required
            value={monthlySalary}
            onChange={(e) => setMonthlySalary(e.target.value)}
            className="w-full text-sm font-mono font-bold"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-clinical-slate-heading uppercase tracking-wider mb-1">
            EPF / ETF Employee Number
          </label>
          <Input
            placeholder="e.g. EPF-1420"
            value={epfNumber}
            onChange={(e) => setEpfNumber(e.target.value)}
            className="w-full text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-clinical-slate-heading uppercase tracking-wider mb-1">
              Bank Name
            </label>
            <Input
              placeholder="e.g. Commercial Bank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-clinical-slate-heading uppercase tracking-wider mb-1">
              Bank Account Number
            </label>
            <Input
              placeholder="e.g. 8009123456"
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              className="w-full text-sm font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-clinical-slate-heading uppercase tracking-wider mb-1">
            Bank Branch
          </label>
          <Input
            placeholder="e.g. Kollupitiya Branch"
            value={bankBranch}
            onChange={(e) => setBankBranch(e.target.value)}
            className="w-full text-sm"
          />
        </div>

        <div className="pt-3 flex justify-end gap-3 border-t border-clinical-slate-border">
          <Button type="button" variant="solid-neutral" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="solid-primary">
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
