import React from 'react';
import { Modal, Button, Badge } from '../../../components/core';
import { AlertTriangle } from 'lucide-react';

interface PrescriptionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrescriptionReviewModal: React.FC<PrescriptionReviewModalProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Prescription Clinical Review (Rx-2026-0891)"
      description="Verify patient identification and doctor credentials before dispensing."
      footer={
        <>
          <Button variant="solid-neutral" size="sm" onClick={onClose}>
            Cancel (Esc)
          </Button>
          <Button
            variant="solid-primary"
            size="sm"
            onClick={() => {
              alert('Prescription verified and routed to dispensary queue!');
              onClose();
            }}
          >
            Approve & Dispense
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-left">
        <div className="bg-slate-50 border border-clinical-slate-border rounded-lg p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-clinical-slate-muted">Patient</span>
            <Badge variant="rx" size="sm">
              Verified NIC
            </Badge>
          </div>
          <p className="text-sm font-bold text-clinical-slate-heading">K. D. Samarakoon</p>
          <p className="text-xs text-clinical-slate-muted">NIC: 912345678V • Mobile: +94 77 123 4567</p>
        </div>

        <div className="border border-clinical-slate-border rounded-lg p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-clinical-slate-muted">Prescribed Drug</span>
            <span className="font-mono font-bold text-sm text-clinical-emerald">Rs. 1,450.00</span>
          </div>
          <p className="text-sm font-bold text-clinical-slate-heading">Amoxicillin + Clavulanate 625mg</p>
          <p className="text-xs text-slate-600">Dosage: 1 Tablet twice daily after meals for 7 days (14 Tablets).</p>
        </div>

        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-clinical-amber flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Drug Interaction Check Passed</p>
            <p className="text-amber-800">No dangerous contraindications found against patient active allergies.</p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
