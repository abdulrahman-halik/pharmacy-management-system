import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import AppDataSource from '../../database/data-source';
import { Supplier } from './entities/supplier.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { GoodsReceivedNote } from './entities/goods-received-note.entity';
import { GoodsReceivedNoteItem } from './entities/goods-received-note-item.entity';
import { PurchaseReturn } from './entities/purchase-return.entity';
import { PurchaseReturnItem } from './entities/purchase-return-item.entity';
import { SupplierPayment } from './entities/supplier-payment.entity';
import { Medicine } from '../medicines/entities/medicine.entity';
import { MedicinePackaging } from '../medicines/entities/medicine-packaging.entity';
import { InventoryBatch } from '../inventory/entities/inventory-batch.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { SupplierService } from './services/supplier.service';
import { SupplierPaymentService } from './services/supplier-payment.service';
import { PurchaseOrderService } from './services/purchase-order.service';
import { GrnIntakeService } from './services/grn-intake.service';
import { PurchaseReturnService } from './services/purchase-return.service';
import { ProcurementSequenceService } from './services/sequence.service';
import { BadRequestException, ConflictException } from '@nestjs/common';

let supplierService: SupplierService;
let paymentService: SupplierPaymentService;
let poService: PurchaseOrderService;
let grnService: GrnIntakeService;
let returnService: PurchaseReturnService;
let sequenceService: ProcurementSequenceService;

let supplierRepo: any;
let medicineRepo: any;
let packagingRepo: any;
let batchRepo: any;
let movementRepo: any;
let grnRepo: any;
let poRepo: any;

let testMedicine: Medicine;
let testSupplier: Supplier;

before(async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  supplierRepo = AppDataSource.getRepository(Supplier);
  medicineRepo = AppDataSource.getRepository(Medicine);
  packagingRepo = AppDataSource.getRepository(MedicinePackaging);
  batchRepo = AppDataSource.getRepository(InventoryBatch);
  movementRepo = AppDataSource.getRepository(StockMovement);
  grnRepo = AppDataSource.getRepository(GoodsReceivedNote);
  poRepo = AppDataSource.getRepository(PurchaseOrder);

  sequenceService = new ProcurementSequenceService();
  supplierService = new SupplierService(
    supplierRepo,
    grnRepo,
    AppDataSource.getRepository(SupplierPayment),
    AppDataSource.getRepository(PurchaseReturn),
  );
  paymentService = new SupplierPaymentService(AppDataSource, sequenceService);
  poService = new PurchaseOrderService(
    poRepo,
    AppDataSource.getRepository(PurchaseOrderItem),
    supplierRepo,
    medicineRepo,
    batchRepo,
    AppDataSource,
    sequenceService,
  );
  grnService = new GrnIntakeService(
    grnRepo,
    AppDataSource.getRepository(GoodsReceivedNoteItem),
    supplierRepo,
    poRepo,
    medicineRepo,
    batchRepo,
    movementRepo,
    AppDataSource,
    sequenceService,
  );
  returnService = new PurchaseReturnService(AppDataSource, sequenceService);

  // Setup sample test medicine with 100 units per box
  testMedicine = medicineRepo.create({
    name: 'Amoxicillin Trihydrate 500mg Phase 7',
    genericName: 'Amoxicillin',
    brandManufacturer: 'State Pharmaceuticals Manufacturing Corporation',
    strength: '500mg',
    dosageForm: 'CAPSULE',
    barcode: `779900${Date.now()}`,
    vatPercentage: 0,
    isVatExempt: true,
    reorderLevel: 50,
    scheduleClass: 'PRESCRIPTION_ONLY',
    storageCondition: 'ROOM_TEMPERATURE',
    requiresPrescription: true,
    isControlledSubstance: false,
    mrp: 25.0,
    createdBy: 'test-runner',
  });
  testMedicine = await medicineRepo.save(testMedicine);

  const packaging = packagingRepo.create({
    medicineId: testMedicine.id,
    baseUnitName: 'Capsule',
    unitsPerPacket: 10,
    packetsPerBox: 10, // 10 * 10 = 100 units per Box
    boxesPerCarton: 10, // 1000 units per Carton
    createdBy: 'test-runner',
  });
  await packagingRepo.save(packaging);

  // Setup test supplier
  testSupplier = supplierRepo.create({
    companyName: `SPC Distributors LK ${Date.now()}`,
    contactPerson: 'Kamal Perera',
    phone: '+94112695555',
    email: 'orders@spc.lk',
    taxTinNumber: 'TIN-SPC-001',
    paymentTermsDays: 30,
    outstandingPayableLkr: 0.0,
    isActive: true,
    createdBy: 'test-runner',
  });
  testSupplier = await supplierRepo.save(testSupplier);
});

test('Verification 1: Landed Net Cost with Bonus Stock Absorption', async () => {
  // Scenario:
  // - Purchase 10 Boxes of 100 tablets @ Rs. 2,000 per Box = Rs. 20,000.
  // - Bonus: 2 Free Boxes = 200 free tablets.
  // - Total Base Units = (10 + 2) * 100 = 1,200 tablets.
  // - Net Landed Cost = Rs. 20,000 / 1,200 = Rs. 16.6667 per tablet.

  const grn = await grnService.processGrn(
    {
      supplierId: testSupplier.id,
      supplierInvoiceNumber: `INV-BONUS-${Date.now()}`,
      receivedDate: '2026-10-24',
      taxVatLkr: 0,
      items: [
        {
          medicineId: testMedicine.id,
          batchNumber: `BATCH-BONUS-${Date.now()}`,
          mfdDate: '2026-01-01',
          expiryDate: '2028-12-31',
          packagingLevel: 'BOX',
          purchasedQuantity: 10,
          bonusQuantity: 2,
          purchasePriceLkr: 2000,
          batchMrpPerBaseUnit: 25.0,
        },
      ],
    },
    'pharmacist-user',
  );

  assert.equal(grn.items.length, 1);
  const item = grn.items[0];
  assert.equal(item.totalReceivedBaseUnits, 1200);
  assert.equal(item.lineTotalLkr, 20000);
  assert.equal(item.netLandedCostPerBaseUnit, 16.6667);
  assert.equal(grn.grandTotalLkr, 20000);

  // Verify batch created in inventory_batches
  const batch = await batchRepo.findOne({
    where: { medicineId: testMedicine.id, batchNumber: item.batchNumber },
  });
  assert.ok(batch);
  assert.equal(batch.quantityBaseUnits, 1200);
  assert.equal(Number(batch.unitCostPrice), 16.6667);
  assert.equal(batch.status, 'ACTIVE');

  // Verify immutable PURCHASE movement written
  const movement = await movementRepo.findOne({
    where: { batchId: batch.id, movementType: 'PURCHASE' },
  });
  assert.ok(movement);
  assert.equal(movement.quantityBaseUnits, 1200);
  assert.equal(Number(movement.unitCostPrice), 16.6667);
  assert.equal(movement.referenceType, 'GRN');
  assert.equal(movement.referenceId, grn.grnNumber);
});

test('Verification 2: Duplicate Invoice Prevention Gate (409 Conflict)', async () => {
  const invNumber = `INV-DUP-${Date.now()}`;

  // First intake succeeds
  await grnService.processGrn(
    {
      supplierId: testSupplier.id,
      supplierInvoiceNumber: invNumber,
      receivedDate: '2026-10-24',
      items: [
        {
          medicineId: testMedicine.id,
          batchNumber: `BATCH-D1-${Date.now()}`,
          expiryDate: '2028-10-24',
          packagingLevel: 'UNIT',
          purchasedQuantity: 100,
          bonusQuantity: 0,
          purchasePriceLkr: 15,
          batchMrpPerBaseUnit: 25,
        },
      ],
    },
    'cashier-01',
  );

  // Attempting second intake with same supplier and same invoice number must fail
  await assert.rejects(
    async () => {
      await grnService.processGrn(
        {
          supplierId: testSupplier.id,
          supplierInvoiceNumber: invNumber,
          receivedDate: '2026-10-24',
          items: [
            {
              medicineId: testMedicine.id,
              batchNumber: `BATCH-D2-${Date.now()}`,
              expiryDate: '2028-10-24',
              packagingLevel: 'UNIT',
              purchasedQuantity: 50,
              bonusQuantity: 0,
              purchasePriceLkr: 15,
              batchMrpPerBaseUnit: 25,
            },
          ],
        },
        'cashier-01',
      );
    },
    (err: any) => {
      assert.ok(err instanceof ConflictException);
      assert.match(err.message, /already registered/);
      return true;
    },
  );
});

test('Verification 3: Expired Goods Intake Gate (400 Bad Request)', async () => {
  await assert.rejects(
    async () => {
      await grnService.processGrn(
        {
          supplierId: testSupplier.id,
          supplierInvoiceNumber: `INV-EXP-${Date.now()}`,
          receivedDate: '2026-10-24',
          items: [
            {
              medicineId: testMedicine.id,
              batchNumber: `BATCH-EXPIRED-${Date.now()}`,
              expiryDate: '2026-10-20', // Expired 4 days ago
              packagingLevel: 'BOX',
              purchasedQuantity: 5,
              bonusQuantity: 0,
              purchasePriceLkr: 1000,
              batchMrpPerBaseUnit: 25,
            },
          ],
        },
        'pharmacist-user',
      );
    },
    (err: any) => {
      assert.ok(err instanceof BadRequestException);
      assert.match(err.message, /Cannot receive expired pharmaceuticals/);
      return true;
    },
  );
});

test('Verification 4: Moving Average Cost (MAC) Re-weighting on Existing Batch', async () => {
  const batchNum = `BATCH-MAC-${Date.now()}`;
  const expiryDate = '2029-05-15';

  // Intake 1: 100 base units @ Rs. 10.00
  await grnService.processGrn(
    {
      supplierId: testSupplier.id,
      supplierInvoiceNumber: `INV-MAC-1-${Date.now()}`,
      receivedDate: '2026-10-24',
      items: [
        {
          medicineId: testMedicine.id,
          batchNumber: batchNum,
          expiryDate,
          packagingLevel: 'UNIT',
          purchasedQuantity: 100,
          bonusQuantity: 0,
          purchasePriceLkr: 10.0,
          batchMrpPerBaseUnit: 25.0,
        },
      ],
    },
    'user-1',
  );

  let batch = await batchRepo.findOne({
    where: { medicineId: testMedicine.id, batchNumber: batchNum },
  });
  assert.equal(batch.quantityBaseUnits, 100);
  assert.equal(Number(batch.unitCostPrice), 10.0);

  // Intake 2: 100 base units @ Rs. 20.00 for the SAME batch
  // MAC = (100 * 10 + 100 * 20) / 200 = 3000 / 200 = Rs. 15.0000
  await grnService.processGrn(
    {
      supplierId: testSupplier.id,
      supplierInvoiceNumber: `INV-MAC-2-${Date.now()}`,
      receivedDate: '2026-10-24',
      items: [
        {
          medicineId: testMedicine.id,
          batchNumber: batchNum,
          expiryDate,
          packagingLevel: 'UNIT',
          purchasedQuantity: 100,
          bonusQuantity: 0,
          purchasePriceLkr: 20.0,
          batchMrpPerBaseUnit: 25.0,
        },
      ],
    },
    'user-1',
  );

  batch = await batchRepo.findOne({
    where: { medicineId: testMedicine.id, batchNumber: batchNum },
  });
  assert.equal(batch.quantityBaseUnits, 200);
  assert.equal(Number(batch.unitCostPrice), 15.0);
});

test('Verification 5: Supplier Ledger Statement and Payment Allocation', async () => {
  // Create unique supplier
  const supplier = await supplierService.createSupplier(
    {
      companyName: `Darley Butler ${Date.now()}`,
      phone: '0112445566',
      taxTinNumber: 'TIN-DB-99',
      paymentTermsDays: 30,
    },
    'admin-user',
  );

  // Intake GRN of Rs. 30,000
  const grn = await grnService.processGrn(
    {
      supplierId: supplier.id,
      supplierInvoiceNumber: `INV-STMT-${Date.now()}`,
      receivedDate: '2026-10-24',
      items: [
        {
          medicineId: testMedicine.id,
          batchNumber: `BATCH-STMT-${Date.now()}`,
          expiryDate: '2028-12-31',
          packagingLevel: 'BOX', // 100 units
          purchasedQuantity: 15,
          bonusQuantity: 0,
          purchasePriceLkr: 2000, // 15 * 2000 = Rs. 30,000
          batchMrpPerBaseUnit: 25.0,
        },
      ],
    },
    'user-1',
  );

  let updatedSupplier = await supplierRepo.findOne({ where: { id: supplier.id } });
  assert.equal(Number(updatedSupplier.outstandingPayableLkr), 30000);

  // Pay partial Rs. 20,000 allocated to GRN
  const payment = await paymentService.recordPayment(
    supplier.id,
    {
      amountLkr: 20000,
      paymentMethod: 'BANK_TRANSFER',
      reference: 'TXN-COMBANK-001',
      grnAllocations: [{ grnId: grn.id, amount: 20000 }],
    },
    'finance-user',
  );

  assert.equal(payment.amountLkr, 20000);

  // Check GRN is PARTIALLY_PAID
  const updatedGrn = await grnRepo.findOne({ where: { id: grn.id } });
  assert.equal(Number(updatedGrn.paidAmountLkr), 20000);
  assert.equal(updatedGrn.paymentStatus, 'PARTIALLY_PAID');

  // Supplier balance should now be 30,000 - 20,000 = 10,000
  updatedSupplier = await supplierRepo.findOne({ where: { id: supplier.id } });
  assert.equal(Number(updatedSupplier.outstandingPayableLkr), 10000);

  // Check statement reconciliation
  const statement = await supplierService.getStatement(supplier.id);
  assert.equal(statement.totalInvoicedLkr, 30000);
  assert.equal(statement.totalPaidLkr, 20000);
  assert.equal(statement.closingBalanceLkr, 10000);
  assert.equal(statement.entries.length, 2);
});

test('Verification 6: Purchase Return Workflow with Stock & Ledger Debits', async () => {
  const batchNum = `BATCH-RET-${Date.now()}`;
  const expiryDate = '2028-09-01';

  // 1. Intake 100 units @ Rs. 15.00 = Rs. 1,500
  const grn = await grnService.processGrn(
    {
      supplierId: testSupplier.id,
      supplierInvoiceNumber: `INV-RET-${Date.now()}`,
      receivedDate: '2026-10-24',
      items: [
        {
          medicineId: testMedicine.id,
          batchNumber: batchNum,
          expiryDate,
          packagingLevel: 'UNIT',
          purchasedQuantity: 100,
          bonusQuantity: 0,
          purchasePriceLkr: 15.0,
          batchMrpPerBaseUnit: 25.0,
        },
      ],
    },
    'user-1',
  );

  const initialSupplier = await supplierRepo.findOne({ where: { id: testSupplier.id } });
  const initialPayable = Number(initialSupplier.outstandingPayableLkr);

  const batch = await batchRepo.findOne({
    where: { medicineId: testMedicine.id, batchNumber: batchNum },
  });
  assert.equal(batch.quantityBaseUnits, 100);

  // 2. Return 40 units for damage (40 * 15 = Rs. 600 refund)
  const returnResult = await returnService.processReturn(
    {
      supplierId: testSupplier.id,
      reason: 'DAMAGED',
      items: [
        {
          batchId: batch.id,
          quantityBaseUnits: 40,
          reason: 'Crushed packaging in transport',
        },
      ],
    },
    'pharmacist-user',
  );

  assert.equal(returnResult.totalRefundLkr, 600);

  // Verify stock decremented to 60 units
  const updatedBatch = await batchRepo.findOne({ where: { id: batch.id } });
  assert.equal(updatedBatch.quantityBaseUnits, 60);

  // Verify stock movement logged
  const retMovement = await movementRepo.findOne({
    where: { batchId: batch.id, movementType: 'PURCHASE_RETURN' },
  });
  assert.ok(retMovement);
  assert.equal(retMovement.quantityBaseUnits, 40);
  assert.equal(retMovement.balanceAfter, 60);

  // Verify supplier payable debited by Rs. 600
  const updatedSupplier = await supplierRepo.findOne({ where: { id: testSupplier.id } });
  assert.equal(Number(updatedSupplier.outstandingPayableLkr), initialPayable - 600);
});

test('Verification 7: Purchase Order Creation, Status & Fulfillment', async () => {
  // Create PO for 5 Boxes
  const po = await poService.createPurchaseOrder(
    {
      supplierId: testSupplier.id,
      orderDate: '2026-10-24',
      expectedDeliveryDate: '2026-10-31',
      items: [
        {
          medicineId: testMedicine.id,
          packagingLevel: 'BOX',
          quantity: 5,
          unitCostLkr: 1800,
        },
      ],
    },
    'po-manager',
  );

  assert.equal(po.status, 'DRAFT');
  assert.equal(po.totalAmountLkr, 9000);
  assert.ok(po.poNumber.startsWith('PO-'));

  // Update status to ORDERED
  const orderedPo = await poService.updateStatus(po.id, 'ORDERED', 'po-manager');
  assert.equal(orderedPo.status, 'ORDERED');

  // Intake 3 Boxes against PO -> PARTIALLY_RECEIVED
  await grnService.processGrn(
    {
      supplierId: testSupplier.id,
      purchaseOrderId: po.id,
      supplierInvoiceNumber: `INV-PARTIAL-${Date.now()}`,
      receivedDate: '2026-10-24',
      items: [
        {
          medicineId: testMedicine.id,
          batchNumber: `BATCH-P1-${Date.now()}`,
          expiryDate: '2028-11-01',
          packagingLevel: 'BOX',
          purchasedQuantity: 3,
          bonusQuantity: 0,
          purchasePriceLkr: 1800,
          batchMrpPerBaseUnit: 25.0,
        },
      ],
    },
    'receiver-user',
  );

  let currentPo = await poService.getPurchaseOrderById(po.id);
  assert.equal(currentPo.status, 'PARTIALLY_RECEIVED');
  assert.equal(currentPo.items[0].receivedQuantity, 3);

  // Intake remaining 2 Boxes against PO -> RECEIVED
  await grnService.processGrn(
    {
      supplierId: testSupplier.id,
      purchaseOrderId: po.id,
      supplierInvoiceNumber: `INV-FULL-${Date.now()}`,
      receivedDate: '2026-10-24',
      items: [
        {
          medicineId: testMedicine.id,
          batchNumber: `BATCH-P2-${Date.now()}`,
          expiryDate: '2028-11-01',
          packagingLevel: 'BOX',
          purchasedQuantity: 2,
          bonusQuantity: 0,
          purchasePriceLkr: 1800,
          batchMrpPerBaseUnit: 25.0,
        },
      ],
    },
    'receiver-user',
  );

  currentPo = await poService.getPurchaseOrderById(po.id);
  assert.equal(currentPo.status, 'RECEIVED');
  assert.equal(currentPo.items[0].receivedQuantity, 5);
});
