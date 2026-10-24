import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  StockAdjustmentSchema,
  StockAdjustmentInput,
  MANAGER_APPROVAL_THRESHOLD_LKR,
  formatLKR,
} from '@pharmacy/shared';
import type { InventoryBatchDto } from '@pharmacy/shared';
import { Card, Button, Input, Select } from '../../../components/core';
import { inventoryApi } from '../services/inventoryApi';
import {
  Scale,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  MinusCircle,
  FileCheck,
} from 'lucide-react';

interface StockAdjustmentFormProps {
  batches: InventoryBatchDto[];
  initialBatch?: InventoryBatchDto | null;
  onSuccess?: () => void;
}

export const StockAdjustmentForm: React.FC<StockAdjustmentFormProps> = ({
  batches,
  initialBatch,
  onSuccess,
}) => {
  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    initialBatch?.id || batches[0]?.id || '',
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const selectedBatch = batches.find((b) => b.id === selectedBatchId) || batches[0];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StockAdjustmentInput>({
    resolver: zodResolver(StockAdjustmentSchema),
    defaultValues: {
      batchId: initialBatch?.id || batches[0]?.id || '',
      adjustmentType: 'ADD',
      quantityBaseUnits: 10,
      reason: '',
      managerApprovedBy: '',
      estimatedCostLkr: 0,
    },
  });

  const adjustmentType = watch('adjustmentType');
  const quantity = watch('quantityBaseUnits') || 0;
  const unitCost = selectedBatch?.unitCostPrice || 0;
  const estimatedCost = quantity * unitCost;

  // Keep estimatedCostLkr in sync with form state for schema validation
  React.useEffect(() => {
    setValue('estimatedCostLkr', estimatedCost);
  }, [estimatedCost, setValue]);

  React.useEffect(() => {
    if (selectedBatchId) {
      setValue('batchId', selectedBatchId);
    }
  }, [selectedBatchId, setValue]);

  const requiresManagerApproval = estimatedCost > MANAGER_APPROVAL_THRESHOLD_LKR;

  const onSubmit = async (data: StockAdjustmentInput) => {
    setServerError(null);
    setSuccessMessage(null);
    try {
      const res = await inventoryApi.adjustStock(data);
      setSuccessMessage(res.message);
      reset({
        batchId: selectedBatchId,
        adjustmentType: 'ADD',
        quantityBaseUnits: 1,
        reason: '',
        managerApprovedBy: '',
        estimatedCostLkr: 0,
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setServerError(err.message || 'Failed to submit stock adjustment');
    }
  };

  const batchOptions = batches.map((b) => ({
    value: b.id,
    label: `${b.medicineName} (${b.batchNumber}) — Stock: ${b.quantityBaseUnits} @ ${formatLKR(b.unitCostPrice)}`,
  }));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="border-b border-[#CBD5E1] pb-4">
        <h2 className="text-2xl font-bold font-sans text-[#0F172A] tracking-tight flex items-center gap-2">
          <Scale className="w-6 h-6 text-[#047857]" />
          Controlled Stock Adjustment
        </h2>
        <p className="text-sm text-[#64748B] mt-0.5">
          Form state managed with React Hook Form and validated with Zod against immutable ledger rules
        </p>
      </div>

      {successMessage && (
        <div className="p-4 bg-[#D1FAE5] border border-[#047857] text-[#064E3B] rounded-md flex items-center gap-3 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#047857]" />
          <span>{successMessage}</span>
        </div>
      )}

      {serverError && (
        <div className="p-4 bg-[#FEE2E2] border border-[#DC2626] text-[#7F1D1D] rounded-md flex items-center gap-3 text-sm font-semibold">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#DC2626]" />
          <span>{serverError}</span>
        </div>
      )}

      <Card className="bg-white border border-[#CBD5E1] shadow-[0_2px_0_0_#0F172A] p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Target Batch Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#334155] mb-1.5">
              Target Batch & Formulation
            </label>
            <Select
              label=""
              value={selectedBatchId}
              onChange={(e) => {
                setSelectedBatchId(e.target.value);
                setValue('batchId', e.target.value);
              }}
              options={batchOptions}
            />
            {selectedBatch && (
              <div className="mt-2 p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-md text-xs text-[#334155] flex flex-wrap justify-between gap-2">
                <span>
                  Current Stock: <strong>{selectedBatch.quantityBaseUnits} base units</strong>
                </span>
                <span>
                  Landed Cost: <strong>{formatLKR(selectedBatch.unitCostPrice)}</strong>
                </span>
                <span>
                  Expiry Date: <strong>{selectedBatch.expiryDate}</strong>
                </span>
                <span>
                  Status: <strong>{selectedBatch.status}</strong>
                </span>
              </div>
            )}
            {errors.batchId && (
              <span className="text-xs text-[#DC2626] font-semibold mt-1 block">
                {errors.batchId.message}
              </span>
            )}
          </div>

          {/* Adjustment Direction Toggle */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#334155] mb-2">
              Adjustment Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setValue('adjustmentType', 'ADD')}
                className={`flex items-center justify-center gap-2 p-3 rounded-md border font-bold text-sm transition-all duration-150 ${
                  adjustmentType === 'ADD'
                    ? 'bg-[#D1FAE5] border-[#047857] text-[#064E3B] shadow-[0_2px_0_0_#047857]'
                    : 'bg-white border-[#CBD5E1] text-[#64748B] hover:bg-[#F8FAFC]'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-[#047857]" />
                Positive Count Correction (ADD)
              </button>

              <button
                type="button"
                onClick={() => setValue('adjustmentType', 'REDUCE')}
                className={`flex items-center justify-center gap-2 p-3 rounded-md border font-bold text-sm transition-all duration-150 ${
                  adjustmentType === 'REDUCE'
                    ? 'bg-[#FEE2E2] border-[#DC2626] text-[#7F1D1D] shadow-[0_2px_0_0_#DC2626]'
                    : 'bg-white border-[#CBD5E1] text-[#64748B] hover:bg-[#F8FAFC]'
                }`}
              >
                <MinusCircle className="w-4 h-4 text-[#DC2626]" />
                Damage / Waste Write-off (REDUCE)
              </button>
            </div>
          </div>

          {/* Quantity in Base Units & Financial Valuation Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#334155] mb-1.5">
                Quantity in Base Units (Tablets/Vials)
              </label>
              <Input
                type="number"
                min={1}
                {...register('quantityBaseUnits', { valueAsNumber: true })}
                placeholder="e.g. 50"
              />
              {errors.quantityBaseUnits && (
                <span className="text-xs text-[#DC2626] font-semibold mt-1 block">
                  {errors.quantityBaseUnits.message}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#334155] mb-1.5">
                Estimated Adjustment Valuation (LKR)
              </label>
              <div className="h-10 px-3 bg-[#F1F5F9] border border-[#CBD5E1] rounded-md flex items-center justify-between font-mono font-bold text-[#0F172A]">
                <span>{formatLKR(estimatedCost)}</span>
                <span className="text-xs font-sans text-[#64748B] font-normal">
                  @ {formatLKR(unitCost)}/unit
                </span>
              </div>
            </div>
          </div>

          {/* Manager Approval Gate if > Rs. 25,000 */}
          {requiresManagerApproval && (
            <div className="p-4 bg-[#FEF3C7] border border-[#D97706] rounded-md space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#78350F]">
                <ShieldAlert className="w-5 h-5 text-[#D97706] flex-shrink-0" />
                <span>
                  High-Value Threshold Exceeded: Valuation ({formatLKR(estimatedCost)}) exceeds Rs. 25,000
                </span>
              </div>
              <p className="text-xs text-[#78350F]">
                Under NMRA and GPP pharmacy standards, adjustments with financial cost over Rs. 25,000 require explicit Manager sign-off.
              </p>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#78350F] mb-1">
                  Manager Sign-Off Identifier / Name *
                </label>
                <Input
                  placeholder="e.g. Dr. Perera (Pharmacist-in-Charge)"
                  {...register('managerApprovedBy')}
                />
                {errors.managerApprovedBy && (
                  <span className="text-xs text-[#DC2626] font-bold mt-1 block">
                    {errors.managerApprovedBy.message}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Mandatory Audit Reason */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#334155] mb-1.5">
              Clinical / Operational Audit Reason *
            </label>
            <Input
              placeholder="e.g. Broken vial during shelf reorganization, found misplaced blister..."
              {...register('reason')}
            />
            {errors.reason && (
              <span className="text-xs text-[#DC2626] font-semibold mt-1 block">
                {errors.reason.message}
              </span>
            )}
          </div>

          {/* Submit CTA */}
          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant={adjustmentType === 'ADD' ? 'solid-primary' : 'solid-danger'}
              size="md"
              isLoading={isSubmitting}
              leftIcon={<FileCheck className="w-4 h-4" />}
            >
              Sign & Record Movement to Ledger
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
