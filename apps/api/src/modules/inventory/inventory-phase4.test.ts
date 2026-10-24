import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import AppDataSource from '../../database/data-source';
import { InventoryBatch } from './entities/inventory-batch.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { StockAuditSession } from './entities/stock-audit-session.entity';
import { StockAuditItem } from './entities/stock-audit-item.entity';
import { Medicine } from '../medicines/entities/medicine.entity';
import { StockMovementService } from './services/stock-movement.service';
import { FefoAllocationService } from './services/fefo-allocation.service';
import { StockHealthService } from './services/stock-health.service';
import { StockAdjustmentService } from './services/stock-adjustment.service';
import { BatchRecallService } from './services/batch-recall.service';
import { StockAuditService } from './services/stock-audit.service';
import { InventoryBatchService } from './services/inventory-batch.service';
import { BatchStatus, MovementType, AuditStatus } from '@pharmacy/shared';

let medicineRepo: any;
let batchService: InventoryBatchService;
let movementService: StockMovementService;
let fefoService: FefoAllocationService;
let healthService: StockHealthService;
let adjustmentService: StockAdjustmentService;
let recallService: BatchRecallService;
let auditService: StockAuditService;

before(async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const batchRepo = AppDataSource.getRepository(InventoryBatch);
  const movementRepo = AppDataSource.getRepository(StockMovement);
  medicineRepo = AppDataSource.getRepository(Medicine);
  const auditSessionRepo = AppDataSource.getRepository(StockAuditSession);
  const auditItemRepo = AppDataSource.getRepository(StockAuditItem);

  movementService = new StockMovementService(batchRepo, movementRepo, AppDataSource);
  fefoService = new FefoAllocationService(batchRepo);
  healthService = new StockHealthService(batchRepo, medicineRepo);
  adjustmentService = new StockAdjustmentService(batchRepo, movementService);
  recallService = new BatchRecallService(batchRepo, movementRepo);
  auditService = new StockAuditService(auditSessionRepo, auditItemRepo, batchRepo, movementService, AppDataSource);
  batchService = new InventoryBatchService(batchRepo, medicineRepo, movementRepo, AppDataSource);
});

after(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
});

async function createTestMedicine(name: string): Promise<Medicine> {
  const med = medicineRepo.create({
    name,
    genericName: name.split(' ')[0],
    brandManufacturer: 'State Pharmaceuticals Manufacturing Corporation (SPMC)',
    strength: '500mg',
    dosageForm: 'CAPSULE',
    reorderLevel: 50,
    mrp: 35.0,
    scheduleClass: 'PRESCRIPTION_ONLY',
    storageCondition: 'ROOM_TEMPERATURE',
    isVatExempt: true,
  });
  return medicineRepo.save(med);
}

test('Exit Criteria 1: Stock Movement Ledger Invariant Verification (+100 -> -20 -> +5 -> +2 = 87)', async () => {
  const medicine = await createTestMedicine(`Invariant Med ${Date.now()}`);

  // 1. Create batch with opening stock 100
  const batch = await batchService.createBatch(
    {
      medicineId: medicine.id,
      batchNumber: `TEST-INV-${Date.now()}`,
      mfdDate: '2026-01-15',
      expiryDate: '2027-01-15',
      quantityBaseUnits: 100,
      unitCostPrice: 20.0,
      batchMrp: 35.0,
    },
    'auditor-1',
  );

  assert.equal(batch.quantityBaseUnits, 100);

  // 2. Sale of 20 units (-20)
  await movementService.recordMovement({
    batchId: batch.id,
    movementType: MovementType.SALE,
    quantityBaseUnits: -20,
    reason: 'POS Sale Checkout invoice #INV-001',
    userId: 'cashier-1',
  });

  // 3. Positive Adjustment of 5 units (+5)
  await movementService.recordMovement({
    batchId: batch.id,
    movementType: MovementType.ADJUST_ADD,
    quantityBaseUnits: 5,
    reason: 'Found misplaced blister pack',
    userId: 'pharmacist-1',
  });

  // 4. Customer Sale Return Restock of 2 units (+2)
  await movementService.recordMovement({
    batchId: batch.id,
    movementType: MovementType.SALE_RETURN_RESTOCK,
    quantityBaseUnits: 2,
    reason: 'Customer unopened packet return',
    userId: 'cashier-1',
  });

  // 5. Invariant Check: batch balance vs SUM(movements)
  const invariantCheck = await movementService.verifyBatchLedgerInvariant(batch.id);

  assert.equal(invariantCheck.batchQuantity, 87, 'Batch balance must be exactly 87 units');
  assert.equal(invariantCheck.ledgerSum, 87, 'Sum of ledger movements must be exactly 87 units');
  assert.equal(invariantCheck.discrepancy, 0, 'Discrepancy between batch balance and ledger must be 0');
  assert.equal(invariantCheck.isValid, true, 'Ledger invariant check must be valid');
});

test('Exit Criteria 2: FEFO Allocation Engine sorts by earliest expiry and depletes properly', async () => {
  const medicine = await createTestMedicine(`FEFO Med ${Date.now()}`);
  const now = Date.now();

  // Batch 1: Expires earlier (2026-12-01)
  const batchEarly = await batchService.createBatch(
    {
      medicineId: medicine.id,
      batchNumber: `FEFO-EARLY-${now}`,
      mfdDate: '2026-01-01',
      expiryDate: '2026-12-01',
      quantityBaseUnits: 10,
      unitCostPrice: 18.0,
      batchMrp: 35.0,
    },
    'user-1',
  );

  // Batch 2: Expires later (2027-06-01)
  const batchLate = await batchService.createBatch(
    {
      medicineId: medicine.id,
      batchNumber: `FEFO-LATE-${now}`,
      mfdDate: '2026-01-01',
      expiryDate: '2027-06-01',
      quantityBaseUnits: 20,
      unitCostPrice: 19.0,
      batchMrp: 35.0,
    },
    'user-1',
  );

  // Preview FEFO allocation for 15 units:
  // Must take all 10 from batchEarly and 5 from batchLate
  const preview = await fefoService.previewFefo(medicine.id, 15);
  assert.equal(preview.shortfallUnits, 0);
  assert.equal(preview.allocations.length, 2);
  assert.equal(preview.allocations[0].batchId, batchEarly.id);
  assert.equal(preview.allocations[0].allocatedUnits, 10);
  assert.equal(preview.allocations[1].batchId, batchLate.id);
  assert.equal(preview.allocations[1].allocatedUnits, 5);

  // Execute FEFO allocation via transaction
  await AppDataSource.transaction(async (manager) => {
    const allocations = await fefoService.allocateFefo(manager, medicine.id, 15);
    for (const alloc of allocations) {
      await movementService.recordMovement(
        {
          batchId: alloc.batchId,
          movementType: MovementType.SALE,
          quantityBaseUnits: -alloc.allocatedUnits,
          userId: 'pos-terminal-1',
        },
        manager,
      );
    }
  });

  // Verify batchEarly is now DEPLETED
  const reloadedEarly = await batchService.getBatchById(batchEarly.id);
  assert.equal(reloadedEarly.quantityBaseUnits, 0);
  assert.equal(reloadedEarly.status, BatchStatus.DEPLETED);

  // Verify batchLate has 15 remaining
  const reloadedLate = await batchService.getBatchById(batchLate.id);
  assert.equal(reloadedLate.quantityBaseUnits, 15);
  assert.equal(reloadedLate.status, BatchStatus.ACTIVE);
});

test('Exit Criteria 3: Quarantine Enforcement completely skips recalled stock during FEFO', async () => {
  const medicine = await createTestMedicine(`Quarantine Med ${Date.now()}`);
  const now = Date.now();

  const batchToQuarantine = await batchService.createBatch(
    {
      medicineId: medicine.id,
      batchNumber: `QUARANTINE-TARGET-${now}`,
      mfdDate: '2026-01-01',
      expiryDate: '2026-11-01', // Earlier expiry than others
      quantityBaseUnits: 50,
      unitCostPrice: 15.0,
      batchMrp: 30.0,
    },
    'user-1',
  );

  // Trigger recall and quarantine
  const recallReport = await recallService.recallBatch(
    {
      batchId: batchToQuarantine.id,
      reason: 'NMRA Quality Defect Notification: Suspected dissolution failure',
    },
    'pharmacist-lead',
  );

  assert.equal(recallReport.batch.status, BatchStatus.QUARANTINED);

  // Verify previewFefo completely ignores the quarantined batch even though it has the earliest expiry
  const preview = await fefoService.previewFefo(medicine.id, 10);
  const foundQuarantined = preview.allocations.some((a) => a.batchId === batchToQuarantine.id);
  assert.equal(foundQuarantined, false, 'Quarantined batch must NOT be allocated by FEFO');
  assert.equal(preview.shortfallUnits, 10, 'All 10 units should be shortfall because active batch is quarantined');
});

test('Stock Adjustment Rule: Threshold exceeding Rs. 25,000 requires Manager sign-off', async () => {
  const medicine = await createTestMedicine(`Adjustment Med ${Date.now()}`);

  const batch = await batchService.createBatch(
    {
      medicineId: medicine.id,
      batchNumber: `VAL-TEST-${Date.now()}`,
      mfdDate: '2026-01-01',
      expiryDate: '2027-01-01',
      quantityBaseUnits: 2000,
      unitCostPrice: 30.0, // 1000 units * Rs. 30 = Rs. 30,000 (> Rs. 25,000 threshold)
      batchMrp: 45.0,
    },
    'user-1',
  );

  // Attempt without manager approval as normal PHARMACIST -> should throw ForbiddenException
  await assert.rejects(
    async () => {
      await adjustmentService.processAdjustment(
        {
          batchId: batch.id,
          adjustmentType: 'REDUCE',
          quantityBaseUnits: 1000,
          reason: 'Water leak damaged carton',
        },
        'clerk-1',
        'PHARMACIST',
      );
    },
    (err: any) => {
      assert.match(err.message, /Manager approval required/);
      return true;
    },
  );

  // With manager approval string -> succeeds
  const approved = await adjustmentService.processAdjustment(
    {
      batchId: batch.id,
      adjustmentType: 'REDUCE',
      quantityBaseUnits: 1000,
      reason: 'Water leak damaged carton',
      managerApprovedBy: 'manager-dr-perera',
    },
    'clerk-1',
    'PHARMACIST',
  );

  assert.equal(approved.batch.quantityBaseUnits, 1000);
});

test('Physical Audit Session: Variance calculation and signed AUDIT_CORRECTION ledger reconciliation', async () => {
  const medicine = await createTestMedicine(`Audit Med ${Date.now()}`);

  const batch = await batchService.createBatch(
    {
      medicineId: medicine.id,
      batchNumber: `AUDIT-BATCH-${Date.now()}`,
      mfdDate: '2026-01-01',
      expiryDate: '2027-01-01',
      quantityBaseUnits: 100,
      unitCostPrice: 15.0,
      batchMrp: 25.0,
    },
    'user-1',
  );

  // 1. Start audit session
  const session = await auditService.startSession(
    { notes: 'Q4 Annual Stocktake dispensary shelf A' },
    'auditor-kamal',
  );

  // 2. Count 95 units (variance: -5 units, variance cost: -75 LKR)
  const updatedSession = await auditService.recordCount(
    session.id,
    {
      batchId: batch.id,
      countedQuantityBaseUnits: 95,
      notes: '5 tablets short due to partial blister pill wastage',
    },
    'auditor-kamal',
  );

  assert.equal(updatedSession.totalVarianceCostLkr, -75);

  // 3. Manager approves session
  const approvedSession = await auditService.approveSession(session.id, {
    approvedBy: 'chief-pharmacist-01',
    decision: 'APPROVED',
  });

  assert.equal(approvedSession.status, AuditStatus.APPROVED);

  // 4. Verify batch quantity is now exactly 95
  const reconciledBatch = await batchService.getBatchById(batch.id);
  assert.equal(reconciledBatch.quantityBaseUnits, 95);

  // 5. Verify ledger invariant holds: opening 100 - audit correction 5 = 95
  const invariant = await movementService.verifyBatchLedgerInvariant(batch.id);
  assert.equal(invariant.batchQuantity, 95);
  assert.equal(invariant.ledgerSum, 95);
  assert.equal(invariant.isValid, true);
});
