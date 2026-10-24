import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CreateBatchSchema,
  StockAdjustmentSchema,
  BatchRecallSchema,
  BatchFilterQuerySchema,
  FefoPreviewQuerySchema,
  RecordAuditCountSchema,
} from './schemas.js';

test('CreateBatchSchema accepts valid batch payload', () => {
  const result = CreateBatchSchema.safeParse({
    medicineId: 'med-1234',
    batchNumber: 'BATCH-2026-001',
    mfdDate: '2026-01-01',
    expiryDate: '2027-01-01',
    quantityBaseUnits: 500,
    unitCostPrice: 15.5,
    batchMrp: 25.0,
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.quantityBaseUnits, 500);
    assert.equal(result.data.unitCostPrice, 15.5);
  }
});

test('CreateBatchSchema rejects expiry date before manufacturing date', () => {
  const result = CreateBatchSchema.safeParse({
    medicineId: 'med-1234',
    batchNumber: 'BATCH-2026-001',
    mfdDate: '2026-05-01',
    expiryDate: '2026-04-01',
    quantityBaseUnits: 100,
    unitCostPrice: 10,
    batchMrp: 15,
  });

  assert.equal(result.success, false);
});

test('StockAdjustmentSchema enforces manager sign-off if cost exceeds Rs. 25,000', () => {
  const highValWithoutApproval = StockAdjustmentSchema.safeParse({
    batchId: 'batch-123',
    adjustmentType: 'REDUCE',
    quantityBaseUnits: 1000,
    reason: 'Water damage during cyclone',
    estimatedCostLkr: 35000,
  });

  assert.equal(highValWithoutApproval.success, false);

  const highValWithApproval = StockAdjustmentSchema.safeParse({
    batchId: 'batch-123',
    adjustmentType: 'REDUCE',
    quantityBaseUnits: 1000,
    reason: 'Water damage during cyclone',
    estimatedCostLkr: 35000,
    managerApprovedBy: 'mgr-user-007',
  });

  assert.equal(highValWithApproval.success, true);
});

test('BatchRecallSchema rejects empty or too short reasons', () => {
  const invalid = BatchRecallSchema.safeParse({
    batchId: 'batch-123',
    reason: 'bad',
  });

  assert.equal(invalid.success, false);

  const valid = BatchRecallSchema.safeParse({
    batchId: 'batch-123',
    reason: 'NMRA safety alert regarding particulate contamination',
  });

  assert.equal(valid.success, true);
});

test('RecordAuditCountSchema requires non-negative count', () => {
  const negative = RecordAuditCountSchema.safeParse({
    batchId: 'batch-123',
    countedQuantityBaseUnits: -5,
  });

  assert.equal(negative.success, false);

  const valid = RecordAuditCountSchema.safeParse({
    batchId: 'batch-123',
    countedQuantityBaseUnits: 0,
  });

  assert.equal(valid.success, true);
});

test('FefoPreviewQuerySchema coerces positive requested units', () => {
  const result = FefoPreviewQuerySchema.safeParse({
    requestedUnits: '45',
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.requestedUnits, 45);
  }
});
