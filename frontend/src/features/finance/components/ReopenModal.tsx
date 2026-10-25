import React from 'react';
import { Modal, Button } from '../../../components/core';

interface ReopenModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: string;
  setReason: (val: string) => void;
  isLoading: boolean;
  onConfirm: () => void;
}

export const ReopenModal: React.FC<ReopenModalProps> = ({
  isOpen,
  onClose,
  reason,
  setReason,
  isLoading,
  onConfirm,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manager Register Unlock & Audit Override"
    >
      <div className="space-y-4">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-clinical-amber text-xs">
          <p className="font-semibold mb-1">Security Audit Notice</p>
          Reopening a locked register allows editing closed sales and transactions. An immutable audit record will be logged capturing your manager user credentials, timestamp, and formal reason.
        </div>

        <div>
          <label className="block text-xs font-semibold text-clinical-slate-body mb-1">
            Formal Reason for Reopening (Mandatory) *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Late prescription billing adjustment, emergency price audit..."
            className="w-full text-xs p-2.5 rounded border border-clinical-slate-border bg-white focus:outline-none focus:ring-2 focus:ring-clinical-emerald"
            rows={3}
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-clinical-slate-border">
          <Button variant="solid-neutral" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="solid-danger"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            Confirm Unlock & Log Audit
          </Button>
        </div>
      </div>
    </Modal>
  );
};
