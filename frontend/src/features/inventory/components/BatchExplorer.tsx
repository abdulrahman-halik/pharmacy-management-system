import React, { useState } from 'react';
import { Card, Badge, Button, Input, Select, Drawer } from '../../../components/core';
import { formatLKR } from '@pharmacy/shared';
import type { InventoryBatchDto } from '@pharmacy/shared';
import {
  Search,
  Filter,
  History,
  ShieldAlert,
  Calendar,
  DollarSign,
  PackageCheck,
  Ban,
  Clock,
} from 'lucide-react';

interface BatchExplorerProps {
  batches: InventoryBatchDto[];
  loading?: boolean;
  onRefresh?: () => void;
  onRecallBatch?: (batch: InventoryBatchDto) => void;
  onAdjustBatch?: (batch: InventoryBatchDto) => void;
}

export const BatchExplorer: React.FC<BatchExplorerProps> = ({
  batches,
  loading = false,
  onRefresh,
  onRecallBatch,
  onAdjustBatch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState<InventoryBatchDto | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const msPerDay = 1000 * 60 * 60 * 24;

  const getDaysRemaining = (expiryDateStr: string) => {
    const exp = new Date(expiryDateStr);
    exp.setHours(0, 0, 0, 0);
    return Math.ceil((exp.getTime() - today.getTime()) / msPerDay);
  };

  const getExpiryBadge = (expiryDateStr: string, status: string) => {
    if (status === 'QUARANTINED') {
      return (
        <Badge variant="controlled-ii" icon={<ShieldAlert className="w-3.5 h-3.5" />}>
          QUARANTINED
        </Badge>
      );
    }

    const days = getDaysRemaining(expiryDateStr);

    if (days <= 0 || status === 'EXPIRED') {
      return (
        <Badge variant="expired" icon={<Ban className="w-3.5 h-3.5" />}>
          EXPIRED ({Math.abs(days)}d ago)
        </Badge>
      );
    }
    if (days <= 2) {
      return (
        <Badge variant="controlled-ii" icon={<Clock className="w-3.5 h-3.5" />}>
          CRITICAL ({days}d)
        </Badge>
      );
    }
    if (days <= 30) {
      return (
        <Badge variant="near-expiry" icon={<Clock className="w-3.5 h-3.5" />}>
          EXPIRING ({days}d)
        </Badge>
      );
    }
    if (days <= 90) {
      return (
        <Badge variant="low-stock" icon={<Clock className="w-3.5 h-3.5" />}>
          WARNING ({days}d)
        </Badge>
      );
    }
    return (
      <Badge variant="in-stock" icon={<PackageCheck className="w-3.5 h-3.5" />}>
        VALID ({days}d)
      </Badge>
    );
  };

  const filteredBatches = batches.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;

    const days = getDaysRemaining(b.expiryDate);
    if (expiryFilter === 'critical' && (days > 2 || days <= 0)) return false;
    if (expiryFilter === '30days' && (days > 30 || days <= 0)) return false;
    if (expiryFilter === '90days' && (days > 90 || days <= 0)) return false;
    if (expiryFilter === 'expired' && days > 0) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchBatch = b.batchNumber.toLowerCase().includes(q);
      const matchMed = b.medicineName?.toLowerCase().includes(q);
      const matchGen = b.medicineGenericName?.toLowerCase().includes(q);
      if (!matchBatch && !matchMed && !matchGen) return false;
    }

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <Card className="bg-white border border-[#CBD5E1] shadow-[0_2px_0_0_#0F172A] p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div className="md:col-span-2">
            <Input
              placeholder="Search by Batch No, Medicine Name, or Generic..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-[#64748B]" />}
            />
          </div>

          <div>
            <Select
              label=""
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active Batches' },
                { value: 'QUARANTINED', label: 'Quarantined (Recalled)' },
                { value: 'EXPIRED', label: 'Expired' },
                { value: 'DEPLETED', label: 'Depleted (0 Stock)' },
              ]}
            />
          </div>

          <div>
            <Select
              label=""
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Expiry Windows' },
                { value: 'critical', label: 'Critical (< 2 Days)' },
                { value: '30days', label: 'Urgent (< 30 Days)' },
                { value: '90days', label: 'Warning (< 90 Days)' },
                { value: 'expired', label: 'Expired Only' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Batches Table */}
      <Card className="bg-white border border-[#CBD5E1] shadow-[0_2px_0_0_#0F172A] overflow-hidden">
        <div className="p-3.5 bg-[#F8FAFC] border-b border-[#CBD5E1] flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-[#334155]">
            Showing {filteredBatches.length} of {batches.length} Registered Batches
          </div>
          {onRefresh && (
            <Button variant="solid-neutral" size="sm" onClick={onRefresh} isLoading={loading}>
              Refresh Batches
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F1F5F9] text-xs font-bold text-[#334155] uppercase border-b border-[#CBD5E1]">
              <tr>
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Medicine & Generic</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4 text-center">Status / Countdown</th>
                <th className="py-3 px-4 text-right">Stock (Units)</th>
                <th className="py-3 px-4 text-right">Landed Cost</th>
                <th className="py-3 px-4 text-right">Retail MRP</th>
                <th className="py-3 px-4 text-right">Total Valuation</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#64748B]">
                    No inventory batches match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => {
                  const totalBatchCost = batch.quantityBaseUnits * batch.unitCostPrice;
                  return (
                    <tr
                      key={batch.id}
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                      onClick={() => setSelectedBatch(batch)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#0F172A]">
                        {batch.batchNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#0F172A]">{batch.medicineName}</div>
                        <div className="text-xs text-[#64748B] italic">
                          {batch.medicineGenericName}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-[#334155]">
                        {batch.expiryDate}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getExpiryBadge(batch.expiryDate, batch.status)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#0F172A]">
                        {batch.quantityBaseUnits.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#334155]">
                        {formatLKR(batch.unitCostPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#047857] font-semibold">
                        {formatLKR(batch.batchMrp)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#0F172A]">
                        {formatLKR(totalBatchCost)}
                      </td>
                      <td
                        className="py-3 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          {onAdjustBatch && (
                            <Button
                              variant="solid-neutral"
                              size="sm"
                              onClick={() => onAdjustBatch(batch)}
                            >
                              Adjust
                            </Button>
                          )}
                          {onRecallBatch && batch.status !== 'QUARANTINED' && (
                            <Button
                              variant="solid-danger"
                              size="sm"
                              onClick={() => onRecallBatch(batch)}
                            >
                              Recall
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Batch Details Drawer */}
      <Drawer
        isOpen={Boolean(selectedBatch)}
        onClose={() => setSelectedBatch(null)}
        title={`Batch Details: ${selectedBatch?.batchNumber}`}
        position="right"
      >
        {selectedBatch && (
          <div className="space-y-6">
            <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-4 rounded-md space-y-2">
              <div className="text-xs font-bold uppercase text-[#64748B]">Medicine Master</div>
              <div className="text-lg font-bold text-[#0F172A]">{selectedBatch.medicineName}</div>
              <div className="text-sm text-[#64748B] italic">
                Generic: {selectedBatch.medicineGenericName}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="border border-[#CBD5E1] p-3 rounded-md bg-white">
                <span className="text-xs text-[#64748B] block">Current Stock</span>
                <span className="text-lg font-mono font-bold text-[#0F172A]">
                  {selectedBatch.quantityBaseUnits} Units
                </span>
              </div>
              <div className="border border-[#CBD5E1] p-3 rounded-md bg-white">
                <span className="text-xs text-[#64748B] block">Batch Status</span>
                <div className="mt-1">
                  {getExpiryBadge(selectedBatch.expiryDate, selectedBatch.status)}
                </div>
              </div>
              <div className="border border-[#CBD5E1] p-3 rounded-md bg-white">
                <span className="text-xs text-[#64748B] block">Landed Unit Cost</span>
                <span className="text-base font-mono font-bold text-[#334155]">
                  {formatLKR(selectedBatch.unitCostPrice)}
                </span>
              </div>
              <div className="border border-[#CBD5E1] p-3 rounded-md bg-white">
                <span className="text-xs text-[#64748B] block">Retail MRP</span>
                <span className="text-base font-mono font-bold text-[#047857]">
                  {formatLKR(selectedBatch.batchMrp)}
                </span>
              </div>
            </div>

            <div className="border border-[#CBD5E1] p-4 rounded-md bg-white space-y-2 text-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#64748B]">
                <Calendar className="w-3.5 h-3.5" /> Traceability Dates
              </div>
              <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Manufacturing Date:</span>
                <span className="font-mono text-[#0F172A]">{selectedBatch.mfdDate || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Expiry Date:</span>
                <span className="font-mono font-bold text-[#0F172A]">
                  {selectedBatch.expiryDate}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#64748B]">Days Remaining:</span>
                <span className="font-mono font-bold text-[#0F172A]">
                  {getDaysRemaining(selectedBatch.expiryDate)} Days
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              {onAdjustBatch && (
                <Button
                  variant="solid-neutral"
                  className="flex-1"
                  onClick={() => {
                    const b = selectedBatch;
                    setSelectedBatch(null);
                    onAdjustBatch(b);
                  }}
                >
                  Adjust Stock
                </Button>
              )}
              {onRecallBatch && selectedBatch.status !== 'QUARANTINED' && (
                <Button
                  variant="solid-danger"
                  className="flex-1"
                  onClick={() => {
                    const b = selectedBatch;
                    setSelectedBatch(null);
                    onRecallBatch(b);
                  }}
                >
                  Recall Batch
                </Button>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
