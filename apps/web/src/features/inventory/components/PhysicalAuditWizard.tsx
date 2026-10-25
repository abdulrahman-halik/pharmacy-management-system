import React, { useState } from 'react';
import { Card, Badge, Button, Input, Select } from '../../../components/core';
import { formatLKR } from '@pharmacy/shared';
import type { InventoryBatchDto, StockAuditSessionDto } from '@pharmacy/shared';
import { inventoryApi } from '../services/inventoryApi';
import {
  ClipboardCheck,
  Barcode,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  TrendingDown,
  TrendingUp,
  FileCheck,
} from 'lucide-react';

interface PhysicalAuditWizardProps {
  batches: InventoryBatchDto[];
}

export const PhysicalAuditWizard: React.FC<PhysicalAuditWizardProps> = ({ batches }) => {
  const [activeSession, setActiveSession] = useState<StockAuditSessionDto | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(batches[0]?.id || '');
  const [countedUnits, setCountedUnits] = useState<number>(0);
  const [countNotes, setCountNotes] = useState<string>('');
  const [managerSignOff, setManagerSignOff] = useState<string>('Manager Pharmacist-in-Charge');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [alertNotice, setAlertNotice] = useState<string | null>(null);

  const selectedBatch = batches.find((b) => b.id === selectedBatchId) || batches[0];

  const handleStartSession = async () => {
    try {
      const session = await inventoryApi.startAuditSession({
        notes: 'Monthly Physical Stocktake Dispensary Shelf A',
      });
      setActiveSession(session);
      setAlertNotice(`Opened Physical Audit Session ${session.sessionCode}`);
    } catch (err: any) {
      alert(`Failed to start audit session: ${err.message}`);
    }
  };

  const handleRecordCount = async () => {
    if (!activeSession) return;
    setIsRecording(true);
    try {
      const updated = await inventoryApi.recordAuditCount(activeSession.id, {
        batchId: selectedBatchId,
        countedQuantityBaseUnits: countedUnits,
        notes: countNotes,
      });
      setActiveSession(updated);
      setAlertNotice(`Recorded count of ${countedUnits} units for batch ${selectedBatch?.batchNumber}`);
      setCountNotes('');
    } catch (err: any) {
      alert(`Error recording count: ${err.message}`);
    } finally {
      setIsRecording(false);
    }
  };

  const handleApproveSession = async () => {
    if (!activeSession) return;
    setIsApproving(true);
    try {
      const res = await inventoryApi.approveAuditSession(activeSession.id, {
        approvedBy: managerSignOff,
        decision: 'APPROVED',
      });
      setActiveSession({
        ...activeSession,
        status: 'APPROVED',
        approvedBy: managerSignOff,
        approvedAt: new Date().toISOString(),
      });
      setAlertNotice(res.message);
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  const batchOptions = batches.map((b) => ({
    value: b.id,
    label: `${b.medicineName} (${b.batchNumber}) — Sys Stock: ${b.quantityBaseUnits}`,
  }));

  return (
    <div className="space-y-6">
      <div className="border-b border-[#CBD5E1] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-sans text-[#0F172A] tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-[#047857]" />
            Physical Stocktake & Reconciliation Wizard
          </h2>
          <p className="text-sm text-[#64748B] mt-0.5">
            Barcode-assisted physical counting, live variance cost calculation, and manager-signed AUDIT_CORRECTION reconciliation
          </p>
        </div>

        {!activeSession && (
          <Button
            variant="solid-primary"
            leftIcon={<Play className="w-4 h-4 fill-current" />}
            onClick={handleStartSession}
          >
            Start New Stocktake Session
          </Button>
        )}
      </div>

      {alertNotice && (
        <div className="p-4 bg-[#D1FAE5] border border-[#047857] text-[#064E3B] rounded-md flex items-center gap-3 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#047857]" />
          <span>{alertNotice}</span>
        </div>
      )}

      {!activeSession ? (
        <Card className="bg-white border border-[#CBD5E1] shadow-[0_2px_0_0_#0F172A] p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-[#D1FAE5] text-[#047857] mx-auto flex items-center justify-center mb-4">
            <Barcode className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#0F172A]">No Active Audit Session</h3>
          <p className="text-sm text-[#64748B] max-w-md mx-auto mt-1 mb-6">
            Initiate a physical audit session to compare dispensary physical shelf counts with system batch records and resolve variances.
          </p>
          <Button variant="solid-primary" onClick={handleStartSession}>
            Start Stocktake Session Now
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Session Status Header */}
          <Card className="bg-[#F8FAFC] border border-[#CBD5E1] shadow-[0_2px_0_0_#0F172A] p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-bold text-[#64748B]">Active Session</span>
                <div className="text-xl font-bold font-mono text-[#0F172A]">
                  {activeSession.sessionCode}
                </div>
              </div>

              <div>
                <span className="text-xs uppercase font-bold text-[#64748B] block">Session Status</span>
                <Badge
                  variant={activeSession.status === 'APPROVED' ? 'in-stock' : 'near-expiry'}
                  size="md"
                >
                  {activeSession.status}
                </Badge>
              </div>

              <div>
                <span className="text-xs uppercase font-bold text-[#64748B] block">
                  Net Discrepancy Cost
                </span>
                <div
                  className={`text-xl font-bold font-mono ${
                    activeSession.totalVarianceCostLkr < 0
                      ? 'text-[#DC2626]'
                      : activeSession.totalVarianceCostLkr > 0
                        ? 'text-[#047857]'
                        : 'text-[#0F172A]'
                  }`}
                >
                  {formatLKR(activeSession.totalVarianceCostLkr)}
                </div>
              </div>
            </div>
          </Card>

          {/* Split View: Left Scanner/Count Input vs Right Live Variance Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Rapid Count Entry Input */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="bg-white border border-[#CBD5E1] shadow-[0_2px_0_0_#0F172A] p-5 space-y-4">
                <div className="border-b border-[#F1F5F9] pb-3">
                  <h3 className="font-bold text-[#0F172A] text-sm uppercase tracking-wider flex items-center gap-2">
                    <Barcode className="w-4 h-4 text-[#047857]" />
                    Record Count / Scan Batch
                  </h3>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#334155] mb-1.5">
                    Select Scanned Medicine & Batch
                  </label>
                  <Select
                    label=""
                    value={selectedBatchId}
                    onChange={(e) => {
                      setSelectedBatchId(e.target.value);
                      const b = batches.find((x) => x.id === e.target.value);
                      if (b) setCountedUnits(b.quantityBaseUnits);
                    }}
                    options={batchOptions}
                  />
                </div>

                {selectedBatch && (
                  <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-md text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">System Quantity:</span>
                      <strong className="font-mono text-[#0F172A] text-sm">
                        {selectedBatch.quantityBaseUnits} Units
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Unit Cost Price:</span>
                      <strong className="font-mono text-[#334155]">
                        {formatLKR(selectedBatch.unitCostPrice)}
                      </strong>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#334155] mb-1.5">
                    Physical Counted Quantity (Base Units)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={countedUnits}
                    onChange={(e) => setCountedUnits(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    placeholder="Counted units..."
                  />
                  {selectedBatch && (
                    <div className="mt-1 text-xs text-[#64748B] flex items-center gap-1 font-mono">
                      <span>Variance:</span>
                      <span
                        className={`font-bold ${
                          countedUnits - selectedBatch.quantityBaseUnits < 0
                            ? 'text-[#DC2626]'
                            : countedUnits - selectedBatch.quantityBaseUnits > 0
                              ? 'text-[#047857]'
                              : 'text-[#64748B]'
                        }`}
                      >
                        {countedUnits - selectedBatch.quantityBaseUnits > 0 ? '+' : ''}
                        {countedUnits - selectedBatch.quantityBaseUnits} units (
                        {formatLKR(
                          (countedUnits - selectedBatch.quantityBaseUnits) *
                            selectedBatch.unitCostPrice,
                        )}
                        )
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#334155] mb-1.5">
                    Audit Notes / Shelf Position
                  </label>
                  <Input
                    placeholder="e.g. Shelf B2 sealed box counted..."
                    value={countNotes}
                    onChange={(e) => setCountNotes(e.target.value)}
                  />
                </div>

                <Button
                  variant="solid-primary"
                  className="w-full"
                  disabled={activeSession.status !== 'IN_PROGRESS'}
                  isLoading={isRecording}
                  onClick={handleRecordCount}
                >
                  Record Item Count
                </Button>
              </Card>
            </div>

            {/* Right: Live Variance Table */}
            <div className="lg:col-span-7">
              <Card className="bg-white border border-[#CBD5E1] shadow-[0_2px_0_0_#0F172A] overflow-hidden">
                <div className="p-3.5 bg-[#F8FAFC] border-b border-[#CBD5E1] flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#334155]">
                    Audited Line Items ({activeSession.items?.length || 0})
                  </div>
                  <div className="text-xs text-[#64748B]">
                    Variance = Counted - System Stock
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#F1F5F9] text-xs font-bold text-[#334155] uppercase border-b border-[#CBD5E1]">
                      <tr>
                        <th className="py-3 px-3">Batch</th>
                        <th className="py-3 px-3 text-center">System</th>
                        <th className="py-3 px-3 text-center">Counted</th>
                        <th className="py-3 px-3 text-center">Variance</th>
                        <th className="py-3 px-3 text-right">Cost (LKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {!activeSession.items || activeSession.items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-[#64748B]">
                            No items counted in this session yet. Use the left panel to scan and record counts.
                          </td>
                        </tr>
                      ) : (
                        activeSession.items.map((it) => (
                          <tr key={it.id} className="hover:bg-[#F8FAFC]">
                            <td className="py-3 px-3">
                              <div className="font-mono font-bold text-[#0F172A] text-xs">
                                {it.batchNumber || it.batchId}
                              </div>
                              <div className="text-xs text-[#64748B]">{it.medicineName}</div>
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-[#64748B]">
                              {it.systemQuantityBaseUnits}
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-[#0F172A]">
                              {it.countedQuantityBaseUnits}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {it.varianceQuantityBaseUnits === 0 ? (
                                <Badge variant="in-stock" size="sm">
                                  Match (0)
                                </Badge>
                              ) : it.varianceQuantityBaseUnits > 0 ? (
                                <Badge variant="in-stock" size="sm" icon={<TrendingUp className="w-3 h-3" />}>
                                  +{it.varianceQuantityBaseUnits}
                                </Badge>
                              ) : (
                                <Badge variant="expired" size="sm" icon={<TrendingDown className="w-3 h-3" />}>
                                  {it.varianceQuantityBaseUnits}
                                </Badge>
                              )}
                            </td>
                            <td
                              className={`py-3 px-3 text-right font-mono font-bold text-xs ${
                                it.varianceCostLkr < 0 ? 'text-[#DC2626]' : 'text-[#047857]'
                              }`}
                            >
                              {formatLKR(it.varianceCostLkr)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Manager Sign-off & Reconciliation Box */}
              {activeSession.status === 'IN_PROGRESS' && activeSession.items?.length > 0 && (
                <Card className="mt-4 p-5 bg-[#FEF3C7] border border-[#D97706] shadow-[0_2px_0_0_#D97706] space-y-4">
                  <div className="flex items-center gap-2 font-bold text-[#78350F] text-sm">
                    <FileCheck className="w-5 h-5 text-[#D97706]" />
                    <span>Manager Sign-Off & AUDIT_CORRECTION Ledger Execution</span>
                  </div>
                  <p className="text-xs text-[#78350F]">
                    Approving will automatically write signed <code>AUDIT_CORRECTION</code> rows into the immutable stock movement ledger, bringing batch counts into exact parity with physical inventory.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <div className="flex-1 w-full">
                      <Input
                        placeholder="Manager Name / Authorization Code..."
                        value={managerSignOff}
                        onChange={(e) => setManagerSignOff(e.target.value)}
                      />
                    </div>
                    <Button
                      variant="solid-primary"
                      className="w-full sm:w-auto"
                      isLoading={isApproving}
                      onClick={handleApproveSession}
                    >
                      Reconcile & Sign Off Stocktake
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
