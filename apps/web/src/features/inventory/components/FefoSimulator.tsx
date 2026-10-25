import React, { useState } from 'react';
import { Card, Badge, Button, Input, Select } from '../../../components/core';
import { formatLKR } from '@pharmacy/shared';
import type { InventoryBatchDto, FefoAllocationResult } from '@pharmacy/shared';
import { inventoryApi } from '../services/inventoryApi';
import { Play, ArrowDown, CheckCircle2, AlertTriangle, Layers, Calendar } from 'lucide-react';

interface FefoSimulatorProps {
  batches: InventoryBatchDto[];
}

export const FefoSimulator: React.FC<FefoSimulatorProps> = ({ batches }) => {
  // Extract unique medicines
  const medicineMap = new Map<string, { id: string; name: string }>();
  for (const b of batches) {
    if (!medicineMap.has(b.medicineId) && b.medicineName) {
      medicineMap.set(b.medicineId, { id: b.medicineId, name: b.medicineName });
    }
  }
  const medicineOptions = Array.from(medicineMap.values()).map((m) => ({
    value: m.id,
    label: m.name,
  }));

  const [selectedMedicineId, setSelectedMedicineId] = useState<string>(
    medicineOptions[0]?.value || 'med-001',
  );
  const [requestedUnits, setRequestedUnits] = useState<number>(100);
  const [simResult, setSimResult] = useState<FefoAllocationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const result = await inventoryApi.previewFefo(selectedMedicineId, requestedUnits);
      setSimResult(result);
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const medicineBatches = batches
    .filter((b) => b.medicineId === selectedMedicineId)
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  const totalAvailable = medicineBatches
    .filter((b) => b.status === 'ACTIVE')
    .reduce((sum, b) => sum + b.quantityBaseUnits, 0);

  return (
    <div className="space-y-6">
      <div className="border-b border-[#CBD5E1] pb-4">
        <h2 className="text-2xl font-bold font-sans text-[#0F172A] tracking-tight">
          High-Speed FEFO Allocation Simulator
        </h2>
        <p className="text-sm text-[#64748B] mt-0.5">
          Simulate the dispensary First-Expired, First-Out (FEFO) engine with pessimistic write lock logic
        </p>
      </div>

      {/* Control Card */}
      <Card className="bg-white border border-[#CBD5E1] shadow-[0_2px_0_0_#0F172A] p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#334155] mb-1.5">
              Select Medicine / Formulation
            </label>
            <Select
              label=""
              value={selectedMedicineId}
              onChange={(e) => {
                setSelectedMedicineId(e.target.value);
                setSimResult(null);
              }}
              options={medicineOptions}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#334155] mb-1.5">
              Dispensing Units Requested
            </label>
            <Input
              type="number"
              min={1}
              value={requestedUnits}
              onChange={(e) => setRequestedUnits(Math.max(1, parseInt(e.target.value, 10) || 1))}
              placeholder="e.g. 50"
            />
          </div>

          <div>
            <Button
              variant="solid-primary"
              className="w-full"
              leftIcon={<Play className="w-4 h-4 fill-current" />}
              onClick={handleSimulate}
              isLoading={isSimulating}
            >
              Simulate FEFO Draw
            </Button>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between text-xs text-[#64748B]">
          <div>
            Total Active Stock Available: <span className="font-bold text-[#0F172A]">{totalAvailable} units</span> across {medicineBatches.length} batch(es)
          </div>
          {requestedUnits > totalAvailable && (
            <div className="text-[#DC2626] font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Shortfall of {requestedUnits - totalAvailable} units expected!
            </div>
          )}
        </div>
      </Card>

      {/* Simulation Result Visualization */}
      {simResult && (
        <div className="space-y-4">
          <Card className="bg-white border border-[#CBD5E1] shadow-[0_2px_0_0_#0F172A] p-5">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <div>
                <span className="text-xs uppercase font-bold text-[#64748B] tracking-wider">
                  Simulation Outcome
                </span>
                <div className="text-xl font-bold text-[#0F172A] mt-0.5">
                  Allocated {simResult.allocatedTotalUnits} of {simResult.requestedUnits} Base Units
                </div>
              </div>
              <div>
                {simResult.shortfallUnits === 0 ? (
                  <Badge variant="in-stock" size="lg" icon={<CheckCircle2 className="w-4 h-4" />}>
                    100% Stock Fulfilled
                  </Badge>
                ) : (
                  <Badge variant="controlled-ii" size="lg" icon={<AlertTriangle className="w-4 h-4" />}>
                    Shortfall: {simResult.shortfallUnits} Units
                  </Badge>
                )}
              </div>
            </div>

            {/* Waterfall Batch Consumption Step-by-Step */}
            <div className="mt-6 space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[#334155]">
                Sequential FEFO Allocation Waterfall (Ordered by Earliest Expiry ASC)
              </div>

              {simResult.allocations.length === 0 ? (
                <div className="p-4 bg-[#FEF3C7] border border-[#D97706] text-[#78350F] rounded-md text-sm">
                  No active, unexpired batches available for allocation.
                </div>
              ) : (
                <div className="space-y-3">
                  {simResult.allocations.map((alloc, idx) => (
                    <div
                      key={alloc.batchId}
                      className="border border-[#CBD5E1] rounded-md p-4 bg-[#F8FAFC] flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#047857] text-white flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-bold font-mono text-[#0F172A] text-sm">
                            {alloc.batchNumber}
                          </div>
                          <div className="text-xs text-[#64748B] flex items-center gap-2 mt-0.5">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Expiry: <strong className="text-[#0F172A]">{alloc.expiryDate}</strong></span>
                            <span>•</span>
                            <span>Unit Cost: {formatLKR(alloc.unitCostPrice)}</span>
                            <span>•</span>
                            <span>Retail MRP: {formatLKR(alloc.batchMrp)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <span className="text-xs text-[#64748B] block">Units Drawn</span>
                          <span className="text-lg font-bold font-mono text-[#047857]">
                            -{alloc.allocatedUnits}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-[#64748B] block">Draw Cost Valuation</span>
                          <span className="text-base font-bold font-mono text-[#0F172A]">
                            {formatLKR(alloc.allocatedUnits * alloc.unitCostPrice)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
