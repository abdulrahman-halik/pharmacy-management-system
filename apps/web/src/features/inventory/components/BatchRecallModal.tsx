import React, { useState } from 'react';
import { Modal, Button, Input, Badge, Card } from '../../../components/core';
import type { InventoryBatchDto, BatchTraceabilityReport } from '@pharmacy/shared';
import { inventoryApi } from '../services/inventoryApi';
import {
  ShieldAlert,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Calendar,
  User,
  Package,
} from 'lucide-react';

interface BatchRecallModalProps {
  batch: InventoryBatchDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BatchRecallModal: React.FC<BatchRecallModalProps> = ({
  batch,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [isQuarantining, setIsQuarantining] = useState(false);
  const [report, setReport] = useState<BatchTraceabilityReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!batch) return null;

  const handleConfirmRecall = async () => {
    if (reason.trim().length < 5) {
      setErrorMessage('Recall reason must be at least 5 characters');
      return;
    }

    setErrorMessage(null);
    setIsQuarantining(true);
    try {
      const rep = await inventoryApi.recallBatch({
        batchId: batch.id,
        reason,
      });
      setReport(rep);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to quarantine batch');
    } finally {
      setIsQuarantining(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setReport(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        report
          ? `NMRA Drug Traceability Report: Batch ${batch.batchNumber}`
          : `Emergency Batch Recall & Quarantine: ${batch.batchNumber}`
      }
      maxWidth={report ? 'lg' : 'md'}
    >
      <div className="space-y-4">
        {!report ? (
          <>
            <div className="p-4 bg-[#FEE2E2] border border-[#DC2626] rounded-md space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#7F1D1D] text-sm">
                <ShieldAlert className="w-5 h-5 text-[#DC2626] flex-shrink-0" />
                <span>Immediate NMRA Quarantine Lockout</span>
              </div>
              <p className="text-xs text-[#7F1D1D]">
                Quarantining batch <strong>{batch.batchNumber}</strong> will immediately prevent this stock from being dispensed at any POS terminal or checkout station.
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded-md text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Medicine Formulation:</span>
                <span className="font-bold text-[#0F172A]">{batch.medicineName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Current Remaining Stock:</span>
                <span className="font-mono font-bold text-[#0F172A]">
                  {batch.quantityBaseUnits} Base Units
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Expiry Date:</span>
                <span className="font-mono text-[#334155]">{batch.expiryDate}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#334155] mb-1.5">
                Official Regulatory Recall Reason *
              </label>
              <Input
                placeholder="e.g. NMRA Quality Defect Notification No. QDL-2026-88: Subpotent assay"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              {errorMessage && (
                <span className="text-xs text-[#DC2626] font-semibold mt-1 block">
                  {errorMessage}
                </span>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="solid-neutral" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="solid-danger"
                isLoading={isQuarantining}
                leftIcon={<ShieldAlert className="w-4 h-4" />}
                onClick={handleConfirmRecall}
              >
                Quarantine Batch Immediately
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-[#D1FAE5] border border-[#047857] text-[#064E3B] rounded-md flex items-center gap-3 text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5 text-[#047857] flex-shrink-0" />
              <span>
                Batch {batch.batchNumber} has been locked and marked QUARANTINED. Traceability report compiled below.
              </span>
            </div>

            {/* Traceability Summary Stats */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="border border-[#CBD5E1] p-3 rounded-md bg-white">
                <span className="text-xs text-[#64748B] block">Total Dispensed to Customers</span>
                <span className="text-lg font-mono font-bold text-[#DC2626]">
                  {report.totalDispensedUnits} Units
                </span>
              </div>
              <div className="border border-[#CBD5E1] p-3 rounded-md bg-white">
                <span className="text-xs text-[#64748B] block">Total Stock Quarantined</span>
                <span className="text-lg font-mono font-bold text-[#0F172A]">
                  {report.totalRemainingUnits} Units
                </span>
              </div>
            </div>

            {/* Sales Invoices Reference Log */}
            <Card className="bg-white border border-[#CBD5E1] overflow-hidden">
              <div className="p-3 bg-[#F8FAFC] border-b border-[#CBD5E1] text-xs font-bold uppercase text-[#334155]">
                Affected Sales & Prescriptions Traceability Log
              </div>
              <div className="overflow-x-auto max-h-48">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F1F5F9] font-bold text-[#334155] border-b border-[#CBD5E1]">
                    <tr>
                      <th className="py-2 px-3">Invoice / Ref ID</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3 text-center">Dispensed Qty</th>
                      <th className="py-2 px-3">Cashier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {report.salesReferences.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-[#64748B]">
                          No units of this batch were previously dispensed to patients.
                        </td>
                      </tr>
                    ) : (
                      report.salesReferences.map((ref, i) => (
                        <tr key={i} className="hover:bg-[#F8FAFC]">
                          <td className="py-2 px-3 font-mono font-bold text-[#0F172A]">
                            {ref.invoiceId}
                          </td>
                          <td className="py-2 px-3 text-[#64748B]">{ref.saleDate.split('T')[0]}</td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-[#DC2626]">
                            {ref.quantityBaseUnits}
                          </td>
                          <td className="py-2 px-3 text-[#334155]">{ref.userId}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="flex justify-end pt-2">
              <Button variant="solid-primary" onClick={handleClose}>
                Done & Close Report
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
